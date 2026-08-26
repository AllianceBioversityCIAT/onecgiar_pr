import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { BilateralVersioningRulesService } from '../versioning-rules/bilateral-versioning-rules.service';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { Result } from '../../results/entities/result.entity';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ClarisaApiKeyValidationMis } from '../interfaces/clarisa-api-key-validation.interface';
import { VersionResultDto } from '../dto/version-result.dto';
import { centerCodesForPlatform } from '../constants/platform-center-scope.constants';

/**
 * Carries an approved W3/Bilateral result from a previous phase into the current one, on
 * behalf of the reporting platform that asks for it (P2-3228).
 *
 * The replication itself is not ours: `VersioningService` already copies a result plus its
 * ~20 association tables inside one transaction, and has done so for the reporting tool for
 * phases. This service is the **gate** — it decides whether this caller may continue this
 * result — plus the two adjustments the bilateral flow needs afterwards.
 *
 * Two things worth knowing before reading on:
 *
 * - **V2, not V1.** `versionProcess` (V1) refuses any result whose primary submitter belongs
 *   to the P25 portfolio, and every 2026 bilateral maps to a Science Program, which is P25.
 *   So the route is `versionProcessV2`, whose `entity_id` we derive from the result's own
 *   role-1 initiative — the caller sends a result code and nothing else. V2 recognises that
 *   case (`isP25SelfEntity`) and skips the initiative/entity map check.
 * - **The copy lands in Draft**, not Pending review. This operation continues a result; it
 *   does not report on it. Whoever edits it afterwards — through the API later, or in the
 *   reporting tool — is who submits it for review.
 */
@Injectable()
export class BilateralVersioningService {
  private readonly logger = new Logger(BilateralVersioningService.name);

  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _rules: BilateralVersioningRulesService,
    private readonly _versioningService: VersioningService,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _userRepository: UserRepository,
  ) {}

  async versionResult(
    dto: VersionResultDto,
    platform?: ClarisaApiKeyValidationMis,
  ) {
    const resultCode = String(dto.result_code ?? '').trim();
    if (!resultCode) {
      throw new BadRequestException('result_code is required.');
    }

    const activePhase = await this._rules.getActiveReportingPhase();

    // Existence, phase, already-carried-forward, bilateral, not a KP, approved — the rules
    // shared with the reporting tool's own versioning path so both refuse the same things.
    const source = await this._rules.resolveVersionableResult(
      resultCode,
      activePhase.id,
    );

    // The one check that is ours alone: on the API side the caller is a platform, not a user.
    await this.assertCallerMayVersion(source, resultCode, platform);

    const entityId = await this._rules.resolveTargetEntityId(
      source,
      resultCode,
    );
    const user = await this.getSystemUserToken();

    this.logger.log(
      `Versioning result_code=${resultCode} (id=${source.id}, phase=${source.version_id}) into phase ${activePhase.id} for entity ${entityId}`,
    );

    await this._versioningService.versionProcessV2(source.id, entityId, user);

    const created = await this._rules.findInPhase(resultCode, activePhase.id);
    if (!created) {
      // versionProcessV2 reports its own failures by throwing; reaching here means it
      // returned without leaving a row, which we must not report as a success.
      throw new ConflictException(
        `Result ${resultCode} was not carried into phase ${activePhase.id}. Nothing was created.`,
      );
    }

    await this._resultRepository.update(
      { id: created.id },
      { status_id: ResultStatusData.Draft.value, last_updated_by: user.id },
    );

    return {
      result_code: resultCode,
      external_reference: dto.external_reference ?? null,
      previous: { result_id: source.id, phase_id: source.version_id },
      current: {
        result_id: created.id,
        phase_id: activePhase.id,
        phase_name: activePhase.phase_name ?? null,
        status: ResultStatusData.Draft.name,
        status_id: ResultStatusData.Draft.value,
      },
    };
  }

  /**
   * Ownership, in two steps.
   *
   * The exact check is `external_platform_id === mis.id`: the platform that created the
   * result is the one asking for it. When the result carries no originating platform — a
   * centre authored it in the reporting tool — the only thing linking the request to the
   * data is the centre, so the lead centre is matched against the platform's declared
   * scope. See `platform-center-scope.constants.ts` for why that map exists and how it
   * drifts.
   */
  private async assertCallerMayVersion(
    source: Result,
    resultCode: string,
    platform?: ClarisaApiKeyValidationMis,
  ) {
    if (!platform?.id) {
      throw new ForbiddenException(
        'The calling platform could not be identified from the API key.',
      );
    }

    const originatingPlatformId = Number(source.external_platform_id);
    if (Number.isFinite(originatingPlatformId) && originatingPlatformId > 0) {
      if (originatingPlatformId !== Number(platform.id)) {
        throw new ForbiddenException(
          `Result ${resultCode} was reported by a different platform. Only the platform that reported a result can carry it forward.`,
        );
      }
      return;
    }

    const allowedCenters = centerCodesForPlatform(platform.acronym);
    if (!allowedCenters.length) {
      throw new ForbiddenException(
        `Result ${resultCode} has no originating platform, and ${platform.acronym ?? platform.id} has no centre scope configured to claim it.`,
      );
    }

    const centers =
      await this._resultsCenterRepository.getAllResultsCenterByResultId(
        source.id,
      );
    // The repository aliases `results_center.center_id` as `code` — the CLARISA centre code,
    // which is what the platform scope map is keyed by.
    const leadCenterCode = (centers ?? []).find(
      (center: any) => Number(center?.is_leading_result) === 1,
    )?.code;

    if (!leadCenterCode) {
      throw new ForbiddenException(
        `Result ${resultCode} has neither an originating platform nor a lead centre, so ownership cannot be established.`,
      );
    }

    if (!allowedCenters.includes(String(leadCenterCode))) {
      throw new ForbiddenException(
        `Result ${resultCode} belongs to centre ${leadCenterCode}, which is outside the scope of ${platform.acronym ?? platform.id}.`,
      );
    }
  }

  /** Same fallback identity `create` uses: the API has no JWT session to draw a user from. */
  private async getSystemUserToken(): Promise<TokenDto> {
    const adminUser = await this._userRepository.findOne({
      where: { email: 'admin@prms.pr' },
    });

    return {
      id: adminUser?.id ?? 1,
      email: adminUser?.email ?? 'admin@prms.pr',
      first_name: adminUser?.first_name ?? 'Admin',
      last_name: adminUser?.last_name ?? 'PRMS',
    } as TokenDto;
  }
}
