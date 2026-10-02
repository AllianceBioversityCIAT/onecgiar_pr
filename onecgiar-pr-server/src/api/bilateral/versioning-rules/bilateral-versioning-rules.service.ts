import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { VersionRepository } from '../../versioning/versioning.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { Result, SourceEnum } from '../../results/entities/result.entity';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { ClarisaApiKeyValidationMis } from '../interfaces/clarisa-api-key-validation.interface';
import { centerCodesForPlatform } from '../constants/platform-center-scope.constants';

/**
 * When a W3/Bilateral result may be carried into the open reporting phase, and which one.
 *
 * These rules are the same whether the request arrives through the API (P2-3228) or from a
 * centre user in the reporting tool (P2-3229) — the story's AC9 requires the two paths to
 * produce the same thing. They live here, in a **leaf** service, precisely so that neither
 * caller owns them: `BilateralModule` imports `VersioningModule`, so putting the rules in
 * either one and reaching for them from the other closes a dependency cycle. That is the
 * same shape P2-3188 papered over with `forwardRef` and P2-3431 exists to undo.
 *
 * The only thing that differs by caller is **who is allowed to ask** — an authenticated
 * platform on the API side, a user of the lead centre in the reporting tool. That check
 * stays with each caller; everything below is shared.
 *
 * This service depends on repositories only. Keep it that way: the moment it injects a
 * service, it stops being safe to import from both sides.
 */
@Injectable()
export class BilateralVersioningRulesService {
  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _versionRepository: VersionRepository,
    // @akili-spec changes/bilateral-create-upsert-by-code — UBC-DD-6: added so
    // `assertCallerMayVersion`'s lead-centre fallback (moved here from `bvs`) can resolve it.
    private readonly _resultsCenterRepository: ResultsCenterRepository,
  ) {}

  /**
   * The one open reporting phase. There is never more than one — that is a data rule, not
   * something enforced here, which is why a single `findOne` reflects it.
   */
  async getActiveReportingPhase() {
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

  /**
   * Resolves the row to carry forward and refuses everything that must not be, in the order
   * that produces the most useful message. Returns the source result on success.
   */
  async resolveVersionableResult(
    resultCode: string,
    activePhaseId: number,
  ): Promise<Result> {
    const rows = await this._resultRepository.find({
      where: { result_code: resultCode as any, is_active: true },
      order: { version_id: 'DESC' },
    });

    if (!rows.length) {
      throw new NotFoundException(
        `No active result found for result_code ${resultCode}.`,
      );
    }

    // Carried forward once. A second call must not put a rival row in the same phase.
    const alreadyThere = rows.find(
      (row) => Number(row.version_id) === Number(activePhaseId),
    );
    if (alreadyThere) {
      throw new ConflictException(
        `Result ${resultCode} already has a version in the current phase (result id ${alreadyThere.id}). It cannot be carried forward twice.`,
      );
    }

    const source = rows.find(
      (row) => Number(row.version_id) !== Number(activePhaseId),
    );
    if (!source) {
      throw new ConflictException(
        `Result ${resultCode} only exists in the current phase, so there is nothing to carry forward.`,
      );
    }

    this.assertIsBilateral(source, resultCode);
    this.assertNotKnowledgeProduct(source, resultCode);
    this.assertApproved(source, resultCode);

    return source;
  }

  /** The row for this code in a given phase, or undefined. Used to confirm what replication left. */
  async findInPhase(resultCode: string, phaseId: number) {
    const rows = await this._resultRepository.find({
      where: { result_code: resultCode as any, is_active: true },
    });
    return rows.find((row) => Number(row.version_id) === Number(phaseId));
  }

  assertIsBilateral(source: Result, resultCode: string): void {
    if (source.source !== SourceEnum.Bilateral) {
      throw new BadRequestException(
        `Result ${resultCode} is not a W3/Bilateral result, so it cannot be carried forward through this flow.`,
      );
    }
  }

  /**
   * Knowledge Products are excluded, and not as an oversight to be lifted: `VersioningService`
   * refuses them for every caller because CGSpace owns their metadata. Refusing here just
   * gives a message that names the result instead of a generic conflict from deeper in.
   */
  assertNotKnowledgeProduct(source: Result, resultCode: string): void {
    if (Number(source.result_type_id) === ResultTypeEnum.KNOWLEDGE_PRODUCT) {
      throw new ConflictException(
        `Result ${resultCode} is a Knowledge Product. Knowledge Products cannot be carried into a new phase; report the new knowledge product with its own CGSpace handle instead.`,
      );
    }
  }

  assertApproved(source: Result, resultCode: string): void {
    if (Number(source.status_id) !== ResultStatusData.Approved.value) {
      throw new ConflictException(
        `Result ${resultCode} is not approved (status_id ${source.status_id}). Only an approved result from a previous phase can be carried forward.`,
      );
    }
  }

  /**
   * The programme the result moves into: its own role-1 initiative.
   *
   * Deriving it rather than accepting it is what lets the API caller send a result code and
   * nothing else, and it is the case `versionProcessV2` treats as `isP25SelfEntity`, skipping
   * the initiative/entity-map lookup. The reporting tool shows this value read-only and sends
   * it back, so the server can confirm the two agree instead of trusting the client.
   */
  async resolveTargetEntityId(
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

  /**
   * Ownership, in two steps.
   *
   * The exact check is `external_platform_id === mis.id`: the platform that created the
   * result is the one asking for it. When the result carries no originating platform — a
   * centre authored it in the reporting tool — the only thing linking the request to the
   * data is the centre, so the lead centre is matched against the platform's declared
   * scope. See `platform-center-scope.constants.ts` for why that map exists and how it
   * drifts.
   *
   * @akili-spec changes/bilateral-create-upsert-by-code — UBC-DD-6: moved here from
   * `BilateralVersioningService` so `create`'s resolve step (`UBC-R-4`) and `/version` share
   * one ownership rule. Behaviour is unchanged from the version this replaces.
   */
  async assertCallerMayVersion(
    source: Result,
    resultCode: string,
    platform?: ClarisaApiKeyValidationMis,
  ): Promise<void> {
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

  /** The centre leading this result, or null. The identity both callers authorise against. */
  async resolveLeadCenterCode(resultId: number): Promise<string | null> {
    const rows = await this._resultRepository.query(
      `select rc.center_id as code
         from results_center rc
        where rc.result_id = ?
          and rc.is_active > 0
          and rc.is_leading_result = 1
        limit 1`,
      [resultId],
    );
    return rows?.[0]?.code ?? null;
  }
}
