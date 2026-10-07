import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryRunner } from 'typeorm';
import { Result } from '../../results/entities/result.entity';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { Evidence } from '../../results/evidences/entities/evidence.entity';
import { ResultsByProjects } from '../../results/results_by_projects/entities/results_by_projects.entity';
import { NonPooledProjectBudget } from '../../results/result_budget/entities/non_pooled_proyect_budget.entity';
import { ResultsCenter } from '../../results/results-centers/entities/results-center.entity';
import { ResultsTocResult } from '../../results/results-toc-results/entities/results-toc-result.entity';
import { ResultsTocResultIndicators } from '../../results/results-toc-results/entities/results-toc-results-indicators.entity';
import { ResultIndicatorTarget } from '../../results/results-toc-results/entities/result-toc-result-target-indicators.entity';
import { ResultTocSdgTargets } from '../../results/results-toc-results/entities/result-toc-sdg-target.entity';
import { ResultTocImpactArea } from '../../results/results-toc-results/entities/result-toc-impact-area-target.entity';
import { ResultTocActionArea } from '../../results/results-toc-results/entities/result-toc-action-area.entity';
import {
  RequestTypeEnum,
  ShareResultRequest,
} from '../../results/share-result-request/entities/share-result-request.entity';
import { ResultCountry } from '../../results/result-countries/entities/result-country.entity';
import { ResultCountrySubnational } from '../../results/result-countries-sub-national/entities/result-country-subnational.entity';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { InstitutionRoleEnum } from '../../results/results_by_institutions/entities/institution_role.enum';
import { ResultsByInititiative } from '../../results/results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultActor } from '../../results/result-actors/entities/result-actor.entity';
import {
  ResultReviewHistory,
  ReviewActionEnum,
} from '../../results/result-review-history/entities/result-review-history.entity';
import type { PrimaryTransferResult } from '../../results/share-result-request/services/primary-program-request.service';
import { ResultsByInstitutionType } from '../../results/results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultIpMeasure } from '../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ClarisaApiKeyValidationMis } from '../interfaces/clarisa-api-key-validation.interface';
import { CreateBilateralDto } from '../dto/create-bilateral.dto';

/**
 * Human wording of a `status_id` for refusal messages (`pending-review` -> `pending review`).
 * Shared by the resolver in `BilateralService` and the re-read below so both name the status
 * the same way (RSB-R-2: "the message names the `result_code` and the status name").
 */
export function describeResultStatus(statusId: number | string): string {
  const status = ResultStatusData.getFromValue(Number(statusId));
  return status ? status.name.replace(/-/g, ' ') : String(statusId);
}

/**
 * @akili-spec bilateral/resubmit-rejected-result — RSB-T-3. The read-only checks the preflight
 * needs from `BilateralService` (whose helpers are private and whose constructor already injects
 * this service, so injecting it back would be a DI cycle). `BilateralService.create()` builds the
 * port from its own helpers and passes it in `ResubmissionParams`; the ORDER of the steps lives in
 * `runPreflight` below, where a spec can pin it. Nothing on this port writes: that is the point of
 * the preflight (`RSB-R-8`, `RSB-DD-2`: no real transaction, so every refusal must happen before
 * the first write).
 */
export interface ResubmissionPreflightPort {
  /** Step 1: the type's MDS gate plus the handler's `resolveAndValidate` (level, actors, numbers). */
  validateTypeSpecificPayload(dto: CreateBilateralDto): Promise<void>;
  /** Step 2: `geo_focus` presence and the scope / region / country / subnational lookups. */
  validateGeoFocus(dto: CreateBilateralDto): Promise<void>;
  /** Step 3: duplicate evidence links (the create writer's own check, hoisted). */
  assertNoDuplicateEvidenceLinks(evidence: unknown): void;
  /** Step 4a: every Science Program code in the payload exists in CLARISA. */
  validateTocMappingInitiatives(
    tocMapping?: any,
    contributingPrograms?: any[],
  ): Promise<void>;
  /** Step 4b: every `grant_title` resolves to a project of the reporting phase. */
  resolveContributingProjects(projects: any[] | undefined): Promise<{
    resolvedProjects: Map<string, any>;
    /** The payload's lead project id, or `null` when it names none. */
    payloadLeadProjectId: number | null;
    /**
     * `RSF-R-6`: how many projects the writers will flag as lead (`determineIsLead`: a single
     * project always counts as one, otherwise the ones flagged `is_lead`). More than 1 is refused.
     */
    leadProjectCount: number;
  }>;
  /** Step 6: the CLARISA initiative behind an official code (already upper-cased). */
  resolveInitiative(
    officialCode: string,
  ): Promise<{ id: number; code: string } | null>;
  /**
   * Step 6: `PrimaryProgramRequestService.isAligned` (`RSB-DD-7`), always against the PAYLOAD lead
   * project. There is no stored fallback (`RSB-R-23`): the reset deactivates the stored projects.
   */
  isAligned(leadProjectId: number, initiativeId: number): Promise<boolean>;
  /** Step 7: title uniqueness in the phase, excluding the result itself (`RSB-R-16`). */
  ensureUniqueTitle(
    title: string,
    versionId: number,
    excludeResultId: number,
  ): Promise<void>;
  /**
   * Step 7b (`RSF-R-5`, after the title check): does `lead_center` resolve to a CGIAR centre? The
   * SAME read-only lookup `handleLeadCenter` runs (alias table, CLARISA institutions,
   * `clarisa_center`), without persisting. A payload with no `lead_center` object has nothing to resolve and answers `true`
   * (`handleLeadCenter` skips it the same way): only an object that matches nothing is refused.
   */
  isLeadCenterResolvable(leadCenter: unknown): Promise<boolean>;
  /**
   * Step 7c (`RSF-P-13`): the CLARISA initiative ids behind the payload's `contributing_programs`
   * codes (read-only, upper-cased like every SP lookup, deduplicated, in payload order). Codes that
   * CLARISA does not know were already refused by step 4a. Consumed by the role-2 reset (`RSF-T-6`).
   */
  resolveContributorInitiativeIds(
    contributingPrograms: any[] | undefined,
  ): Promise<number[]>;
  /**
   * Step 8 (T-4, carried from the T-3 review): `findOrCreateUser` for `created_by` and the
   * submitter, the same two calls the create path makes. It can REFUSE (400 "User email is
   * required.") and it may CREATE a user row, exactly like the create path does; so it runs last,
   * after every validation, and still before the first result write.
   */
  resolveUsers(
    dto: CreateBilateralDto,
  ): Promise<{ userId: number; submittedUserId: number }>;
}

/** What `ResubmissionWritersPort.writeResult` needs (`RSB-T-5`): everything the preflight resolved. */
export interface ResubmissionWriteArgs {
  target: Result;
  bilateralDto: CreateBilateralDto;
  platform?: ClarisaApiKeyValidationMis;
  /** The resolved `created_by` user: audit user of every write. */
  userId: number;
  /** The resolved submitter (`external_submitter`). */
  submittedUserId: number;
  /** The contributing projects the preflight resolved (the writers do not re-query them). */
  resolvedProjects: Map<string, any>;
  /**
   * `DD-5`: the payload's primary differs from the current owner (or there is no owner). The
   * writers then do NOT write role 1 for the requested primary: the direct transfer writes it in the
   * final transaction (`RRC-R-17`, `RRC-DD-7`), where it also retires the old owner's role 1, so the
   * result keeps its previous primary until that transaction commits. The contributors still hang
   * off the requested primary (`DD-6`).
   */
  suppressPrimaryRole: boolean;
}

/**
 * @akili-spec bilateral/resubmit-rejected-result — RSB-T-5. The writers and collaborators the
 * pipeline needs from `BilateralService` (private helpers, and the service already injects this one,
 * so the other direction would be a DI cycle). Same pattern as the T-3 `ResubmissionPreflightPort`:
 * `create()` builds the port from its own helpers and passes it in `ResubmissionParams`; the ORDER
 * of the stages lives in `runResubmissionPipeline`, where a spec can pin it, and what each member
 * really writes is proven through `BilateralService` in `bilateral.service.spec.ts`.
 */
export interface ResubmissionWritersPort {
  /**
   * `RSB-T-4` forward pointer 2: how many of the payload's `contributing_partners` RESOLVE in
   * CLARISA. `handleInstitutions` returns early when none does, so the reset must treat "sent but
   * none resolve" as "sent none" or the stale PARTNER rows would stay active.
   */
  countResolvablePartners(dto: CreateBilateralDto): Promise<number>;
  /** `RSB-T-4` forward pointer 5: the stored owner (active role 1), or `null` when there is none. */
  readOwnerInitiativeId(resultId: number): Promise<number | null>;
  /**
   * Design §4 step 4: the header updated in place plus every section writer, in the order the
   * no-code create runs them, with the replace-safe options (`replacePreviousLead`,
   * `writeSubnationalsForAllCountries`). It MUST reject (not swallow) a failed lead-centre demotion.
   */
  writeResult(args: ResubmissionWriteArgs): Promise<void>;
  /**
   * `RRC-T-6` (`RRC-R-17`, `RRC-DD-7`): `ppr.transferPrimary(resultId, initiativeId, { id: userId },
   * manager, { releaseContributors: true })` — the DIRECT transfer, no ownership request, no
   * acceptance round. It receives the manager of the FINAL transaction (NFR §7: the transfer, the
   * flip and the history roll back together) and THROWS on failure (the core never answers
   * `ok: false`). Replaces `requestPrimary` (`RSB-R-14`, superseded).
   */
  transferPrimary(
    resultId: number,
    initiativeId: number,
    userId: number,
    manager: EntityManager,
  ): Promise<PrimaryTransferResult>;
  /** `BilateralService.announcePendingReview`: never throws, runs only after the commit. */
  announcePendingReview(resultId: number, emitterUserId: number): Promise<void>;
}

/** What `resubmit()` needs from `create()`: the resolved target plus the untouched payload. */
export interface ResubmissionParams {
  target: Result;
  bilateralDto: CreateBilateralDto;
  platform?: ClarisaApiKeyValidationMis;
  /** `RSB-T-3`: the read-only checks of the preflight (see `ResubmissionPreflightPort`). */
  preflight: ResubmissionPreflightPort;
  /** `RSB-T-5`: the writers of the pipeline (see `ResubmissionWritersPort`). */
  writers: ResubmissionWritersPort;
}

/** What the preflight resolved and the T-5 writers will need again (so they do not re-query). */
export interface ResubmissionPreflightResult {
  resolvedProjects: Map<string, any>;
  primary: { initiativeId: number; code: string };
  /** The payload's lead project (`RSB-R-23`): the one allocation was checked against. */
  leadProjectId: number;
  /** The resolved `created_by` user: audit user of every write of this resubmission. */
  userId: number;
  /** The resolved submitter (falls back to `created_by` in the payload, like the create path). */
  submittedUserId: number;
  /**
   * `RSF-P-13`: the CLARISA initiative ids of the payload's `contributing_programs`, resolved
   * read-only here so the role-2 reset (`RSF-T-6`) can keep exactly these and retire the rest.
   * Nothing consumes it yet.
   */
  contributorInitiativeIds: number[];
}

/** What `resetSectionsForResubmission` needs besides the result id (`RSB-T-4`). */
export interface ResubmissionResetOptions {
  /** `last_updated_by` of every row the reset deactivates. */
  userId: number;
  /** The result's type: the Innovation Use tables are only reset for Innovation Use. */
  resultTypeId: number;
  /**
   * `DD-5`: the payload's primary differs from the current owner (or there is no owner). The
   * pipeline decides on it (writers' role-1 suppression, the direct transfer). The reset itself no
   * longer reads it (`RRC-T-6` pivot): it never retires the old owner, so a failure before the
   * final transaction leaves the previous primary intact.
   */
  primaryChanged: boolean;
  /** `R-4`: the payload carries partners (then `updateInstitutions` replaces them itself). */
  payloadSendsPartners: boolean;
  /**
   * `RSF-R-7`: the CLARISA initiative ids of the payload's `contributing_programs` (from the
   * preflight). Active role-2 rows of any other initiative are deactivated. `[]` retires them all.
   */
  contributorInitiativeIds: number[];
}

/** One `outcomes[]` row's worth of data once a resubmission has been accepted (RSB-R-5). */
export interface ResubmissionOutcome {
  id: number;
  result_code: number;
  status_id: number;
  status: string | null;
}

/**
 * @akili-spec bilateral/resubmit-rejected-result — RSB-T-2 (RSB-DD-4, NFR Concurrency), completed
 * by RSB-T-5.
 *
 * Re-submission of a Rejected, platform-owned, open-phase result through
 * `POST /api/bilateral/create` with its `result_code`. `BilateralService.resolveResultCodeTarget`
 * has already run the guards (ownership, Knowledge Product, Rejected-only, same type) before
 * `resubmit()` is called; this service owns what must happen under mutual exclusion.
 *
 * The pipeline (design §4; there is NO real transaction over the writers, `RSB-P-1`/`RSB-DD-2`, so
 * the ORDER is the guarantee):
 *
 *   lock -> re-read status -> preflight (no writes) -> reset -> writers -> final atomic write (CAS
 *   7 -> 5, which also locks the `Result` row; the direct primary transfer, only when the primary
 *   changes; `RESUBMIT` history) -> post-commit
 *
 * The status flips LAST (`RSB-DD-3`): if anything before the final write fails, the result stays
 * **Rejected** with partial data and the platform can retry (the reset cleans up and the writers
 * rewrite). It never ends up in Pending Review half-written, or without its primary.
 *
 * The lock is `GET_LOCK('rsb:<resultId>', 0)` — non-blocking, so a concurrent attempt is a 409
 * immediately instead of a queue. MySQL named locks are session-scoped, hence the dedicated
 * `QueryRunner`: acquire, status re-read and `RELEASE_LOCK` MUST share one connection (the
 * same pattern as `BilateralAiDispatchService`). A `pessimistic_write` row lock was rejected
 * (DD-4): the writers do not run inside a transaction (`P-1`), so it would protect nothing. The CAS
 * of the final write is the second barrier.
 */
@Injectable()
export class BilateralResubmissionService {
  private readonly logger = new Logger(BilateralResubmissionService.name);

  /** Lock timeout in seconds. 0 = do not wait: a held lock means "already being resubmitted". */
  private static readonly LOCK_TIMEOUT_SECONDS = 0;

  /** `share_result_request.request_status_id` of an accepted request (`PrimaryProgramRequestService`). */
  private static readonly REQUEST_ACCEPTED = 2;
  /** `institution_roles_id` of an Innovation Use organisation (`innovation-use.service.ts:404`). */
  private static readonly INNOVATION_USE_ORGANIZATION_ROLE = 5;
  /** `results_by_inititiative.initiative_role_id` of an accepted contributor. */
  private static readonly CONTRIBUTOR_INITIATIVE_ROLE = 2;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resubmit(params: ResubmissionParams): Promise<ResubmissionOutcome> {
    const { target } = params;
    const resultCode = String(target.result_code);
    const lockName = `rsb:${target.id}`;
    const queryRunner = this.dataSource.createQueryRunner();
    let connected = false;
    let locked = false;

    try {
      await queryRunner.connect();
      connected = true;

      const lock = await this.acquireLock(queryRunner, lockName);
      if (lock === 'error') {
        // MySQL answers NULL when GET_LOCK itself fails: a fault the platform can retry, NOT
        // "somebody else is resubmitting" (RSB-T-2 advisory, T-5 forward pointer 9).
        this.logRefusal(resultCode, params.platform, 503);
        throw new ServiceUnavailableException(
          `Result ${resultCode} could not be locked for resubmission. Retry the request.`,
        );
      }
      if (lock === 'busy') {
        this.logRefusal(resultCode, params.platform, 409);
        throw new ConflictException(
          `Result ${resultCode} is already being resubmitted.`,
        );
      }
      locked = true;

      // The resolver read the status BEFORE the lock. Someone may have flipped it between
      // that read and now (the first of two concurrent attempts moves it to Pending Review),
      // so the decision is taken again here, under the lock (DD-4).
      await this.assertStillRejected(queryRunner, target, resultCode, params);

      try {
        return await this.runResubmissionPipeline(params);
      } catch (error) {
        // RSB-R-21: one line per refusal, with the status it ends in. Never the payload.
        this.logRefusal(
          resultCode,
          params.platform,
          (error as any)?.getStatus?.() ?? (error as any)?.status ?? 500,
        );
        throw error;
      }
    } finally {
      if (locked) await this.releaseLock(queryRunner, lockName);
      // Only release a runner that actually connected.
      if (connected) await this.releaseRunner(queryRunner);
    }
  }

  /**
   * The pipeline, in the order design §4 fixes (`RSB-T-5`). Everything up to and including the
   * preflight is READ-only (apart from the user rows `findOrCreateUser` may create, as the create
   * path does). From the reset on, every step can leave the result partially written but still
   * **Rejected**, which is what makes a failure retryable (`RSB-DD-3`):
   *
   *  1. preflight (`runPreflight`): every refusal that needs no saved row
   *  2. the inputs of the reset, both reads: the stored owner (`primaryChanged`, `DD-5`) and the
   *     partners that RESOLVE in CLARISA (`payloadSendsPartners`)
   *  3. `resetSectionsForResubmission` (it leaves the old owner's role 1 and accepted `primary`
   *     row alone, `RRC-T-6`)
   *  4. `writers.writeResult`: the header in place + every section writer (role 1 suppressed when
   *     the primary changes)
   *  5. `commitResubmission`: ONE transaction. The CAS 7 -> 5 first (its UPDATE takes the `Result`
   *     row lock the direct transfer relies on, `RRC-T-1` pointer); then, only when the primary
   *     changed (or there was no owner), `writers.transferPrimary` with the transaction manager: it
   *     retires the old owner and writes the new one. A throw becomes a 5xx and rolls everything
   *     back, so the result keeps its previous primary and stays Rejected (`RRC-R-17`, NFR §7);
   *     then the `RESUBMIT` history row
   *  6. post-commit: the `RSB-R-21` line, the `RRC-R-18` transfer line, and `announcePendingReview`
   *     ALWAYS (after a transfer an owner always exists, `RRC-DD-7`)
   */
  protected async runResubmissionPipeline(
    params: ResubmissionParams,
  ): Promise<ResubmissionOutcome> {
    const { target, bilateralDto: dto, writers } = params;
    const resultCode = String(target.result_code);

    // `RSB-T-3` / `RSB-T-4`: every refusal that needs no saved row happens here, before anything
    // is written. The result (resolved projects, primary, payload lead project, resolved users)
    // is what the writers consume instead of re-querying.
    const preflight = await this.runPreflight(params);

    // `DD-5` / T-4 forward pointer 5: the primary CHANGES when the payload names an SP other than
    // the stored owner (active role 1), and an ownerless result counts as changed.
    const storedOwnerId = await writers.readOwnerInitiativeId(target.id);
    const primaryChanged =
      storedOwnerId == null ||
      Number(storedOwnerId) !== preflight.primary.initiativeId;
    // T-4 forward pointer 2: from the partners that RESOLVE in CLARISA, not from the raw payload
    // (`handleInstitutions` returns early when none does, so stale PARTNER rows would stay active).
    const payloadSendsPartners =
      (await writers.countResolvablePartners(dto)) > 0;

    await this.resetSectionsForResubmission(target.id, {
      userId: preflight.userId,
      resultTypeId: target.result_type_id,
      primaryChanged,
      payloadSendsPartners,
      contributorInitiativeIds: preflight.contributorInitiativeIds,
    });

    await writers.writeResult({
      target,
      bilateralDto: dto,
      platform: params.platform,
      userId: preflight.userId,
      submittedUserId: preflight.submittedUserId,
      resolvedProjects: preflight.resolvedProjects,
      suppressPrimaryRole: primaryChanged,
    });

    // The lead project row exists now and the result is still Rejected, with its previous primary
    // (the reset and the writers never retire it). The CAS, the direct primary transfer (only when
    // the primary changed) and the history row are ONE transaction (NFR §7): a failed transfer, a
    // lost CAS or a failed history insert rolls all of it back, so the result stays Rejected with
    // its previous primary and the platform retries.
    const transfer = await this.commitResubmission(target, preflight, {
      transferPrimary: primaryChanged ? writers.transferPrimary : undefined,
      resultCode,
    });

    // RSB-R-21: the committed outcome. Never the payload, never a key.
    this.logAccepted(resultCode, params.platform);

    // RRC-R-18: one line per direct transfer, post-commit, ids only (`.cursorrules`). The previous
    // owner is the core's own `previousInitiativeId` (the reset no longer retires it).
    if (transfer?.outcome === 'transferred') {
      this.logger.log(
        `Bilateral resubmission: direct primary transfer on result ${target.id} (previous initiative ${transfer.previousInitiativeId ?? 'none'}, new initiative ${preflight.primary.initiativeId}, user ${preflight.userId}).`,
      );
    }

    // RRC-R-17 / RRC-DD-7: ALWAYS announced. With the same primary the owner never moved; with a
    // different one the direct transfer has just made it the owner, so the review queue of that
    // Science Program gets the ordinary notice (no acceptance round is left to defer it to).
    try {
      await writers.announcePendingReview(
        target.id,
        preflight.submittedUserId ?? preflight.userId,
      );
    } catch (error) {
      // `announcePendingReview` never throws; this keeps a faulty double from turning a
      // COMMITTED resubmission into an error response.
      this.logger.error(
        `Bilateral resubmission: the Pending Review announcement failed for result ${resultCode}.`,
        error as Error,
      );
    }

    return {
      id: target.id,
      result_code: target.result_code,
      status_id: ResultStatusData.PendingReview.value,
      status: describeResultStatus(ResultStatusData.PendingReview.value),
    };
  }

  /**
   * `RSB-DD-3` — the ONLY write that moves the result out of Rejected, and it is one real
   * `transaction`: the compare-and-swap `status 7 -> 5`, the direct primary transfer (only when the
   * primary changed, `RRC-R-17`) and the `RESUBMIT` history row either all happen or none does.
   * Zero rows affected means somebody else moved the result since the lock re-read: a 409, and no
   * transfer or history row (the transaction throws before them).
   *
   * The CAS runs FIRST on purpose (`RRC-T-1` forward pointer): its UPDATE is the `Result` row lock
   * the core relies on (the same lock `updatePrimaryAssignment` takes), and a lost CAS refuses
   * before a single ownership write. It is reused, not repeated with a second locking read.
   *
   * The history row (`RSB-R-18`): `initiative_id` is the REQUESTED primary (what the platform asked
   * for, which for an ownerless result is the only SP there is) and `created_by` the external
   * submitter, the same user `external_submitter` records on the header. The shape follows the
   * review decision (`results.service.ts:4340-4357`: status + history in one manager transaction).
   * Earlier history rows are never touched (`RSB-R-18`).
   */
  private async commitResubmission(
    target: Result,
    preflight: ResubmissionPreflightResult,
    request: {
      transferPrimary?: ResubmissionWritersPort['transferPrimary'];
      resultCode: string;
    },
  ): Promise<PrimaryTransferResult | null> {
    const resultCode = request.resultCode;
    return this.dataSource.transaction(async (manager) => {
      const flipped = await manager.update(
        Result,
        { id: target.id, status_id: ResultStatusData.Rejected.value },
        {
          status_id: ResultStatusData.PendingReview.value,
          last_updated_by: preflight.userId,
        },
      );
      if (!flipped.affected) {
        throw new ConflictException(
          `Result ${resultCode} cannot be resubmitted: its status changed while the resubmission was being processed.`,
        );
      }

      // NFR §7 / `RRC-R-17`: the direct transfer rides in this transaction, after the CAS locked the
      // row. The core THROWS on failure (it has no `ok:false`), which rolls the transaction back;
      // it is turned into a retryable 5xx HERE (a non-HTTP fault is a 503 with a retry message).
      let transfer: PrimaryTransferResult | null = null;
      if (request.transferPrimary) {
        try {
          transfer = await request.transferPrimary(
            target.id,
            preflight.primary.initiativeId,
            preflight.userId,
            manager,
          );
        } catch (error) {
          throw this.primaryTransferFailure(resultCode, error);
        }
      }

      await manager.save(
        ResultReviewHistory,
        manager.create(ResultReviewHistory, {
          result_id: target.id,
          action: ReviewActionEnum.RESUBMIT,
          comment: null,
          initiative_id: preflight.primary.initiativeId,
          created_by: preflight.submittedUserId,
        }),
      );
      return transfer;
    });
  }

  /**
   * The direct transfer throws on any failure (`RRC-T-1`). An HTTP exception keeps its status; any
   * other fault is a transient 503 so the platform retries. The message never carries the payload,
   * and the cause is logged (its message only, never the payload).
   */
  private primaryTransferFailure(resultCode: string, error: unknown): Error {
    if ((error as any)?.getStatus) return error as Error;
    this.logger.error(
      `Bilateral resubmission: the primary transfer failed for result ${resultCode}: ${
        (error as Error)?.message ?? 'unknown error'
      }`,
    );
    return new ServiceUnavailableException(
      `Result ${resultCode} could not be resubmitted: the primary Science Program could not be assigned. The result stays rejected; resend the same request to retry.`,
    );
  }

  /**
   * `RSB-T-3`: the resubmission preflight. Zero writes: it only reads (the payload, CLARISA
   * catalogues, the lead project allocations). The create transaction enrols no repository
   * (`RSB-P-1`/`RSB-DD-2`), so a refusal found AFTER the first write would leave a half-applied
   * result; `UBC-T-3` attempt 1 failed twice on exactly that (checks that slipped past the
   * header). The order is the one `tasks.md` fixes:
   *
   *  1. type-specific payload (`resolveAndValidate`: level, actors, numbers)
   *  2. `geo_focus` + region / country / subnational lookups
   *  3. duplicate evidence links
   *  4. Science Program codes exist in CLARISA + contributing projects resolve
   *  5. a primary Science Program is present (`RSB-R-13`)
   *  6. the payload names a lead project (`RSB-R-23`), and the primary is allocated to it
   *     (`RSB-R-12`, `RSB-DD-7`)
   *  6b. at most one project is flagged lead (`RSF-R-6`), straight after the lead-project check
   *  7. the title is not another result (`RSB-R-16`)
   *  7b. `lead_center` resolves to a centre (`RSF-R-5`)
   *  7c. the contributor initiative ids are resolved for the reset (`RSF-P-13`)
   *  8. the users resolve (`findOrCreateUser`; it may refuse, and may create a user row)
   *
   * The users come LAST on purpose: it is the only step that writes anything (a user row, the same
   * one the create path would create), so no validation refusal can leave a user behind. It still
   * precedes every write to the RESULT.
   */
  private async runPreflight(
    params: ResubmissionParams,
  ): Promise<ResubmissionPreflightResult> {
    const { target, bilateralDto: dto, preflight: port } = params;
    const resultCode = String(target.result_code);

    await port.validateTypeSpecificPayload(dto);
    await port.validateGeoFocus(dto);
    port.assertNoDuplicateEvidenceLinks(dto.evidence);
    await port.validateTocMappingInitiatives(
      dto.toc_mapping,
      dto.contributing_programs,
    );
    const { resolvedProjects, payloadLeadProjectId, leadProjectCount } =
      await port.resolveContributingProjects(
        dto.contributing_bilateral_projects,
      );

    // RSB-R-13: nobody would review a result without a primary.
    const primaryCode = this.readPrimaryCode(dto);
    if (!primaryCode) {
      throw new BadRequestException(
        `Result ${resultCode} cannot be resubmitted without a primary Science Program (toc_mapping.science_program_id).`,
      );
    }

    // RSB-R-23 (T-3 Pivot Record, user decision 2026-10-06): the replace semantics deactivate the
    // stored projects, so the stored lead cannot stand in for a missing one. The payload must yield
    // the lead the writers will store (`determineIsLead`: a single project, or the one flagged).
    if (!payloadLeadProjectId) {
      throw new BadRequestException(
        `Result ${resultCode} cannot be resubmitted without a lead bilateral project (one project, or one flagged is_lead).`,
      );
    }
    const leadProjectId = payloadLeadProjectId;

    // RSF-R-6 / RSF-DD-6 (resubmission branch only; the no-code create keeps last-wins): the writers
    // would store every flagged project as lead, so two flags are refused instead of guessed.
    // A single project is always the lead (`leadProjectCount` is 1), so it still passes.
    if (leadProjectCount > 1) {
      throw new BadRequestException(
        `Result ${resultCode} cannot be resubmitted: ${leadProjectCount} bilateral projects are flagged is_lead; flag exactly one.`,
      );
    }

    // RSB-R-12 / RSB-DD-7: only the payload lead project counts.
    const initiative = await port.resolveInitiative(primaryCode);
    const aligned = initiative
      ? await port.isAligned(leadProjectId, initiative.id)
      : false;
    if (!aligned) {
      throw new BadRequestException(
        `${primaryCode} is not allocated to the lead project of result ${resultCode}.`,
      );
    }

    // RSB-R-16: the result own title is not a duplicate; another result title is.
    await port.ensureUniqueTitle(dto.title ?? '', target.version_id, target.id);

    // RSF-R-5 / RSF-DD-6 (resubmission branch only; the no-code create warns and continues): a
    // `lead_center` object that matches no centre is refused, because `handleLeadCenter` would
    // silently skip it and the result would keep a lead the platform did not send. Read-only.
    if (!(await port.isLeadCenterResolvable(dto.lead_center))) {
      throw new BadRequestException(
        `Result ${resultCode} cannot be resubmitted: lead_center ${this.describeLeadCenter(dto.lead_center)} does not match a CGIAR center.`,
      );
    }

    // RSF-P-13: the contributor ids the role-2 reset (RSF-T-6) will keep. A read.
    const contributorInitiativeIds = await port.resolveContributorInitiativeIds(
      dto.contributing_programs,
    );

    // T-4 (T-3 review): the users, last. It can refuse (400 "User email is required.").
    const { userId, submittedUserId } = await port.resolveUsers(dto);

    return {
      resolvedProjects,
      primary: { initiativeId: initiative.id, code: primaryCode },
      leadProjectId,
      userId,
      submittedUserId,
      contributorInitiativeIds,
    };
  }

  /**
   * `{value}` of the `RSF-R-5` message: the identifier the platform sent (acronym, then name, then
   * institution id), never the whole object (`RSF-DD` §6).
   */
  private describeLeadCenter(leadCenter: unknown): string {
    const sent = (leadCenter ?? {}) as Record<string, unknown>;
    const value = [sent.acronym, sent.name, sent.institution_id].find(
      (candidate) => candidate != null && String(candidate).trim() !== '',
    );
    return value == null ? '(empty)' : String(value).trim();
  }

  /**
   * `RSB-T-4` — the section reset (`RSB-R-4`, design §7). The payload is the new truth, but most
   * of the create writers only ADD (plain inserts, upserts that never deactivate), so a section
   * the payload no longer carries would stay active, and one it does carry would be written twice.
   * This deactivates (`is_active = 0`, never a delete) every such section of the result; the
   * writers then rewrite the payload's version.
   *
   * Called by `runResubmissionPipeline` AFTER the preflight and BEFORE the writers (`RSB-T-5`): a
   * reset followed by a validation refusal would break `RSB-R-8`, so no refusal may come after it.
   *
   * One `manager.transaction` over the whole reset, so a fault part-way cannot leave the result
   * half-reset (the writers that follow are not transactional, `RSB-P-1`; a retry re-runs this and
   * finds nothing left to do). It never touches `result_review_history` (`RSB-R-18`).
   *
   * Table list and where each one comes from (the same list goes into `execution.md`). Paths are
   * under `src/api`; `DRD` = `DeleteRecoverDataService.deleteResult` (`RSB-P-21`), the reference
   * list. A "plain insert" writer is one that adds a row every time, so without the reset a section
   * the payload resends is written twice (`RSB-P-4`).
   *
   * - `evidence`: every active row of the result. DRD: `EvidencesRepository.logicalDelete`
   *   (`results/evidences/evidences.repository.ts:175`). Writer `bs.handleEvidence`: plain insert.
   * - `results_by_projects`: every active row. NOT in DRD. Writer `bs.saveResultProject`
   *   (`bilateral.service.ts:4154`): plain insert.
   * - `non_pooled_projetct_budget`: rows whose `result_project_id` is one of those projects. DRD:
   *   `NonPooledProjectBudgetRepository.logicalDelete`
   *   (`results/result_budget/repositories/non_pooled_proyect_budget.repository.ts:112`) reaches
   *   the table through the legacy `non_pooled_project`, so it is not reused; the bilateral writer
   *   `bs.createOrUpdateBudget` (`:4168`) keys on `result_project_id`.
   * - `results_center`: active rows whose `is_leading_result` is not true. DRD:
   *   `ResultsCenterRepository.logicalDelete` (`results/results-centers/results-centers.repository.ts:102`)
   *   takes the lead too, so it is not reused. Writer `bs.persistContributingCenter` (`:5374`).
   * - `results_toc_result`, `results_toc_result_indicators`, `result_indicators_targets`,
   *   `result_toc_sdg_targets`, `result_toc_impact_area_target`, `result_toc_action_area`: the
   *   mapping and its five child tables. DRD: `ResultsTocResultRepository.logicalDelete`
   *   (`results/results-toc-results/repositories/results-toc-results.repository.ts:73`); the child
   *   list is `deactivateChildrenForParents` (same file, `:94-135`).
   * - `share_result_request`: active rows, EXCEPT an accepted PRIMARY (the record of the current
   *   owner; when the primary changes, the direct transfer retires it in the final transaction,
   *   `RRC-T-6`). DRD:
   *   `ShareResultRequestRepository.logicalDelete`
   *   (`results/share-result-request/share-result-request.repository.ts:384`) is unfiltered, so a
   *   filtered update is used instead (tasks.md T-4 Disqualifier).
   * - `result_country_subnational`: rows under every `result_country` of the result. DRD:
   *   `ResultCountrySubnationalRepository.logicalDelete`
   *   (`results/result-countries-sub-national/repositories/result-country-subnational.repository.ts:224`)
   *   joins on `rc.id`, but the key of `result_country` is `result_country_id`, so it is not reused.
   * - `results_by_institution` (role PARTNER): only when the payload sends no partners. When it
   *   sends some, `ResultByIntitutionsRepository.updateInstitutions`
   *   (`results/results_by_institutions/result_by_intitutions.repository.ts:403`) replaces them.
   * - Innovation Use only (`results-framework-reporting/innovation-use/innovation-use.service.ts:399-486`,
   *   `saveAnticipatedInnoUser`, which only adds or matches): `result_actors` (every section),
   *   `results_by_institution_type` (`institution_roles_id = 5`), `result_ip_measure`.
   *
   * Not reset on purpose: the old owner's role 1 and accepted `primary` row, even when the primary
   * changes (`RRC-T-6` pivot, NFR §7): this reset runs in its OWN transaction, before the final one,
   * so retiring the owner here would leave the result Rejected and ownerless after a later failure.
   * `PrimaryProgramRequestService.transferPrimary` retires both inside the final transaction.
   * `result_review_history` (`RSB-R-18`), `result_initiative_budget` and
   * `result_institutions_budget` (they hang off rows that are kept or replaced above).
   */
  async resetSectionsForResubmission(
    resultId: number,
    options: ResubmissionResetOptions,
  ): Promise<void> {
    const { userId } = options;
    const stamp = { is_active: false, last_updated_by: userId };

    await this.dataSource.transaction(async (manager) => {
      const activeRows = (entity: any, where: Record<string, unknown>) =>
        manager.find(entity, { where: { ...where, is_active: true } as any });
      /** Deactivates the active rows matching `where` (never a delete). */
      const deactivate = (
        entity: any,
        where: Record<string, unknown>,
        set: Record<string, unknown> = stamp,
      ) =>
        manager.update(
          entity,
          { ...where, is_active: true } as any,
          set as any,
        );
      /** The same, by a list of keys; skipped when the list is empty (`IN ()` is invalid SQL). */
      const deactivateByKeys = async (
        entity: any,
        key: string,
        keys: unknown[],
        set: Record<string, unknown> = stamp,
      ) => {
        if (keys.length) await deactivate(entity, { [key]: In(keys) }, set);
      };

      // ---- evidence ------------------------------------------------------------------------
      await deactivate(Evidence, { result_id: resultId });

      // ---- projects, and the budget that hangs off each project row -----------------------
      const projects = await activeRows(ResultsByProjects, {
        result_id: resultId,
      });
      await deactivateByKeys(
        NonPooledProjectBudget,
        'result_project_id',
        projects.map((project) => project.id),
      );
      await deactivate(ResultsByProjects, { result_id: resultId });

      // ---- non-lead contributing centres ---------------------------------------------------
      // Filtered in code: `is_leading_result` can be NULL, which a SQL `<> 1` would miss.
      const centers = await activeRows(ResultsCenter, { result_id: resultId });
      await deactivateByKeys(
        ResultsCenter,
        'id',
        centers.filter((center) => !center.is_leading_result).map((c) => c.id),
      );

      // ---- ToC: the mapping and its five child tables --------------------------------------
      const tocRows = await activeRows(ResultsTocResult, {
        result_id: resultId,
      });
      const tocIds = tocRows.map((toc) => toc.result_toc_result_id);
      if (tocIds.length) {
        const indicators = await activeRows(ResultsTocResultIndicators, {
          results_toc_results_id: In(tocIds),
        });
        const indicatorIds = indicators.map(
          (indicator) => indicator.result_toc_result_indicator_id,
        );
        // Targets are grandchildren (target -> indicator -> mapping): scope them by indicator.
        await deactivateByKeys(
          ResultIndicatorTarget,
          'result_toc_result_indicator_id',
          indicatorIds,
        );
        await deactivateByKeys(
          ResultsTocResultIndicators,
          'result_toc_result_indicator_id',
          indicatorIds,
        );
        await deactivateByKeys(
          ResultTocSdgTargets,
          'result_toc_result_id',
          tocIds,
        );
        await deactivateByKeys(
          ResultTocImpactArea,
          'result_toc_result_id',
          tocIds,
        );
        await deactivateByKeys(
          ResultTocActionArea,
          'result_toc_result_id',
          tocIds,
        );
        await deactivateByKeys(
          ResultsTocResult,
          'result_toc_result_id',
          tocIds,
        );
      }

      // ---- share requests: everything active EXCEPT an accepted PRIMARY -------------------
      // The accepted primary row is the record of the current owner. It stays whether or not the
      // primary changes (`RRC-T-6` pivot): this reset runs in its own transaction, so retiring it
      // here would leave the owner's role 1 without its row, or the result ownerless, after a later
      // failure. When the primary CHANGES, `transferPrimary` retires every active primary row in the
      // final transaction. The blanket `ShareResultRequestRepository.logicalDelete` would take it
      // down too, hence the filter.
      // `share_result_request` has no `last_updated_by` column: only the flag is written.
      const requests = await activeRows(ShareResultRequest, {
        result_id: resultId,
      });
      await deactivateByKeys(
        ShareResultRequest,
        'share_result_request_id',
        requests
          .filter(
            (request) =>
              !(
                request.request_type === RequestTypeEnum.PRIMARY &&
                Number(request.request_status_id) ===
                  BilateralResubmissionService.REQUEST_ACCEPTED
              ),
          )
          .map((request) => request.share_result_request_id),
        { is_active: false },
      );

      // ---- subnationals of EVERY country row (an inactive country can still hold them) ----
      const countries = await manager.find(ResultCountry, {
        where: { result_id: resultId },
      });
      await deactivateByKeys(
        ResultCountrySubnational,
        'result_country_id',
        countries.map((country) => country.result_country_id),
      );

      // ---- PARTNER institutions, only when the payload sends none --------------------------
      // When it sends some, `updateInstitutions` replaces them itself (deactivates the ones not
      // listed, reactivates the ones that are), so deactivating them here would only add churn.
      if (!options.payloadSendsPartners) {
        await deactivate(ResultsByInstitution, {
          result_id: resultId,
          institution_roles_id: InstitutionRoleEnum.PARTNER,
        });
      }

      // ---- Innovation Use: actors, organisation types and measures -------------------------
      // `saveAnticipatedInnoUser` only adds / matches, so stale rows would stay active.
      if (options.resultTypeId === ResultTypeEnum.INNOVATION_USE) {
        await deactivate(ResultActor, { result_id: resultId });
        await deactivate(ResultsByInstitutionType, {
          results_id: resultId,
          institution_roles_id:
            BilateralResubmissionService.INNOVATION_USE_ORGANIZATION_ROLE,
        });
        await deactivate(ResultIpMeasure, { result_id: resultId });
      }

      // ---- the OLD OWNER's role 1 is NOT touched here (`RRC-T-6` pivot, `DD-5` amended) -------
      // Not even when the primary changes: this transaction commits BEFORE the final one, so a later
      // failure would leave the result Rejected and ownerless. `transferPrimary` deactivates it in
      // the final transaction (CAS -> transfer -> `RESUBMIT`). The writers still do not write role 1
      // for a changed primary (`suppressPrimaryRole`), and role 2 (an accepted contributor) follows
      // the payload below.

      // ---- accepted contributors the payload no longer lists (RSF-R-7, DD-7) ---------------
      // Role 2 follows the payload (replace): an active role-2 row whose initiative is not in the
      // payload's `contributing_programs` goes; one still listed is not touched, and no role-2 row
      // is created here. Strictly role 2: the primary's role 1 is never named, even when the
      // primary is also listed. Filtered in code and keyed by row id (like the centres), so an empty
      // list needs no `NOT IN ()` and simply retires every role-2 row.
      const keep = new Set(options.contributorInitiativeIds.map(Number));
      const contributors = await activeRows(ResultsByInititiative, {
        result_id: resultId,
        initiative_role_id:
          BilateralResubmissionService.CONTRIBUTOR_INITIATIVE_ROLE,
      });
      await deactivateByKeys(
        ResultsByInititiative,
        'id',
        contributors
          .filter((contributor) => !keep.has(Number(contributor.initiative_id)))
          .map((contributor) => contributor.id),
      );
    });
  }

  /** `toc_mapping.science_program_id`, trimmed and upper-cased like every other SP lookup. */
  private readPrimaryCode(dto: CreateBilateralDto): string | null {
    const raw = (dto?.toc_mapping as any)?.science_program_id;
    if (raw === undefined || raw === null) return null;
    const code = String(raw).trim().toUpperCase();
    return code || null;
  }

  private async assertStillRejected(
    queryRunner: QueryRunner,
    target: Result,
    resultCode: string,
    params: ResubmissionParams,
  ): Promise<void> {
    const rows: Array<{ status_id: number | string }> = await queryRunner.query(
      `SELECT status_id FROM result WHERE id = ? AND is_active = 1`,
      [target.id],
    );
    const current = rows?.[0];
    if (!current) {
      this.logRefusal(resultCode, params.platform, 404);
      throw new NotFoundException(`Result ${resultCode} was not found.`);
    }
    if (Number(current.status_id) !== ResultStatusData.Rejected.value) {
      this.logRefusal(resultCode, params.platform, 409);
      throw new ConflictException(
        `Result ${resultCode} cannot be resubmitted: its status is ${describeResultStatus(current.status_id)}. Only rejected results can be resubmitted.`,
      );
    }
  }

  /** RSB-R-21: the committed outcome, in the same format as the refusals. */
  private logAccepted(
    resultCode: string,
    platform: ClarisaApiKeyValidationMis | undefined,
  ): void {
    this.logger.log(
      `result_code=${resultCode} operation=updated platform=${
        platform?.acronym ?? platform?.id ?? 'unknown'
      } outcome=accepted`,
    );
  }

  /** RSB-R-21 (advisory): code, operation, platform, outcome. Never the payload, never a key. */
  private logRefusal(
    resultCode: string,
    platform: ClarisaApiKeyValidationMis | undefined,
    httpStatus: number,
  ): void {
    this.logger.log(
      `result_code=${resultCode} operation=updated platform=${
        platform?.acronym ?? platform?.id ?? 'unknown'
      } outcome=rejected(${httpStatus})`,
    );
  }

  /**
   * `acquired` | `busy` | `error`. MySQL answers `1` (obtained), `0` (somebody else holds it, the
   * timeout is 0) or NULL (an error). Anything that is not a number is an error too.
   */
  private async acquireLock(
    queryRunner: QueryRunner,
    lockName: string,
  ): Promise<'acquired' | 'busy' | 'error'> {
    const rows = await queryRunner.query(`SELECT GET_LOCK(?, ?) AS acquired`, [
      lockName,
      BilateralResubmissionService.LOCK_TIMEOUT_SECONDS,
    ]);
    const answer = rows?.[0]?.acquired;
    if (answer === null || answer === undefined) return 'error';
    if (answer === true) return 'acquired';
    const value = Number(answer);
    if (value === 1) return 'acquired';
    if (value === 0) return 'busy';
    return 'error';
  }

  /** Log-and-swallow: a failed release must never mask the pipeline outcome. */
  private async releaseLock(
    queryRunner: QueryRunner,
    lockName: string,
  ): Promise<void> {
    try {
      await queryRunner.query(`SELECT RELEASE_LOCK(?)`, [lockName]);
    } catch (error) {
      this.logger.error(
        'Bilateral resubmission: RELEASE_LOCK failed.',
        error as Error,
      );
    }
  }

  private async releaseRunner(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.release();
    } catch (error) {
      this.logger.error(
        'Bilateral resubmission: query runner release failed.',
        error as Error,
      );
    }
  }
}
