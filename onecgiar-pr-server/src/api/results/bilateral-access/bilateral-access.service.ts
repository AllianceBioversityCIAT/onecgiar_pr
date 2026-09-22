import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { In } from 'typeorm';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultsTocResultRepository } from '../results-toc-results/repositories/results-toc-results.repository';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

/**
 * The subset of a loaded `Result` every decision needs. Callers load the row once at the
 * bilateral entry point (design §2.2 step 2) and pass it in — this service never queries for
 * the result itself.
 */
export interface BilateralAccessResult {
  id: number;
  status_id: number;
}

/**
 * The subset of a `toc-metadata` payload item DD-7 (and its amendment) need. Both fields come
 * off the client's `result_toc_results[]` — neither is declared on `ResultTocResultItemDto`
 * (only the top-level `ResultTocResultBlockDto` declares `initiative_id`), so callers read them
 * the same loose-cast way `ResultsTocResultsService.updateTocResultPartial` already does.
 */
export interface BilateralTocItem {
  initiative_id?: number;
  result_toc_result_id?: number;
  results_id?: number;
}

/** Which of the three §5.1 decisions denied the write — the only "why" a 403 log line carries. */
export type BilateralAccessRule = 'center' | 'toc' | 'decision';

/**
 * `docs/specs/bilateral/review-toc-only-editing/design.md` §5.1, DD-1.
 *
 * One injectable exposing the three access decisions for a bilateral write at review time:
 *
 * - {@link assertCenterWrite} — Center-reported data (title, general-info, contributors,
 *   planned-result, toc-mapping, geography). Admin, or status ≠ 5.
 * - {@link assertTocWrite} — `toc-metadata`. Admin; or status = 5 AND the user holds an active
 *   role on the payload's initiative AND that initiative is actively linked to the result AND
 *   every payload item names (or row-owns) that same program (DD-7 + amendment). Keeps the
 *   existing 409 for a non-admin at a status other than 5 (this helper replaces
 *   `_validateBilateralResultForUpdate`, not its status-conflict signalling).
 * - {@link assertDecision} — `review-decision` (approve/reject). Admin, or the user holds an
 *   active role on any Science Program actively linked to the result. Status/justification
 *   checks stay where they already live (out of scope here — R-6, G-6).
 *
 * Every decision checks admin first (D-1) via {@link RoleByUserRepository.isUserAdmin} — the
 * same admin detection `ResultsService` already uses at `results.service.ts:4210`, not the
 * buggy `validationRolePermissions` (P-10, DD-3).
 *
 * Every decision also takes an `endpoint` — a static route label (`'general-info'`,
 * `'toc-metadata'`, …), never the raw URL or query string — solely so a 403 can log which
 * endpoint denied the write (design §9): `'center'` alone covers 7 different writes, so the
 * `rule` alone can't identify which one.
 *
 * **Placement (design §5.1):** this class has no controller and no entity, but it DOES have its
 * own module — {@link BilateralAccessModule}. `ResultsService` takes this as a required
 * constructor param and is declared directly in three modules (`ResultsModule`,
 * `DeleteRecoverDataModule`, `ResultsKnowledgeProductsModule`) — Nest resolves a provider's
 * dependencies inside the module that declares it, so all three import `BilateralAccessModule`.
 */
@Injectable()
export class BilateralAccessService {
  private readonly _logger = new Logger(BilateralAccessService.name);

  constructor(
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
  ) {}

  /**
   * Center write: any write to the Center-reported data (design §3, "Center write"). Allowed
   * for an admin at any status, or for anyone at any status other than Pending Review (5).
   * Deliberately checks ONLY status 5 (DD-2) — it does not narrow to "only 1/8", and it never
   * looks at Center ownership.
   */
  async assertCenterWrite(
    result: BilateralAccessResult,
    endpoint: string,
    user: TokenDto,
  ): Promise<void> {
    if (await this._isAdmin(user)) {
      return;
    }
    if (!this._isPendingReview(result)) {
      return;
    }
    this._denyForbidden(result.id, 'center', endpoint, user?.id);
  }

  /**
   * ToC write (`toc-metadata`): admin; or status = 5 AND the caller holds an active role on
   * `initiativeId` (the payload's program) AND `initiativeId` is actively linked to the result
   * AND all three DD-7 checks pass. A non-admin at a status other than 5 gets 409, not 403 — every
   * check below the status check shares that rule, including all three DD-7 checks, so the 409
   * always wins over a DD-7 denial for a non-pending-review result (design §5.1).
   *
   * `items` is the payload's `result_toc_results[]` (optional — omitted or empty skips every
   * DD-7 check). The cross-result check (an item's `results_id` naming another result) runs first
   * among the three — query-free, right after the status check — followed by the membership
   * reads, the item-initiative check, then the row-ownership read (which only runs when an item
   * carries a `result_toc_result_id`, per design §12 DD-7 Amendment "no extra query" budget).
   * Every DD-7 denial goes through {@link _denyForbidden} with rule `'toc'`, so it logs and
   * responds exactly like every other decision in this class.
   *
   * Fails closed with a 403 if the caller has no usable `user.id` — otherwise a malformed token
   * would reach the repository calls below and surface as an unhandled 500 instead of a 403.
   */
  async assertTocWrite(
    result: BilateralAccessResult,
    initiativeId: number,
    endpoint: string,
    user: TokenDto,
    items?: BilateralTocItem[],
  ): Promise<void> {
    if (await this._isAdmin(user)) {
      return;
    }
    if (!user?.id) {
      this._denyForbidden(result.id, 'toc', endpoint, user?.id);
    }
    if (!this._isPendingReview(result)) {
      throw new ConflictException(
        `Cannot update result. Current status is not PENDING_REVIEW (status_id: ${result.status_id})`,
      );
    }

    // DD-7 Amendment #2 — `_handleIndicators` → `saveIndicatorsPrimarySubmitter` resolves its
    // write target via `toc?.results_id || result_id`, so an item that smuggles another result's
    // id there (with `indicators` set) could steer that lookup off THIS result. Query-free, so it
    // runs before the membership reads below without adding a round trip. `null`/`undefined` are
    // allowed — the client normally never sends `results_id` at all.
    if (
      (items ?? []).some((item) =>
        this._itemNamesAnotherResult(item, result.id),
      )
    ) {
      this._denyForbidden(result.id, 'toc', endpoint, user?.id);
    }

    const [hasRoleOnInitiative, linkedInitiatives] = await Promise.all([
      this._roleByUserRepository.hasActiveRoleOnInitiative(
        user.id,
        initiativeId,
      ),
      this._resultByInitiativesRepository.getContributorInitiativeAndPrimaryByResult(
        result.id,
      ),
    ]);
    const initiativeLinkedToResult = (linkedInitiatives ?? []).some(
      (initiative) => Number(initiative?.id) === Number(initiativeId),
    );

    if (!hasRoleOnInitiative || !initiativeLinkedToResult) {
      this._denyForbidden(result.id, 'toc', endpoint, user?.id);
    }

    // DD-7 — every item that names an `initiative_id` must name the same program as the payload.
    if (
      (items ?? []).some((item) =>
        this._itemNamesAnotherProgram(item, initiativeId),
      )
    ) {
      this._denyForbidden(result.id, 'toc', endpoint, user?.id);
    }

    // DD-7 Amendment — every item that sets `result_toc_result_id` must point at an active row
    // of THIS result owned by the saved program (null `initiative_ids` allowed only when the
    // saved program is the owner, per DD-4). One read, skipped when no item carries a row id.
    await this._assertTocItemRowsBelongToProgram(
      result,
      items,
      initiativeId,
      linkedInitiatives,
      endpoint,
      user?.id,
    );
  }

  /** DD-7: an item that sets `initiative_id` and names a program other than the saved one. */
  private _itemNamesAnotherProgram(
    item: BilateralTocItem,
    savedInitiativeId: number,
  ): boolean {
    const itemInitiativeId = item?.initiative_id;
    if (itemInitiativeId === undefined || itemInitiativeId === null) {
      return false;
    }
    return Number(itemInitiativeId) !== Number(savedInitiativeId);
  }

  /**
   * DD-7 Amendment #2: an item that sets `results_id` to a result other than this one.
   * `null`/`undefined` are allowed — the normal, expected shape.
   */
  private _itemNamesAnotherResult(
    item: BilateralTocItem,
    resultId: number,
  ): boolean {
    const itemResultId = item?.results_id;
    if (itemResultId === undefined || itemResultId === null) {
      return false;
    }
    return Number(itemResultId) !== Number(resultId);
  }

  /**
   * DD-7 Amendment — `_updatePlannedTocResult` (`results-toc-results.service.ts`) updates a
   * `results_toc_result` row by `result_toc_result_id` alone, with no `result_id` filter. Without
   * this check, a non-admin could send another program's (or another result's) row id — with
   * `initiative_id` left unset, so the DD-7 check above never sees it — and overwrite that row.
   *
   * Reads the payload's row ids once (skipped entirely when no item carries one — the design's
   * cost budget), scoped to THIS result and active rows only, and requires each one to belong to
   * the saved program. A `null` `initiative_ids` (a legacy/owner row) is allowed only when the
   * saved program IS the owner (`initiative_role_id === 1` in the already-fetched
   * `linkedInitiatives`, per DD-4) — never for a contributor. A row id with no matching active
   * row of this result also denies (covers "doesn't exist" and "belongs to another result").
   */
  private async _assertTocItemRowsBelongToProgram(
    result: BilateralAccessResult,
    items: BilateralTocItem[] | undefined,
    savedInitiativeId: number,
    linkedInitiatives: Array<{ id?: number; initiative_role_id?: number }>,
    endpoint: string,
    userId: number,
  ): Promise<void> {
    // Falsy row ids (0, '', null, undefined) are treated as "no id" — the same test
    // `updateTocResultPartial` uses (`!t.result_toc_result_id`, results-toc-results.service.ts).
    const rowIds = Array.from(
      new Set(
        (items ?? [])
          .map((item) => item?.result_toc_result_id)
          .filter((id) => !!id)
          .map((id) => Number(id)),
      ),
    );
    if (rowIds.length === 0) {
      return;
    }

    const ownerInitiativeId = (linkedInitiatives ?? []).find(
      (initiative) => Number(initiative?.initiative_role_id) === 1,
    )?.id;
    const savedIsOwner =
      ownerInitiativeId !== undefined &&
      Number(ownerInitiativeId) === Number(savedInitiativeId);

    const activeRows = await this._resultsTocResultRepository.find({
      where: {
        result_id: result.id,
        result_toc_result_id: In(rowIds),
        is_active: true,
      },
    });
    const rowsById = new Map(
      activeRows.map((row) => [Number(row.result_toc_result_id), row]),
    );

    const everyRowBelongsToSavedProgram = rowIds.every((rowId) => {
      const row = rowsById.get(rowId);
      if (!row) {
        return false;
      }
      if (row.initiative_ids === null || row.initiative_ids === undefined) {
        return savedIsOwner;
      }
      return Number(row.initiative_ids) === Number(savedInitiativeId);
    });

    if (!everyRowBelongsToSavedProgram) {
      this._denyForbidden(result.id, 'toc', endpoint, userId);
    }
  }

  /**
   * Decision (`review-decision`): admin, or the caller holds an active role on any Science
   * Program actively linked to the result (any role, read-only included — D-2). Status and
   * justification checks are the caller's existing responsibility (R-6, G-6) — this decision is
   * membership only.
   *
   * Fails closed with a 403 if the caller has no usable `user.id` — same reasoning as
   * {@link assertTocWrite}.
   */
  async assertDecision(
    result: BilateralAccessResult,
    endpoint: string,
    user: TokenDto,
  ): Promise<void> {
    if (await this._isAdmin(user)) {
      return;
    }
    if (!user?.id) {
      this._denyForbidden(result.id, 'decision', endpoint, user?.id);
    }
    const hasRoleOnLinkedInitiative =
      await this._roleByUserRepository.hasActiveRoleOnAnyInitiativeLinkedToResult(
        user.id,
        result.id,
      );
    if (hasRoleOnLinkedInitiative) {
      return;
    }
    this._denyForbidden(result.id, 'decision', endpoint, user?.id);
  }

  private _isPendingReview(result: BilateralAccessResult): boolean {
    return Number(result.status_id) === ResultStatusData.PendingReview.value;
  }

  private async _isAdmin(user: TokenDto): Promise<boolean> {
    if (!user?.id) {
      return false;
    }
    const isAdmin = await this._roleByUserRepository.isUserAdmin(user.id);
    return !!isAdmin;
  }

  /**
   * Denies a write with a 403. Logs `warn` with the result id, the endpoint, the rule and the
   * user id only — no token, no email, no name (`.cursorrules`; design §9). The thrown body
   * never echoes the user id either — the message only names the rule and, per design §4.1, may
   * echo ids.
   */
  private _denyForbidden(
    resultId: number,
    rule: BilateralAccessRule,
    endpoint: string,
    userId: number,
  ): never {
    this._logger.warn(
      `Bilateral write denied: result=${resultId} endpoint=${endpoint} rule=${rule} user=${userId}`,
    );
    throw new ForbiddenException(
      `Result ${resultId} is under Science Program review (rule: ${rule}).`,
    );
  }
}
