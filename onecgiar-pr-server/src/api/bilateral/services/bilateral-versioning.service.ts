import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { VersionRepository } from '../../versioning/versioning.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { Result, SourceEnum } from '../../results/entities/result.entity';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
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
    private readonly _versionRepository: VersionRepository,
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

    const activePhase = await this.getActiveReportingPhase();

    // A result is carried forward once. If a version already sits in the open phase there is
    // nothing to decide, and replicating again would put a rival row in the same phase.
    const existing = await this.findInPhase(resultCode, activePhase.id);
    if (existing) {
      throw new ConflictException(
        `Result ${resultCode} already has a version in the current phase (result id ${existing.id}). It cannot be carried forward twice.`,
      );
    }

    const source = await this.findVersionableResult(resultCode, activePhase.id);

    this.assertIsBilateral(source, resultCode);
    this.assertNotKnowledgeProduct(source, resultCode);
    this.assertApproved(source, resultCode);
    await this.assertCallerMayVersion(source, resultCode, platform);

    const entityId = await this.resolveTargetEntityId(source, resultCode);
    const user = await this.getSystemUserToken();

    this.logger.log(
      `Versioning result_code=${resultCode} (id=${source.id}, phase=${source.version_id}) into phase ${activePhase.id} for entity ${entityId}`,
    );

    await this._versioningService.versionProcessV2(source.id, entityId, user);

    const created = await this.findInPhase(resultCode, activePhase.id);
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
   * The one open reporting phase. There is never more than one: the uniqueness is a data
   * rule, not something this code enforces, so `findOne` reflecting it is deliberate.
   */
  private async getActiveReportingPhase() {
    const phase = await this._versionRepository.findOne({
      where: {
        app_module_id: AppModuleIdEnum.REPORTING,
        is_active: true,
        status: true,
      },
    });

    if (!phase) {
      throw new ConflictException(
        'There is no open reporting phase, so no result can be carried forward right now.',
      );
    }

    return phase;
  }

  /** The most recent active version of this code that is NOT in the current phase. */
  private async findVersionableResult(
    resultCode: string,
    activePhaseId: number,
  ): Promise<Result> {
    const candidates = await this._resultRepository.find({
      where: { result_code: resultCode as any, is_active: true },
      order: { version_id: 'DESC' },
    });

    if (!candidates.length) {
      throw new NotFoundException(
        `No active result found for result_code ${resultCode}.`,
      );
    }

    const previous = candidates.find(
      (candidate) => Number(candidate.version_id) !== Number(activePhaseId),
    );

    if (!previous) {
      throw new ConflictException(
        `Result ${resultCode} only exists in the current phase, so there is nothing to carry forward.`,
      );
    }

    return previous;
  }

  private async findInPhase(resultCode: string, phaseId: number) {
    const rows = await this._resultRepository.find({
      where: { result_code: resultCode as any, is_active: true },
    });
    return rows.find((row) => Number(row.version_id) === Number(phaseId));
  }

  private assertIsBilateral(source: Result, resultCode: string) {
    if (source.source !== SourceEnum.Bilateral) {
      throw new BadRequestException(
        `Result ${resultCode} is not a W3/Bilateral result, so it cannot be carried forward through this endpoint.`,
      );
    }
  }

  /**
   * Knowledge Products are excluded, and this is not an oversight to be lifted for the API:
   * `VersioningService` refuses them for every caller because their metadata is owned by
   * CGSpace, not by PRMS. Rejecting here gives a message that names the result rather than
   * letting the caller hit the generic conflict deeper in.
   */
  private assertNotKnowledgeProduct(source: Result, resultCode: string) {
    if (Number(source.result_type_id) === ResultTypeEnum.KNOWLEDGE_PRODUCT) {
      throw new ConflictException(
        `Result ${resultCode} is a Knowledge Product. Knowledge Products cannot be carried into a new phase; report the new knowledge product with its own CGSpace handle instead.`,
      );
    }
  }

  /**
   * Only for `source = API`. A result reported inside the tool follows the reporting tool's
   * own rules for what may be carried forward, and those are not ours to restate here.
   */
  private assertApproved(source: Result, resultCode: string) {
    if (Number(source.status_id) !== ResultStatusData.Approved.value) {
      throw new ConflictException(
        `Result ${resultCode} is not approved (status_id ${source.status_id}). Only an approved result from a previous phase can be carried forward.`,
      );
    }
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

  /**
   * The programme the result moves into: its own role-1 initiative. Deriving it is what lets
   * the caller send a result code and nothing else — and it is the case `versionProcessV2`
   * treats as `isP25SelfEntity`, skipping the initiative/entity map lookup.
   */
  private async resolveTargetEntityId(
    source: Result,
    resultCode: string,
  ): Promise<number> {
    const withInitiatives = await this._resultRepository.findOne({
      where: { id: source.id },
      relations: { obj_result_by_initiatives: true },
    });

    const main = withInitiatives?.obj_result_by_initiatives?.find(
      (rbi: any) => Number(rbi.initiative_role_id) === 1 && rbi.is_active,
    );

    if (!main?.initiative_id) {
      throw new ConflictException(
        `Result ${resultCode} has no primary Science Program (role 1), which is required to carry it into a new phase.`,
      );
    }

    return Number(main.initiative_id);
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
