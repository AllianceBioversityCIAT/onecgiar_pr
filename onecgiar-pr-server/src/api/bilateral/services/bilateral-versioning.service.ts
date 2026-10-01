import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BilateralVersioningRulesService } from '../versioning-rules/bilateral-versioning-rules.service';
import { VersioningService } from '../../versioning/versioning.service';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ClarisaApiKeyValidationMis } from '../interfaces/clarisa-api-key-validation.interface';
import { VersionResultDto } from '../dto/version-result.dto';

/**
 * Carries an approved W3/Bilateral result from a previous phase into the current one, on
 * behalf of the reporting platform that asks for it (P2-3228).
 *
 * The replication itself is not ours: `VersioningService` already copies a result plus its
 * ~20 association tables inside one transaction, and has done so for the reporting tool for
 * phases. This service is the **gate** — it decides whether this caller may continue this
 * result — plus the response that identifies the created version.
 *
 * Two things worth knowing before reading on:
 *
 * - **V2, not V1.** `versionProcess` (V1) refuses any result whose primary submitter belongs
 *   to the P25 portfolio, and every 2026 bilateral maps to a Science Program, which is P25.
 *   So the route is `versionProcessV2`, whose `entity_id` we derive from the result's own
 *   role-1 initiative — the caller sends a result code and nothing else. V2 recognises that
 *   case (`isP25SelfEntity`) and skips the initiative/entity map check.
 * - **The copy lands in Editing**, as `versionProcessV2` creates it. A centre user completes
 *   the result and explicitly submits it for review afterwards.
 */
@Injectable()
export class BilateralVersioningService {
  private readonly logger = new Logger(BilateralVersioningService.name);

  constructor(
    private readonly _rules: BilateralVersioningRulesService,
    private readonly _versioningService: VersioningService,
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
    // @akili-spec changes/bilateral-create-upsert-by-code — UBC-DD-6: the rule itself now lives
    // in `rules`, shared with `create`'s resolve step; this call is the only thing that changed.
    await this._rules.assertCallerMayVersion(source, resultCode, platform);

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

    return {
      result_code: resultCode,
      external_reference: dto.external_reference ?? null,
      previous: { result_id: source.id, phase_id: source.version_id },
      current: {
        result_id: created.id,
        phase_id: activePhase.id,
        phase_name: activePhase.phase_name ?? null,
        status: ResultStatusData.Editing.name,
        status_id: ResultStatusData.Editing.value,
      },
    };
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
