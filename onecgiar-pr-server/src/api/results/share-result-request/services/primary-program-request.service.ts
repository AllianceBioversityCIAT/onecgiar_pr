import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModuleRef } from '@nestjs/core';
import { EntityManager, In, Not, Repository } from 'typeorm';
import { ShareResultRequestRepository } from '../share-result-request.repository';
import {
  RequestTypeEnum,
  ShareResultRequest,
} from '../entities/share-result-request.entity';
import { ResultsByProjects } from '../../results_by_projects/entities/results_by_projects.entity';
import { ClarisaProjectMapping } from '../../../../clarisa/clarisa-projects/entity/clarisa-project-mapping.entity';
import { ClarisaInitiativesRepository } from '../../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { TokenDto } from '../../../../shared/globalInterfaces/token.dto';
import { ResultsByInititiative } from '../../results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultsTocResult } from '../../results-toc-results/entities/results-toc-result.entity';
import { Result } from '../../entities/result.entity';
import {
  ResultReviewHistory,
  ReviewActionEnum,
} from '../../result-review-history/entities/result-review-history.entity';
import { ResultStatusData } from '../../../../shared/constants/result-status.enum';
import { RoleByUserRepository } from '../../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultsCenterRepository } from '../../results-centers/results-centers.repository';
import { ResultRepository } from '../../result.repository';
import { TemplateRepository } from '../../../platform-report/repositories/template.repository';
import { GlobalParameterRepository } from '../../../global-parameter/repositories/global-parameter.repository';
import { UserNotificationSettingRepository } from '../../../user-notification-settings/user-notification-settings.repository';
import { UserRepository } from '../../../../auth/modules/user/repositories/user.repository';
import { EmailNotificationManagementService } from '../../../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { NotificationService } from '../../../notification/notification.service';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from '../../../notification/enum/notification.enum';
import { env } from 'node:process';
import Handlebars from 'handlebars';
// `PNS-T-2` rework attempt 2 (Reviewer FAIL) — `BilateralService` already injects this module
// (`bilateral.service.ts` → `_primaryProgramRequestService`, no `forwardRef`), so a **static,
// file-top-level** import of `bilateral.service.ts` here is a real import cycle at the Node/TS
// module-resolution level, not just at the NestJS module-graph level: `api/modules.routes.ts`
// loads `ResultsModule` (→ this file) before `BilateralModule` is ever reached, so when this file
// used to reach its `import { BilateralService } from ...` line, `bilateral.service.ts` started
// loading for the FIRST time and immediately required this file back — which was still mid
// top-to-bottom evaluation and had not yet defined `PrimaryProgramRequestService`. That bound
// `BilateralService`'s own `_primaryProgramRequestService` constructor param to `undefined` in
// `design:paramtypes`, which Nest cannot resolve (no `forwardRef` on that side) → boot crash. See
// `primary-program-request.load-order.spec.ts` for the reproduction/proof and
// `.agents/reviewer.md`'s FAIL report on this task for the full trace.
//
// `forwardRef` alone does not fix a STATIC top-level import — `forwardRef` only defers *when a
// decorator resolves its token*, not *when the module file itself is first `require`d*. The classic
// forwardRef dance needs both sides wrapped; the actually-safe fix for a one-directional runtime-only
// need (this file never needs `BilateralService` at the top level, only inside one method) is to
// never give it a static binding at all: `BilateralService` is loaded with a dynamic `import()`
// **inside** `announceIfPendingReview`, so Node never touches `bilateral.service.ts` while this file
// is mid-evaluation — only later, the first time `accept()` actually reaches that branch at
// runtime, long after every module in the app has finished loading. Under this project's
// `tsconfig.json` (`"module": "commonjs"`), TypeScript downlevels `import()` to
// `Promise.resolve().then(() => require(...))`, which keeps it genuinely deferred (not hoisted to
// a top-level `require` by the bundler) under both `ts-jest` and the Lambda/serverless-plugin-
// typescript build.

/** design.md §3.1: `request_status_id` values on a `share_result_request` row. */
const enum RequestStatusId {
  PENDING = 1,
  ACCEPTED = 2,
  DECLINED = 3,
  /** The bilateral contributor "draft" status (PSR-R-12) — saved, not yet a live request. */
  DRAFT = 4,
}

/**
 * Mirror of the private `BilateralCenterService.CONTRIBUTION_REQUEST_STATUSES` — a *contribution*
 * row in either of these statuses is "live enough to conflict" with an SP that just became (or is
 * about to become) the primary/the moved-to SP. Kept as a local copy (that field is private) rather
 * than imported, same reasoning T-2 already used for the alignment predicate.
 */
const CONTRIBUTION_ACTIVE_STATUSES = [
  RequestStatusId.PENDING,
  RequestStatusId.DRAFT,
];

export enum PrimaryRequestStateEnum {
  NONE = 'none',
  PENDING = 'pending',
  SENT_BACK = 'sent_back',
  ACCEPTED = 'accepted',
  /**
   * `PNS-R-1`/`PNS-DD-1` — a saved-but-not-sent primary choice (a `primary` row at status
   * DRAFT). Priority order (design.md §4): accepted > pending > draft > sent_back > none.
   */
  DRAFT = 'draft',
}

export interface PrimaryRequestState {
  state: PrimaryRequestStateEnum;
  program_code: string | null;
  declined_by_codes: string[];
}

export interface AlignedScienceProgram {
  initiativeId: number;
  programCode: string;
}

/**
 * Outcome of {@link PrimaryProgramRequestService.request}. `request()` never throws (requirements.md
 * §7 Reliability, PSR-R-1 "request step fails"); a 400-shaped rejection is distinguished from an
 * unexpected failure so the T-5 caller can surface the existing validation message for the former
 * and simply log+swallow the latter.
 */
export type PrimaryRequestOutcome =
  | { ok: true; shareResultRequestId: number }
  | { ok: false; reason: 'not_aligned'; message: string }
  | { ok: false; reason: 'internal_error' };

/**
 * `PSR-T-3` — outcome of {@link PrimaryProgramRequestService.accept} /
 * {@link PrimaryProgramRequestService.decline}. Never throws to the caller (design.md §5 items 2
 * and 3): `forbidden`/`conflict` map to 403/409 at T-4's controller boundary, same "return an
 * outcome instead of throwing" convention `request()` already set in T-2.
 */
export type PrimaryDecisionOutcome =
  | {
      ok: true;
      shareResultRequestId: number;
      state: 'accepted' | 'declined' | 'rejected';
    }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'forbidden' }
  | { ok: false; reason: 'conflict' }
  | { ok: false; reason: 'invalid_input' }
  | { ok: false; reason: 'internal_error' };

/**
 * `RRC-T-1` — outcome of {@link PrimaryProgramRequestService.transferPrimary}. The core throws on
 * any failure (it runs inside the caller's transaction, which must roll back), so there is no
 * `ok: false` arm: the result only says whether anything was written.
 */
export interface PrimaryTransferResult {
  /** `unchanged` — the named SP already owns the result: nothing was written (`RRC-R-10`, step 1). */
  outcome: 'unchanged' | 'transferred';
  /** The active role-1 owner before the call (`null` when the result had none). */
  previousInitiativeId: number | null;
}

/**
 * `PSR-T-2` (design.md §2.1, §5 items 1 and 8) — owns the pending "primary Science Program"
 * request lifecycle up to the point where it is accepted or declined (T-3/T-4 add those).
 *
 * This task implements:
 * - `request()` — P-7 alignment validation + DD-8 round cancellation + insert, never throwing.
 * - `stateFor()` — PSR-R-7 state derivation for the Center's on-hold / sent-back banner.
 * - `getAlignments()` — the alignment helper `request()` needs for P-7 validation.
 *
 * **Circular-import note (brief, "Pointers to existing code"):** the alignment rule (P-7) is only
 * reachable today through `BilateralProjectsService`
 * (`api/bilateral/services/bilateral-projects.service.ts`), but `bilateral.module.ts` already
 * imports `ShareResultRequestModule` — importing `BilateralModule`/`BilateralProjectsService` back
 * from here would be circular. Chosen option: read `clarisa_project_mappings`
 * (`ClarisaProjectMapping`) directly through a plain `TypeOrmModule.forFeature` repository (the same
 * pattern `ClarisaProjectsModule` already uses for `ClarisaCenter`, "BCT-T-2: ... no cycle"), and
 * resolve the program code to an initiative through the already-injected
 * `ClarisaInitiativesRepository`. Neither `clarisa-projects` nor `clarisa-initiatives` imports this
 * module or `bilateral`, so no cycle. The mapping filter itself (`programCode` present, `allocation
 * > 0`, `status === 'Confirmed'`) and the code→initiative resolution (`official_code` matched
 * case-insensitively against an ACTIVE initiative) are copied verbatim from
 * `bilateral-projects.service.ts:396-414` and `bilateral-center.service.ts:216-231`
 * (`updatePrimaryAssignment`) respectively — not re-invented.
 */
@Injectable()
export class PrimaryProgramRequestService {
  private readonly logger = new Logger(PrimaryProgramRequestService.name);

  /** requirements.md PSR-R-3 — the exact message `updatePrimaryAssignment` already uses today. */
  static readonly NOT_ALIGNED_MESSAGE =
    'The selected primary Science Program is not allocated to the selected project.';

  constructor(
    private readonly shareResultRequestRepository: ShareResultRequestRepository,
    private readonly clarisaInitiativesRepository: ClarisaInitiativesRepository,
    @InjectRepository(ResultsByProjects)
    private readonly resultsByProjectsRepository: Repository<ResultsByProjects>,
    @InjectRepository(ClarisaProjectMapping)
    private readonly clarisaProjectMappingRepository: Repository<ClarisaProjectMapping>,
    // `PSR-T-3` — every dependency below is already a provider of `ShareResultRequestModule`
    // (`ShareResultRequestService` injects the same ones today), so none of this needed a module
    // change: see the class doc comment for why `ShareResultRequestService` itself is NOT one of
    // them (forward-pointer: T-4 will inject this service into it — injecting it back here would
    // be a real constructor cycle).
    private readonly roleByUserRepository: RoleByUserRepository,
    private readonly resultsCenterRepository: ResultsCenterRepository,
    private readonly resultRepository: ResultRepository,
    private readonly templateRepository: TemplateRepository,
    private readonly globalParameterRepository: GlobalParameterRepository,
    private readonly userNotificationSettingRepository: UserNotificationSettingRepository,
    private readonly userRepository: UserRepository,
    private readonly emailNotificationManagementService: EmailNotificationManagementService,
    // Defect A (T-3 follow-up fix, Leader-verified boot-time DI crash): `NotificationService` sits
    // behind the same import cycle `ShareResultRequestService` already documents
    // (`share-result-request.service.ts` ~L91-103) — `notification.module.ts` imports
    // `ShareResultRequestModule` for one method, and this module forwardRef-imports
    // `NotificationModule` back (`share-result-request.module.ts` L85-91). Loading `AppModule`
    // first (the real app load order) resolves `NotificationService` to `undefined` at decoration
    // time without `forwardRef` here, crashing Nest's DI container at boot.
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    // `PNS-T-2` (design.md §5 item 9, P-7) — lazy lookup only, resolved inside `accept()`; never
    // a constructor-decorated dependency, so no `forwardRef` is needed here (see the
    // `BilateralService` import comment above).
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * `PSR-R-1`/`PSR-R-2`/DD-8 — validates the SP against the lead project's alignments (P-7),
   * cancels the active pending/declined round on a **Center** re-pick, and inserts the new
   * pending row. Idempotent for the same SP (re-saving the currently pending SP creates no
   * second row).
   *
   * The DD-8 round cancellation always runs on a Center re-pick (`PSR-R-2`) — the auto-move this
   * once supported (T-3's decline moving ownership to "the other SP") was removed in `PDR-T-1`:
   * `decline()` no longer re-invokes `request()`, so there is no caller left that needs to skip
   * the cancel.
   *
   * Never throws: every failure path returns `{ ok: false, ... }`. `manager`, when given, makes
   * the `share_result_request` reads/writes participate in the caller's transaction (the CLARISA
   * alignment reads are read-only lookups and stay off it, matching how other services here treat
   * catalogue reads).
   *
   * `opts.asDraft` (`PNS-R-1`/`PNS-DD-1`, design.md §5 item 1) — when `true`, inserts status
   * DRAFT (4) instead of PENDING (1): the Center's choice is saved but not sent (no actionable
   * inbox row for the SP, `PNS-R-1`). The idempotency check below matches an active round row of
   * the SAME status being requested (DRAFT when `asDraft`, PENDING otherwise), so re-saving the
   * same SP while still a draft creates no second row, exactly like re-saving a pending SP today.
   * The DD-8 round-cancel set (on an actual Center re-pick) also deactivates an active DRAFT row —
   * changing the saved choice from SP09 to SP12 must leave no active SP09 draft — never a
   * CONTRIBUTOR draft (`activeRows` is already scoped to `request_type = primary`).
   */
  async request(
    resultId: number,
    spInitiativeId: number,
    user: TokenDto,
    manager?: EntityManager,
    opts?: { asDraft?: boolean },
  ): Promise<PrimaryRequestOutcome> {
    // @akili-spec notifications/primary-notify-on-submit
    const asDraft = opts?.asDraft ?? false;
    const targetStatus = asDraft
      ? RequestStatusId.DRAFT
      : RequestStatusId.PENDING;
    try {
      // T-5 review finding: when `manager` is given, EVERY read below must go through it, not
      // through the plain injected repositories — otherwise a caller in the same transaction
      // (e.g. `updatePrimaryAssignment`, which just wrote the lead project row) would validate
      // alignment against the pre-transaction, stale lead project / mappings and wrongly reject.
      const leadProjectId = await this.findLeadProjectId(resultId, manager);
      const aligned = leadProjectId
        ? await this.isAligned(leadProjectId, spInitiativeId, manager)
        : false;

      if (!aligned) {
        this.logger.warn(
          `PrimaryProgramRequestService.request: SP ${spInitiativeId} is not an alignment of result ${resultId}'s lead project`,
        );
        return {
          ok: false,
          reason: 'not_aligned',
          message: PrimaryProgramRequestService.NOT_ALIGNED_MESSAGE,
        };
      }

      const repo = this.repoFor(manager);

      const activeRows = await repo.find({
        where: {
          result_id: resultId,
          request_type: RequestTypeEnum.PRIMARY,
          is_active: true,
        },
      });

      const pendingRow = activeRows.find(
        (row) => row.request_status_id === targetStatus,
      );

      // Idempotent: re-saving the SP that is already the target round's row (PENDING, or DRAFT
      // when `asDraft`) creates no second row (requirements.md PSR-R-2 / PNS-R-1 "re-saving the
      // same SP MUST NOT create a second request/duplicate").
      if (pendingRow && pendingRow.shared_inititiative_id === spInitiativeId) {
        return {
          ok: true,
          shareResultRequestId: pendingRow.share_result_request_id,
        };
      }

      // `PSR-T-5` rework attempt 2 — Reviewer FAIL remediation (a): a result that already has an
      // active PENDING round for this SAME SP (e.g. a legacy-PENDING result created before this
      // feature, or any result whose round was already sent) must keep that PENDING row untouched
      // when `asDraft` is requested — never turn it into a DRAFT (requirements.md §7
      // Compatibility "stay pending"; PNS-R-1 "re-saving the same SP MUST NOT create a second
      // saved choice"). Only reachable when `asDraft` is true and the SP differs from
      // `targetStatus`'s own match above (DRAFT never equals PENDING, so this never double-fires
      // with the check above).
      if (asDraft) {
        const activePendingRow = activeRows.find(
          (row) => row.request_status_id === RequestStatusId.PENDING,
        );
        if (
          activePendingRow &&
          activePendingRow.shared_inititiative_id === spInitiativeId
        ) {
          return {
            ok: true,
            shareResultRequestId: activePendingRow.share_result_request_id,
          };
        }
      }

      // DD-8 — cancel the current round on every Center pick: every active PENDING/DECLINED/DRAFT
      // row (not an ACCEPTED owner row — that one is only replaced at accept-time, by T-4, per
      // DD-4's swap rule). `PNS-DD-1`: a DRAFT round row is cancelled the same way a PENDING one
      // is — changing the saved choice (SP09 → SP12) must leave no active SP09 draft.
      const roundRowIds = activeRows
        .filter(
          (row) =>
            row.request_status_id === RequestStatusId.PENDING ||
            row.request_status_id === RequestStatusId.DECLINED ||
            row.request_status_id === RequestStatusId.DRAFT,
        )
        .map((row) => row.share_result_request_id);

      if (roundRowIds.length) {
        // Forward pointer (PSR-T-1 attempt-1 advisory 2): never `save()` a partially selected
        // `ShareResultRequest` — `update()` with explicit columns only.
        await repo.update(
          { share_result_request_id: In(roundRowIds) },
          { is_active: false },
        );
      }

      const insertResult = await repo.insert({
        result_id: resultId,
        request_type: RequestTypeEnum.PRIMARY,
        shared_inititiative_id: spInitiativeId,
        // design.md §3.1: "shared_inititiative_id = owner_initiative_id = requested SP" — DD-5's
        // null owner is for CONTRIBUTOR drafts saved while there's no primary yet, not for this
        // row itself.
        owner_initiative_id: spInitiativeId,
        requester_initiative_id: null,
        // The requested SP is the one that decides this request's outcome by accepting/declining.
        approving_inititiative_id: spInitiativeId,
        request_status_id: targetStatus,
        is_active: true,
        is_map_to_toc: false,
        from_toc: false,
        requested_by: user.id,
      });

      const newId = insertResult.identifiers?.[0]
        ?.share_result_request_id as number;
      return { ok: true, shareResultRequestId: newId };
    } catch (error) {
      // requirements.md §7 Reliability + .cursorrules: ids only, no names/emails/secrets.
      this.logger.warn(
        `PrimaryProgramRequestService.request failed (resultId=${resultId}, spInitiativeId=${spInitiativeId}): ${
          error?.message ?? error
        }`,
      );
      return { ok: false, reason: 'internal_error' };
    }
  }

  /**
   * `PSR-R-7` — state derivation for the Center's on-hold / sent-back banner and for the ToC
   * section's "no owner yet" guard. Reads only the current round (active `primary` rows):
   * ACCEPTED beats PENDING beats a round of DECLINED rows beats NONE, because an accepted row
   * means there IS an owner even while a swap request is separately pending (DD-4) — that swap
   * is surfaced elsewhere (assertSubmittable, T-6), not through this state.
   */
  async stateFor(resultId: number): Promise<PrimaryRequestState> {
    const rows = await this.shareResultRequestRepository.find({
      where: {
        result_id: resultId,
        request_type: RequestTypeEnum.PRIMARY,
        is_active: true,
      },
    });

    if (!rows.length) {
      return this.emptyState();
    }

    const accepted = rows.find(
      (row) => row.request_status_id === RequestStatusId.ACCEPTED,
    );
    if (accepted) {
      return {
        state: PrimaryRequestStateEnum.ACCEPTED,
        program_code: await this.resolveOfficialCode(
          accepted.shared_inititiative_id,
        ),
        declined_by_codes: [],
      };
    }

    const pending = rows.find(
      (row) => row.request_status_id === RequestStatusId.PENDING,
    );
    if (pending) {
      return {
        state: PrimaryRequestStateEnum.PENDING,
        program_code: await this.resolveOfficialCode(
          pending.shared_inititiative_id,
        ),
        declined_by_codes: [],
      };
    }

    // `PNS-R-1`/design.md §4 — priority accepted > pending > draft > sent_back > none: a saved,
    // not-yet-sent choice outranks a stale sent_back round from a previous cycle.
    // @akili-spec notifications/primary-notify-on-submit
    const draft = rows.find(
      (row) => row.request_status_id === RequestStatusId.DRAFT,
    );
    if (draft) {
      return {
        state: PrimaryRequestStateEnum.DRAFT,
        program_code: await this.resolveOfficialCode(
          draft.shared_inititiative_id,
        ),
        declined_by_codes: [],
      };
    }

    const declined = rows.filter(
      (row) => row.request_status_id === RequestStatusId.DECLINED,
    );
    if (declined.length) {
      const codes = await Promise.all(
        declined.map((row) =>
          this.resolveOfficialCode(row.shared_inititiative_id),
        ),
      );
      return {
        state: PrimaryRequestStateEnum.SENT_BACK,
        program_code: null,
        declined_by_codes: codes.filter((code): code is string => !!code),
      };
    }

    return this.emptyState();
  }

  /**
   * `PSR-T-6` — the pending `primary` row for a result, if one exists: design.md §5 item 7's
   * `assertSubmittable` swap guard ("an active `primary` row with status 1 exists for this
   * result") needs exactly this, and `syncContributingPrograms` (T-6, design.md §5 item 5,
   * "exclude the pending/owner SP") needs the SAME SP excluded from the contributor list while
   * its primary request is still pending — a result can't ask an SP to be both primary AND a
   * contributor at once. One query, two callers; returns the pending row's
   * `shared_inititiative_id`, or `null` when there is no pending round.
   */
  async findPendingPrimaryInitiativeId(
    resultId: number,
    manager?: EntityManager,
  ): Promise<number | null> {
    const repo = this.repoFor(manager);
    const pending = await repo.findOne({
      where: {
        result_id: resultId,
        request_type: RequestTypeEnum.PRIMARY,
        request_status_id: RequestStatusId.PENDING,
        is_active: true,
      },
    });
    return pending?.shared_inititiative_id ?? null;
  }

  /**
   * `PNS-T-1` (design.md §5 item 4) — mirror of {@link findPendingPrimaryInitiativeId} for the
   * saved-but-not-sent DRAFT round: `assertSubmittable` (T-2) needs it to allow an ownerless
   * submit, and the contributor exclusion (`bilateral-center.service.ts` `syncContributingPrograms`)
   * needs the SAME SP excluded from the contributor list while its primary choice is only a draft
   * — a result can't ask an SP to be both the (not-yet-sent) primary AND a contributor at once.
   *
   * @akili-spec notifications/primary-notify-on-submit
   */
  async findDraftPrimaryInitiativeId(
    resultId: number,
    manager?: EntityManager,
  ): Promise<number | null> {
    const repo = this.repoFor(manager);
    const draft = await repo.findOne({
      where: {
        result_id: resultId,
        request_type: RequestTypeEnum.PRIMARY,
        request_status_id: RequestStatusId.DRAFT,
        is_active: true,
      },
    });
    return draft?.shared_inititiative_id ?? null;
  }

  /**
   * `PNS-T-2` (design.md §5 item 8, `PNS-DD-2`) — flips the saved-but-not-sent DRAFT primary
   * round to PENDING, **inside the caller's submit transaction**: `BilateralCenterService
   * .submitForReview` passes its transaction `manager` so this write is atomic with the
   * result's status move to Pending Review (`PNS-R-2` "the whole submit MUST fail" scenario).
   *
   * Throws (does not return an outcome object, unlike {@link request}) on any failure — 0 rows
   * affected (no active DRAFT primary row for this result, which `assertSubmittable` should
   * already have ruled out, or a race that cancelled it between the guard and the submit) or a
   * query error — so the caller's transaction callback rejects and the whole submit rolls back.
   *
   * `manager` is required (not optional like `request()`'s): this method only exists to run
   * inside a transaction; a caller without one should not reach it.
   *
   * @akili-spec notifications/primary-notify-on-submit
   */
  async sendDraft(resultId: number, manager: EntityManager): Promise<void> {
    const repo = manager.getRepository(ShareResultRequest);
    const result = await repo.update(
      {
        result_id: resultId,
        request_type: RequestTypeEnum.PRIMARY,
        request_status_id: RequestStatusId.DRAFT,
        is_active: true,
      },
      { request_status_id: RequestStatusId.PENDING },
    );
    if (!result.affected) {
      throw new Error(
        `PrimaryProgramRequestService.sendDraft: no active DRAFT primary row found for result ${resultId}`,
      );
    }
  }

  /**
   * P-7 — the lead project's SP alignments: `clarisa_project_mappings` rows with a `programCode`,
   * `allocation > 0` and `status === 'Confirmed'` (copied from `hasProgramMapping`/
   * `reportableMappings`, `bilateral-projects.service.ts:396-414`), resolved to an initiative id
   * the same way `updatePrimaryAssignment` does (`official_code` matched case-insensitively
   * against an ACTIVE initiative, `bilateral-center.service.ts:221-231`). Deduplicated by
   * initiative id. A mapping whose code resolves to no CLARISA initiative row is dropped (it
   * cannot be requested — there is no initiative id to write).
   *
   * `manager`, when given, routes BOTH reads through the caller's transaction (T-5 review
   * finding on `request()`): a caller who just wrote the lead project or a mapping in that same
   * transaction must see its own write, not the pre-transaction, committed state.
   */
  async getAlignments(
    leadProjectId: number,
    manager?: EntityManager,
  ): Promise<AlignedScienceProgram[]> {
    if (!leadProjectId) return [];

    const mappingRepo = manager
      ? manager.getRepository(ClarisaProjectMapping)
      : this.clarisaProjectMappingRepository;
    const mappings = await mappingRepo.find({
      where: { projectId: leadProjectId },
    });

    const reportableCodes = new Set<string>();
    for (const mapping of mappings) {
      const code = mapping.programCode?.trim();
      if (
        code &&
        Number(mapping.allocation) > 0 &&
        (mapping.status?.trim() ?? '') === 'Confirmed'
      ) {
        reportableCodes.add(code.toUpperCase());
      }
    }

    if (!reportableCodes.size) return [];

    // `official_code` is matched verbatim against the already-uppercased code, the same
    // assumption `bilateral-center.service.ts` (`updatePrimaryAssignment`) makes — it queries
    // with `.trim().toUpperCase()` on the input side only, never folding the stored column.
    const initiativeRepo = manager
      ? manager.getRepository(ClarisaInitiative)
      : this.clarisaInitiativesRepository;
    const initiatives = await initiativeRepo.find({
      where: { official_code: In([...reportableCodes]), active: true },
    });

    const result: AlignedScienceProgram[] = [];
    const seen = new Set<number>();
    for (const initiative of initiatives) {
      const code = initiative.official_code?.trim().toUpperCase();
      if (code && reportableCodes.has(code) && !seen.has(initiative.id)) {
        seen.add(initiative.id);
        result.push({ initiativeId: initiative.id, programCode: code });
      }
    }
    return result;
  }

  /** P-7 — is `spInitiativeId` one of the lead project's alignments. */
  async isAligned(
    leadProjectId: number,
    spInitiativeId: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    const alignments = await this.getAlignments(leadProjectId, manager);
    return alignments.some(
      (alignment) => alignment.initiativeId === spInitiativeId,
    );
  }

  /**
   * `PSR-T-3` / `PSR-R-4` / `PSR-R-8` — accept a pending primary request. One transaction: the
   * request row is locked (`pessimistic_write`) and its status re-checked (409 if not PENDING,
   * design.md §5 item 2 — this is both the idempotency guard and the concurrency guard: a second
   * accept, or an accept racing a decline, finds the row already decided and changes nothing).
   * Authorization is `PSR-R-8` (a member of the requested SP, active `role_by_user` row, or a
   * platform admin) — enforced here, not left to the client (AC-3).
   *
   * On a genuine ownership change (no previous owner, or a different previous owner — DD-4 swap)
   * this runs the cleanups `updatePrimaryAssignment` used to run at *assignment* time (moved here
   * per DD-2/DD-4, git HEAD `bilateral-center.service.ts` L317-381 at the time of this task):
   * deactivate the old owner's role-1 row(s), clear a stray "accepted contributor" row for the new
   * owner (can't be both), clear a stale *contribution* request to the new owner, write/reactivate
   * role 1 for the new owner, and retire the old owner's ToC mapping. On a swap it additionally
   * retires the old owner's ACCEPTED `primary` row (forward pointer from the T-2 review — so two
   * active accepted rows never coexist).
   *
   * Then it seeds the ToC stub (moved from `bilateral.service.ts`
   * `populateInitiativeAndTocFromProgramCode`, git HEAD L4779-4797) and releases the contributor
   * drafts (`releaseContributors`, `PSR-R-12`). After commit — and only after commit — it emits the
   * Center "accepted" notice; a notice failure is caught and logged, never rolled back into the
   * already-committed accept (`PSR-R-14`, requirements.md §7 Reliability).
   */
  async accept(
    requestId: number,
    user: TokenDto,
  ): Promise<PrimaryDecisionOutcome> {
    let accepted: { resultId: number; spInitiativeId: number } | null = null;

    try {
      const outcome =
        await this.shareResultRequestRepository.manager.transaction(
          async (manager): Promise<PrimaryDecisionOutcome> => {
            const requestRepo = manager.getRepository(ShareResultRequest);

            // Defect B (T-3 follow-up, Reviewer finding on T-4): `is_active: true` makes a
            // cancelled row's PENDING status unreachable here, the same way the T-4 endpoint
            // already 409s it (PSR-R-2 "no longer actionable", PSR-R-8, defense in depth). A
            // missing row and a cancelled row are now indistinguishable at this query — both
            // resolve to `null` — and both get the SAME outcome as today's non-pending path
            // (`conflict`, the 409 "already answered" message), per the Leader's explicit call.
            const row = await requestRepo.findOne({
              where: {
                share_result_request_id: requestId,
                request_type: RequestTypeEnum.PRIMARY,
                is_active: true,
              },
              lock: { mode: 'pessimistic_write' },
            });

            if (!row) {
              return { ok: false, reason: 'conflict' };
            }

            const authorized = await this.isAuthorized(
              user.id,
              row.shared_inititiative_id,
            );
            if (!authorized) {
              return { ok: false, reason: 'forbidden' };
            }

            if (row.request_status_id !== RequestStatusId.PENDING) {
              return { ok: false, reason: 'conflict' };
            }

            const resultId = row.result_id;
            const nextPrimaryId = row.shared_inititiative_id;

            // `RRC-T-1` — the ownership writes below were extracted, verbatim and in the same
            // order, into helpers `transferPrimary` shares (`RRC-R-17`). What stays here is what is
            // specific to a request round: the swap's old accepted row, the decision on THIS row.
            const { activePrimaryRows, currentPrimaryId } =
              await this.loadActiveOwner(manager, resultId);
            const isSwap =
              currentPrimaryId > 0 && currentPrimaryId !== nextPrimaryId;

            if (currentPrimaryId !== nextPrimaryId) {
              await this.writeOwnershipChange(
                manager,
                resultId,
                nextPrimaryId,
                currentPrimaryId,
                activePrimaryRows,
                user.id,
              );
            }

            if (isSwap) {
              await requestRepo.update(
                {
                  result_id: resultId,
                  request_type: RequestTypeEnum.PRIMARY,
                  shared_inititiative_id: currentPrimaryId,
                  request_status_id: RequestStatusId.ACCEPTED,
                  is_active: true,
                },
                { is_active: false },
              );
            }

            await requestRepo.update(
              { share_result_request_id: row.share_result_request_id },
              {
                request_status_id: RequestStatusId.ACCEPTED,
                approved_by: user.id,
                aprovaed_date: new Date(),
              },
            );

            await this.seedTocStub(manager, resultId, nextPrimaryId, user.id);

            await this.releaseContributors(resultId, manager);

            accepted = { resultId, spInitiativeId: nextPrimaryId };
            return {
              ok: true,
              shareResultRequestId: row.share_result_request_id,
              state: 'accepted',
            };
          },
        );

      if (outcome.ok && accepted) {
        const spCode = await this.resolveOfficialCode(accepted.spInitiativeId);
        await this.emitCenterNotice(
          accepted.resultId,
          NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_ACCEPTED,
          user.id,
          `${spCode ?? 'The Science Program'} accepted to be the primary Science Program of this result. Click to see the result.`,
        );

        // `PNS-R-3`/`PNS-DD-3` — a result that reached Pending Review ownerless (`PNS-R-2`) had
        // its submitted/contributor-tagging notices deferred because no owner existed yet; now
        // one does. Only fires when the result is ALREADY Pending Review (the normal PSR
        // flow — accept on an Editing result, swap acceptance — never announces here; a
        // subsequent Submit still runs its own `announcePendingReview`, so this never doubles
        // up with it, `BUT` "no duplicates").
        await this.announceIfPendingReview(accepted.resultId, user.id);
      }

      return outcome;
    } catch (error) {
      this.logger.warn(
        `PrimaryProgramRequestService.accept failed (requestId=${requestId}): ${
          error?.message ?? error
        }`,
      );
      return { ok: false, reason: 'internal_error' };
    }
  }

  /**
   * `RRC-T-1` (bilateral/rejected-result-correction, design.md §8.2, `RRC-DD-3`; `RRC-R-10`,
   * `RRC-R-17`) — **direct** primary transfer: the named SP becomes the result's primary at once,
   * with no request round, no acceptance, and nothing sent to anyone. It is `accept()`'s
   * ownership write block extracted (`writeOwnershipChange` + `seedTocStub`, the SAME code
   * `accept()` now calls), plus the `primary` request rows `stateFor` reads (`RRC-DD-3`).
   *
   * Runs **inside the caller's transaction** (`manager` is required), after the caller has locked
   * the `Result` row — the core itself never locks, never opens a transaction, and **throws** on
   * any failure so the caller's transaction rolls back (`RRC-R-10` data integrity). Callers:
   * `updatePrimaryAssignment` on a Rejected result (`releaseContributors: false`, `RRC-DD-5`) and
   * the API resubmission (`releaseContributors: true`, the result is sent at once, `RRC-DD-7`).
   *
   * 1. The named SP already owns the result → `unchanged`, nothing written.
   * 2. `writeOwnershipChange` (old role 1 off; stray accepted-contributor row and stale contribution
   *    request of the new SP off; new role 1 written or reactivated; old ToC mapping retired) and
   *    `seedTocStub` — in the order `accept()` runs them.
   * 3. Every active `primary` request row of the result is retired and ONE ACCEPTED row is written
   *    for the new SP (requested and decided by `user`). Without it `stateFor` (accepted > pending)
   *    would report `none` for the new owner — a Rejected result has no active `primary` row,
   *    because a rejection deactivates them all (`RRC-P-6`, `RRC-P-10`) — and two accepted rows
   *    must never stay active together.
   * 4. `releaseContributors` runs only when the flag says so.
   *
   * Emits **no** notice and does **not** call `announceIfPendingReview`: the caller announces
   * (the in-app path at its submit, the API path after its commit).
   */
  async transferPrimary(
    resultId: number,
    newInitiativeId: number,
    user: TokenDto,
    manager: EntityManager,
    opts: { releaseContributors: boolean },
  ): Promise<PrimaryTransferResult> {
    const { activePrimaryRows, currentPrimaryId } = await this.loadActiveOwner(
      manager,
      resultId,
    );
    const previousInitiativeId = currentPrimaryId > 0 ? currentPrimaryId : null;

    if (currentPrimaryId === newInitiativeId) {
      return { outcome: 'unchanged', previousInitiativeId };
    }

    await this.writeOwnershipChange(
      manager,
      resultId,
      newInitiativeId,
      currentPrimaryId,
      activePrimaryRows,
      user.id,
    );
    await this.seedTocStub(manager, resultId, newInitiativeId, user.id);

    // `RRC-DD-3` — one coherent `primary` row: retire the whole current round (the old owner's
    // accepted row, a declined or pending one), then record the transfer as an ACCEPTED row.
    const requestRepo = manager.getRepository(ShareResultRequest);
    await requestRepo.update(
      {
        result_id: resultId,
        request_type: RequestTypeEnum.PRIMARY,
        is_active: true,
      },
      { is_active: false },
    );
    await requestRepo.insert({
      result_id: resultId,
      request_type: RequestTypeEnum.PRIMARY,
      shared_inititiative_id: newInitiativeId,
      owner_initiative_id: newInitiativeId,
      requester_initiative_id: null,
      approving_inititiative_id: newInitiativeId,
      request_status_id: RequestStatusId.ACCEPTED,
      is_active: true,
      is_map_to_toc: false,
      from_toc: false,
      requested_by: user.id,
      approved_by: user.id,
      aprovaed_date: new Date(),
    });

    if (opts.releaseContributors) {
      await this.releaseContributors(resultId, manager);
    }

    return { outcome: 'transferred', previousInitiativeId };
  }

  /**
   * `RRC-T-1` — the result's active role-1 row(s) and the initiative they name (`0` when it has no
   * owner). Shared by `accept()` and {@link transferPrimary}; moved out of `accept()` unchanged.
   */
  private async loadActiveOwner(
    manager: EntityManager,
    resultId: number,
  ): Promise<{
    activePrimaryRows: ResultsByInititiative[];
    currentPrimaryId: number;
  }> {
    const initiativeRepo = manager.getRepository(ResultsByInititiative);
    const activePrimaryRows = await initiativeRepo.find({
      where: {
        result_id: resultId,
        initiative_role_id: 1,
        is_active: true,
      },
    });
    const currentPrimaryId = Number(activePrimaryRows[0]?.initiative_id ?? 0);
    return { activePrimaryRows, currentPrimaryId };
  }

  /**
   * `RRC-T-1` / `RRC-R-17` — the ownership writes `accept()` runs on a **genuine change** of owner
   * (no previous owner, or a different one), extracted verbatim and in the same order so both
   * `accept()` and {@link transferPrimary} run one block: deactivate the old owner's role-1
   * row(s), clear a stray "accepted contributor" row for the new owner (it can't be both), clear
   * a stale *contribution* request to the new owner, write/reactivate role 1 for the new owner,
   * and retire the old owner's ToC mapping. The caller decides whether it is a genuine change.
   */
  private async writeOwnershipChange(
    manager: EntityManager,
    resultId: number,
    nextPrimaryId: number,
    currentPrimaryId: number,
    activePrimaryRows: ResultsByInititiative[],
    userId: number,
  ): Promise<void> {
    const requestRepo = manager.getRepository(ShareResultRequest);
    const initiativeRepo = manager.getRepository(ResultsByInititiative);

    for (const oldOwnerRow of activePrimaryRows) {
      await initiativeRepo.update(oldOwnerRow.id, {
        is_active: false,
        last_updated_by: userId,
      });
    }

    // An initiative cannot be both the owner and an accepted contributor.
    await initiativeRepo.update(
      {
        result_id: resultId,
        initiative_id: nextPrimaryId,
        initiative_role_id: 2,
        is_active: true,
      },
      { is_active: false, last_updated_by: userId },
    );

    // Forward pointer (T-2 attempt-2 advisory): filtered on `request_type` so this can
    // never touch the very `primary` row being accepted right here (its owner and shared
    // columns are also both `nextPrimaryId`).
    await requestRepo.update(
      {
        result_id: resultId,
        request_type: RequestTypeEnum.CONTRIBUTION,
        shared_inititiative_id: nextPrimaryId,
        is_active: true,
        is_map_to_toc: false,
        request_status_id: In(CONTRIBUTION_ACTIVE_STATUSES),
      },
      { is_active: false },
    );

    const formerPrimaryRow = await initiativeRepo.findOne({
      where: {
        result_id: resultId,
        initiative_id: nextPrimaryId,
        initiative_role_id: 1,
      },
    });
    if (formerPrimaryRow) {
      await initiativeRepo.update(formerPrimaryRow.id, {
        is_active: true,
        last_updated_by: userId,
      });
    } else {
      await initiativeRepo.save({
        result_id: resultId,
        initiative_id: nextPrimaryId,
        initiative_role_id: 1,
        is_active: true,
        from_toc: false,
        created_by: userId,
      });
    }

    // ToC mappings belong to their primary initiative — don't carry one into a different
    // Science Program.
    if (currentPrimaryId > 0) {
      const tocRepoForClear = manager.getRepository(ResultsTocResult);
      await tocRepoForClear.update(
        {
          result_id: resultId,
          initiative_ids: currentPrimaryId,
          is_active: true,
        },
        { is_active: false, last_updated_by: userId },
      );
    }
  }

  /**
   * Moved from `populateInitiativeAndTocFromProgramCode` (`PSR` design.md §5 item 2, DD-3): the
   * stub ToC row is keyed on the primary SP, so it can only be written once the SP is known and
   * has taken ownership. Extracted from `accept()` unchanged by `RRC-T-1`; idempotent (no second
   * stub when the SP already has an active ToC row).
   */
  private async seedTocStub(
    manager: EntityManager,
    resultId: number,
    nextPrimaryId: number,
    userId: number,
  ): Promise<void> {
    const tocRepo = manager.getRepository(ResultsTocResult);
    const existingToc = await tocRepo.findOne({
      where: {
        result_id: resultId,
        initiative_ids: nextPrimaryId,
        is_active: true,
      },
    });
    if (!existingToc) {
      await tocRepo.save({
        created_by: userId,
        toc_result_id: null,
        initiative_ids: nextPrimaryId,
        result_id: resultId,
        toc_level_id: null,
        planned_result: true,
        is_active: true,
      });
    }
  }

  /**
   * `PDR-T-1` (requirements.md `PDR-R-3`..`R-7`, design.md §7.1) — decline a pending primary
   * request. Same lock + status re-check + authorization as {@link accept}. The declined row is
   * set to status 3 and left **active** (`PDR-R-11` — the SP's inbox needs it visible as
   * Declined).
   *
   * `justification` is trimmed and MUST NOT be blank: a blank justification returns
   * `invalid_input` **before** the transaction opens — no repository write happens (`PDR-R-3`).
   *
   * **No auto-move, ever** (`PDR-R-5` — removes the old `PSR-R-5`/`PSR-R-6` two/three-alignment
   * rules in full; see design.md §10.1 reversion challenge for what this removal was checked
   * against).
   *
   * - **Swap** (an active role-1 owner already exists, `PDR-R-7`): the owner and the result's
   *   status are left untouched; no `Result`/`ResultReviewHistory` write. Outcome `declined`.
   * - **Ownerless** (`PDR-R-4`, `DD-1`/`DD-2`): in the SAME transaction `manager` — mirroring the
   *   review-reject data shape (`results.service.ts` `reviewBilateralResult`, design.md §2) —
   *   `Result.status_id` → Rejected (7) with `reviewed_by`/`reviewed_at`; one `ResultReviewHistory`
   *   row (`REJECT`, `initiative_id` = the declining SP, comment prefixed with the declining SP's code, `created_by` the decliner);
   *   every active pending/draft **contribution** row of the result is deactivated (`PDR-R-4`
   *   item 4, `PDR-R-6`). The primary row itself is NOT deactivated (`DD-2`) — only contribution
   *   rows. Outcome `rejected`.
   *
   * Center notice (ownerless or swap text, `PDR-R-10`) is emitted after commit, never blocking or
   * rolling back the decline itself — `emitCenterNotice` already swallows its own errors.
   *
   * The justification text MUST NOT appear in any log line (`.cursorrules`, `PDR-R-3` §7 NFR
   * Security) — only ids are logged on the `catch` warn below.
   */
  async decline(
    requestId: number,
    user: TokenDto,
    justification: string,
  ): Promise<PrimaryDecisionOutcome> {
    const trimmedJustification = justification?.trim();
    if (!trimmedJustification) {
      return { ok: false, reason: 'invalid_input' };
    }

    let notice:
      | {
          resultId: number;
          kind: 'rejected';
          spInitiativeId: number;
        }
      | {
          resultId: number;
          kind: 'swap';
          spInitiativeId: number;
          ownerInitiativeId: number;
        }
      | null = null;

    try {
      const outcome =
        await this.shareResultRequestRepository.manager.transaction(
          async (manager): Promise<PrimaryDecisionOutcome> => {
            const requestRepo = manager.getRepository(ShareResultRequest);

            // Defect B (T-3 follow-up, Reviewer finding on T-4) — same reasoning as `accept()`'s
            // doc comment just above its own `findOne`: `is_active: true` closes the service-level
            // gap, collapsing "missing" and "cancelled" into the same `conflict` outcome.
            const row = await requestRepo.findOne({
              where: {
                share_result_request_id: requestId,
                request_type: RequestTypeEnum.PRIMARY,
                is_active: true,
              },
              lock: { mode: 'pessimistic_write' },
            });

            if (!row) {
              return { ok: false, reason: 'conflict' };
            }

            const authorized = await this.isAuthorized(
              user.id,
              row.shared_inititiative_id,
            );
            if (!authorized) {
              return { ok: false, reason: 'forbidden' };
            }

            if (row.request_status_id !== RequestStatusId.PENDING) {
              return { ok: false, reason: 'conflict' };
            }

            const resultId = row.result_id;
            const declinedInitiativeId = row.shared_inititiative_id;

            // "kept active" (`PDR-R-11`) — the SP's inbox needs this row visible as Declined.
            await requestRepo.update(
              { share_result_request_id: row.share_result_request_id },
              {
                request_status_id: RequestStatusId.DECLINED,
                approved_by: user.id,
                aprovaed_date: new Date(),
              },
            );

            // `PDR-R-7` swap — an active role-1 owner already exists: the owner stays, the
            // result's status is untouched, no Result/history write.
            const initiativeRepo = manager.getRepository(ResultsByInititiative);
            const ownerRow = await initiativeRepo.findOne({
              where: {
                result_id: resultId,
                initiative_role_id: 1,
                is_active: true,
              },
            });

            if (ownerRow) {
              notice = {
                resultId,
                kind: 'swap',
                spInitiativeId: declinedInitiativeId,
                ownerInitiativeId: ownerRow.initiative_id,
              };
              return {
                ok: true,
                shareResultRequestId: row.share_result_request_id,
                state: 'declined',
              };
            }

            // `PDR-R-4` ownerless — the result is rejected. Same transaction `manager`,
            // same write shape as the review reject (`results.service.ts reviewBilateralResult`,
            // `PDR-P-2`/`PDR-P-6`).
            const resultRepo = manager.getRepository(Result);
            await resultRepo.update(
              { id: resultId },
              {
                status_id: ResultStatusData.Rejected.value,
                reviewed_by: user.id,
                reviewed_at: new Date(),
              },
            );

            const declinedSpCode =
              await this.resolveOfficialCode(declinedInitiativeId);
            const historyRepo = manager.getRepository(ResultReviewHistory);
            await historyRepo.save(
              historyRepo.create({
                result_id: resultId,
                action: ReviewActionEnum.REJECT,
                initiative_id: declinedInitiativeId,
                comment: `${declinedSpCode ?? 'The Science Program'} declined to be the primary Science Program of this result: ${trimmedJustification}`,
                created_by: user.id,
              }),
            );

            // `PDR-R-4` item 4 / `PDR-R-6` — drop every pending/draft contribution request.
            await requestRepo.update(
              {
                result_id: resultId,
                request_type: RequestTypeEnum.CONTRIBUTION,
                request_status_id: In(CONTRIBUTION_ACTIVE_STATUSES),
                is_active: true,
              },
              { is_active: false },
            );

            notice = {
              resultId,
              kind: 'rejected',
              spInitiativeId: declinedInitiativeId,
            };
            return {
              ok: true,
              shareResultRequestId: row.share_result_request_id,
              state: 'rejected',
            };
          },
        );

      if (outcome.ok && notice) {
        if (notice.kind === 'rejected') {
          // design.md §11 — one line on the reject outcome, ids only, no justification text
          // (.cursorrules / PDR-R-3 §7 NFR Security). Logged right after commit, before the
          // notice emit, so it fires even if the Center notice below fails.
          this.logger.log(
            `PrimaryProgramRequestService.decline: result ${notice.resultId} rejected by primary decline (requestId=${requestId}, userId=${user.id})`,
          );
          const spCode = await this.resolveOfficialCode(notice.spInitiativeId);
          await this.emitCenterNotice(
            notice.resultId,
            NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
            user.id,
            `${spCode ?? 'The Science Program'} declined to be the primary Science Program of this result. The result was rejected. Reason: ${trimmedJustification}`,
          );
        } else {
          const [spCode, ownerCode] = await Promise.all([
            this.resolveOfficialCode(notice.spInitiativeId),
            this.resolveOfficialCode(notice.ownerInitiativeId),
          ]);
          await this.emitCenterNotice(
            notice.resultId,
            NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
            user.id,
            `${spCode ?? 'The Science Program'} declined to become the primary Science Program of this result. ${ownerCode ?? 'The current Science Program'} remains the primary. Reason: ${trimmedJustification}`,
          );
        }
      }

      return outcome;
    } catch (error) {
      // .cursorrules / PDR-R-3 §7 NFR Security: ids only — the justification never reaches a log
      // line, including this catch.
      this.logger.warn(
        `PrimaryProgramRequestService.decline failed (requestId=${requestId}): ${
          error?.message ?? error
        }`,
      );
      return { ok: false, reason: 'internal_error' };
    }
  }

  /**
   * `PSR-R-8` — Recipients of a request to `spInitiativeId`: an active `role_by_user` row on that
   * initiative (any role — mirrors `hasActiveRoleOnAnyInitiativeLinkedToResult`'s "any member"
   * reasoning), or a platform admin (`isUserAdmin`, P-8: role 1 with initiative/action_area/center
   * all null).
   */
  private async isAuthorized(
    userId: number,
    spInitiativeId: number,
  ): Promise<boolean> {
    if (await this.roleByUserRepository.isUserAdmin(userId)) {
      return true;
    }
    return this.roleByUserRepository.hasActiveRoleOnInitiative(
      userId,
      spInitiativeId,
    );
  }

  /**
   * `PSR-R-12` / design.md §5 item 4 — every active status-4 (draft) *contribution* row of the
   * result, excluding the owner itself, becomes a live pending request: owner filled, status 1,
   * today's per-request contribution email. Touches ONLY status-4 rows, which is what makes a
   * second call (re-save after accept, or accept racing a save) idempotent — an already-released
   * row is status 1 and the `where` no longer matches it.
   *
   * Resolves the owner itself (the active role-1 row) rather than taking it as a parameter, so
   * `syncContributingPrograms` (T-6) can call this the same way after saving contributor drafts
   * "on hold with no owner yet" (design §5 item 5) — it becomes a no-op automatically.
   */
  async releaseContributors(
    resultId: number,
    manager?: EntityManager,
  ): Promise<{ released: number }> {
    const txManager = manager ?? this.shareResultRequestRepository.manager;
    const requestRepo = txManager.getRepository(ShareResultRequest);
    const initiativeRepo = txManager.getRepository(ResultsByInititiative);

    const ownerRow = await initiativeRepo.findOne({
      where: { result_id: resultId, initiative_role_id: 1, is_active: true },
    });
    const ownerInitiativeId = ownerRow?.initiative_id ?? null;
    if (!ownerInitiativeId) {
      return { released: 0 };
    }

    const draftRows = await requestRepo.find({
      where: {
        result_id: resultId,
        request_type: RequestTypeEnum.CONTRIBUTION,
        request_status_id: RequestStatusId.DRAFT,
        is_active: true,
        shared_inititiative_id: Not(ownerInitiativeId),
      },
    });

    for (const row of draftRows) {
      await requestRepo.update(
        { share_result_request_id: row.share_result_request_id },
        {
          owner_initiative_id: ownerInitiativeId,
          request_status_id: RequestStatusId.PENDING,
        },
      );

      try {
        await this.sendContributorReleaseEmail(
          row,
          ownerInitiativeId,
          resultId,
        );
      } catch (error) {
        this.logger.warn(
          `releaseContributors: email failed for share_result_request ${row.share_result_request_id}: ${
            error?.message ?? error
          }`,
        );
      }
    }

    return { released: draftRows.length };
  }

  /**
   * `PSR-T-3` (Leader brief, "Contributor-release emails") — reuses today's per-request email
   * **content** (`EmailNotificationManagementService.buildEmailData`, a public method) with the
   * same recipients query `share-result-request.service.ts` uses (L387-425 at the time of this
   * task), but does NOT call into `ShareResultRequestService` itself: that service's own
   * `sendEmailsForShareRequests` is private, and injecting the service to reach it would create a
   * constructor cycle once T-4 injects `PrimaryProgramRequestService` into
   * `ShareResultRequestService` (T-2 review forward pointer). Least-bad option, as the brief
   * invited: duplicate the thin data-gathering glue (all of it plain repository reads already
   * provided by this module) rather than the templating logic itself, which stays centralized in
   * `EmailNotificationManagementService`.
   */
  private async sendContributorReleaseEmail(
    row: ShareResultRequest,
    ownerInitiativeId: number,
    resultId: number,
  ): Promise<void> {
    const [initOwner, result, initContributing, requester] = await Promise.all([
      this.clarisaInitiativesRepository.findOne({
        where: { id: ownerInitiativeId },
      }),
      this.resultRepository.findOne({ where: { id: resultId } }),
      this.clarisaInitiativesRepository.findOne({
        where: { id: row.shared_inititiative_id },
      }),
      this.userRepository.findOne({ where: { id: row.requested_by } }),
    ]);

    if (!initOwner || !result || !initContributing || !requester) {
      this.logger.warn(
        `releaseContributors: missing owner/result/contributing-initiative/requester for share_result_request ${row.share_result_request_id}`,
      );
      return;
    }

    const members = await this.roleByUserRepository.find({
      where: {
        initiative_id: row.shared_inititiative_id,
        role: In([3, 4, 5]),
        active: true,
      },
      relations: { obj_user: true },
    });
    const memberUserIds = members.map((member) => member.obj_user.id);
    if (!memberUserIds.length) return;

    const enabledSettings = await this.userNotificationSettingRepository.find({
      where: {
        user_id: In(memberUserIds),
        email_notifications_contributing_request_enabled: true,
        initiative_id: row.shared_inititiative_id,
      },
      relations: { obj_user: true },
    });
    const recipientEmails = enabledSettings.map((s) => s.obj_user.email);
    if (!recipientEmails.length) return;

    const template = await this.templateRepository.findOne({
      where: { name: EmailTemplate.CONTRIBUTION },
    });
    if (!template?.template) {
      this.logger.warn(
        'releaseContributors: email_template_contribution template not found',
      );
      return;
    }

    const [pcuEmail, technicalTeamEmails] = await Promise.all([
      this.globalParameterRepository.findOne({
        where: { name: 'pcu_email' },
        select: { value: true },
      }),
      this.globalParameterRepository.findOne({
        where: { name: 'technical_team_email' },
        select: { value: true },
      }),
    ]);

    const emailData = this.emailNotificationManagementService.buildEmailData(
      EmailTemplate.CONTRIBUTION,
      {
        initContributing,
        user: requester,
        initOwner,
        result,
        pcuEmail: pcuEmail?.value,
      },
    );

    this.emailNotificationManagementService.sendEmail({
      from: { email: env.EMAIL_SENDER, name: 'PRMS Reporting Tool -' },
      emailBody: {
        subject: emailData.subject,
        to: recipientEmails,
        cc: emailData.cc,
        bcc: technicalTeamEmails?.value,
        message: {
          text: 'Contribution request',
          socketFile: Handlebars.compile(template.template)(emailData),
        },
      },
    });
  }

  /**
   * `PSR-R-14` / DD-7 — the Creating Center's users, minus the acting user, same recipient
   * resolution `emitContributionDecisionNotification` uses (`share-result-request.service.ts`
   * L1187-1197 at the time of this task: lead centre via `results_center.is_leading_result`, then
   * `getUserIdsByCenter`). Never throws: a notice failure must not undo an already-committed
   * accept/decline.
   */
  private async emitCenterNotice(
    resultId: number,
    notificationType: NotificationTypeEnum,
    actorUserId: number,
    suffix: string,
  ): Promise<void> {
    try {
      const centers =
        await this.resultsCenterRepository.getAllResultsCenterByResultId(
          resultId,
        );
      const leadCenter = (centers ?? []).find(
        (center: any) => Number(center?.is_leading_result) === 1,
      );
      if (!leadCenter?.code) {
        this.logger.log(
          `PrimaryProgramRequestService: result ${resultId} has no lead centre; no Center notice sent`,
        );
        return;
      }

      const recipientIds = await this.roleByUserRepository.getUserIdsByCenter(
        String(leadCenter.code),
      );
      const recipients = recipientIds.filter((id) => id !== actorUserId);
      if (!recipients.length) {
        return;
      }

      await this.notificationService.emitResultNotification(
        NotificationLevelEnum.RESULT,
        notificationType,
        recipients,
        actorUserId,
        resultId,
        suffix,
      );
    } catch (error) {
      this.logger.warn(
        `PrimaryProgramRequestService.emitCenterNotice failed (resultId=${resultId}, type=${notificationType}): ${
          error?.message ?? error
        }`,
      );
    }
  }

  /**
   * `PNS-T-2` (design.md §5 item 9, `PNS-DD-3`) — after an accept, tells the submitted/tagging
   * notifications to run IF this result reached Pending Review ownerless (`PNS-R-2`): reads the
   * result's CURRENT status fresh (accept() itself never writes `Result.status_id`), and only
   * when it is Pending Review loads `bilateral.service.ts` with a dynamic `import()` — never a
   * static top-level import (see the class-level comment on the removed import, and
   * `primary-program-request.load-order.spec.ts`) — and resolves `BilateralService` through
   * `ModuleRef` (`strict: false` — P-7, the module graph can't import it back without a cycle)
   * before calling `announcePendingReview`. Never throws: an accept must stay committed even if
   * this fails.
   *
   * `ModuleRef.get` still needs the *class reference* `BilateralService` as its lookup token (it
   * does not accept the service by name/string here), which is exactly what the dynamic `import()`
   * hands it — resolved lazily, at call time, long after every module has finished loading.
   *
   * @akili-spec notifications/primary-notify-on-submit
   */
  private async announceIfPendingReview(
    resultId: number,
    acceptingUserId: number,
  ): Promise<void> {
    try {
      const result = await this.resultRepository.findOne({
        where: { id: resultId },
      });
      if (Number(result?.status_id) !== ResultStatusData.PendingReview.value) {
        return;
      }

      const { BilateralService } = await import(
        '../../../bilateral/bilateral.service'
      );
      const bilateralService = this.moduleRef.get(BilateralService, {
        strict: false,
      });
      if (!bilateralService) {
        this.logger.warn(
          `PrimaryProgramRequestService.accept: BilateralService unavailable; skipping Pending Review announcement for result ${resultId}`,
        );
        return;
      }

      await bilateralService.announcePendingReview(resultId, acceptingUserId);
    } catch (error) {
      this.logger.warn(
        `PrimaryProgramRequestService.accept: announceIfPendingReview failed (resultId=${resultId}): ${
          error?.message ?? error
        }`,
      );
    }
  }

  /** The lead project id of a result: the active `results_by_projects` row, lead first. */
  private async findLeadProjectId(
    resultId: number,
    manager?: EntityManager,
  ): Promise<number | null> {
    const repo = manager
      ? manager.getRepository(ResultsByProjects)
      : this.resultsByProjectsRepository;
    const rows = await repo.find({
      where: { result_id: resultId, is_active: true },
      order: { is_lead: 'DESC', id: 'DESC' },
      take: 1,
    });
    return rows[0]?.project_id ?? null;
  }

  private async resolveOfficialCode(
    initiativeId: number | null,
  ): Promise<string | null> {
    if (initiativeId == null) return null;
    const initiative = await this.clarisaInitiativesRepository.findOne({
      where: { id: initiativeId },
    });
    return initiative?.official_code ?? null;
  }

  private repoFor(manager?: EntityManager): Repository<ShareResultRequest> {
    return manager
      ? manager.getRepository(ShareResultRequest)
      : this.shareResultRequestRepository;
  }

  private emptyState(): PrimaryRequestState {
    return {
      state: PrimaryRequestStateEnum.NONE,
      program_code: null,
      declined_by_codes: [],
    };
  }
}
