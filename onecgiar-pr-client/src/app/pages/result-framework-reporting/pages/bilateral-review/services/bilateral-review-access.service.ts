// @akili-spec changes/sp-bilateral-review-tab (BRT-T-2, BRT-R-14)
import { inject, Injectable } from '@angular/core';
import { ApiService } from '../../../../../shared/services/api/api.service';

/**
 * Shared "can this user review this program's bilateral results" rule (`BRT-R-14`).
 *
 * A platform admin can always review; anyone else can review a program only when it appears in
 * their own `myInitiativesList` (the initiatives/SPs the current user is a member of). This is
 * the single place that answers that question so the row action label (T-3) and the drawer's
 * `canEditInDrawer` (which additionally requires `status_id == 5`) stay in lockstep — the drawer
 * MUST keep its own pending-status guard on top of this membership check.
 */
@Injectable({ providedIn: 'root' })
export class BilateralReviewAccessService {
  private readonly api = inject(ApiService);

  /** True for a platform admin, or when `code` is one of the current user's own initiatives. */
  isProgramMember(code: string): boolean {
    if (this.api.rolesSE?.isAdmin) return true;
    const myInitiativesList = this.api.dataControlSE?.myInitiativesList ?? [];
    return myInitiativesList.some(item => item?.official_code === code);
  }
}
