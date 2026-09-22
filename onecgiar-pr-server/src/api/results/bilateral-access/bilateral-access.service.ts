import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
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

/** Which of the three §5.1 decisions denied the write — the only "why" a 403 log line carries. */
export type BilateralAccessRule = 'center' | 'toc' | 'decision';

/**
 * BIL-RTE-T-1 — `docs/specs/bilateral/review-toc-only-editing/design.md` §5.1, DD-1.
 *
 * One injectable exposing the three access decisions for a bilateral write at review time:
 *
 * - {@link assertCenterWrite} — Center-reported data (title, general-info, contributors,
 *   planned-result, toc-mapping, geography). Admin, or status ≠ 5.
 * - {@link assertTocWrite} — `toc-metadata`. Admin; or status = 5 AND the user holds an active
 *   role on the payload's initiative AND that initiative is actively linked to the result.
 *   Keeps the existing 409 for a non-admin at a status other than 5 (DD-1: this helper replaces
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
 * endpoint denied the write (design §9; rework, attempt 2 — Reviewer FAIL #2: the `rule` alone
 * does not stand in for it, since `'center'` alone covers 7 different writes).
 *
 * **Placement (design §5.1):** this class has no controller, no entity and no module of its
 * own. It is registered as a provider (and exported) directly on `ResultsModule`. Because
 * `BilateralModule` already imports `ResultsModule` (see the `WebhookOutboxModule` note in
 * `results.module.ts`), `BilateralModule` gets it for free through that existing edge — no new
 * import is needed on either side, so no `forwardRef` and no cycle (the task's disqualifier).
 */
@Injectable()
export class BilateralAccessService {
  private readonly _logger = new Logger(BilateralAccessService.name);

  constructor(
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
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
   * `initiativeId` (the payload's program) AND `initiativeId` is actively linked to the result.
   * A non-admin at a status other than 5 keeps today's 409 — the same conflict
   * `_validateBilateralResultForUpdate` raises today, unaffected by this rule (design §5.1).
   *
   * Fails closed with a 403 if the caller has no usable `user.id` (Reviewer advisory, rework
   * attempt 2) — otherwise a malformed token would reach the repository call below and surface
   * as an unhandled 500 instead of a 403.
   */
  async assertTocWrite(
    result: BilateralAccessResult,
    initiativeId: number,
    endpoint: string,
    user: TokenDto,
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

    const [hasRoleOnInitiative, initiativeLinkedToResult] = await Promise.all([
      this._roleByUserRepository.hasActiveRoleOnInitiative(
        user.id,
        initiativeId,
      ),
      this._isInitiativeLinkedToResult(result.id, initiativeId),
    ]);

    if (hasRoleOnInitiative && initiativeLinkedToResult) {
      return;
    }
    this._denyForbidden(result.id, 'toc', endpoint, user?.id);
  }

  /**
   * Decision (`review-decision`): admin, or the caller holds an active role on any Science
   * Program actively linked to the result (any role, read-only included — D-2). Status and
   * justification checks are the caller's existing responsibility (R-6, G-6) — this decision is
   * membership only.
   *
   * Fails closed with a 403 if the caller has no usable `user.id` (Reviewer advisory, rework
   * attempt 2) — same reasoning as {@link assertTocWrite}.
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

  private async _isInitiativeLinkedToResult(
    resultId: number,
    initiativeId: number,
  ): Promise<boolean> {
    const linkedInitiatives =
      await this._resultByInitiativesRepository.getContributorInitiativeAndPrimaryByResult(
        resultId,
      );
    return (linkedInitiatives ?? []).some(
      (initiative) => Number(initiative?.id) === Number(initiativeId),
    );
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
