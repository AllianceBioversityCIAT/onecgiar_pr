import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnInit, signal } from '@angular/core';
import { BilateralResultDetail } from '../../result-review-drawer.interfaces';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-cap-sharing-content',
  imports: [CustomFieldsModule, CommonModule, FormsModule],
  templateUrl: './cap-sharing-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CapSharingContentComponent implements OnInit {
  @Input() disabled: boolean = false;
  @Input() set resultDetail(value: BilateralResultDetail) {
    if (!value) {
      this._resultDetail = value;
      return;
    }

    if (!value.resultTypeResponse || !Array.isArray(value.resultTypeResponse) || value.resultTypeResponse.length === 0) {
      value.resultTypeResponse = [{
        result_capacity_development_id: null,
        male_using: null,
        female_using: null,
        non_binary_using: null,
        has_unkown_using: null,
        capdev_delivery_method_id: null,
        capdev_term_id: null
      } as any];
    } else {
      const firstItem: any = value.resultTypeResponse[0];
      if (firstItem.male_using === undefined) firstItem.male_using = null;
      if (firstItem.female_using === undefined) firstItem.female_using = null;
      if (firstItem.non_binary_using === undefined) firstItem.non_binary_using = null;
      if (firstItem.has_unkown_using === undefined) firstItem.has_unkown_using = null;
      if (firstItem.capdev_delivery_method_id === undefined) firstItem.capdev_delivery_method_id = null;
      if (firstItem.capdev_term_id === undefined) firstItem.capdev_term_id = null;
    }

    this._resultDetail = value;
    // CSD-R-6 / design.md DD-4 — read-only hydration, AFTER the null-backfill and never before it.
    this.hydrateTermCascade();
    this.cdr.markForCheck();
  }
  get resultDetail(): BilateralResultDetail {
    return this._resultDetail;
  }
  private _resultDetail: BilateralResultDetail;

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly api = inject(ApiService);

  /** Parent terms — rows 3-4 of the catalogue (Short-term, Long-term). Contents unchanged by CSD-T-4. */
  capdevsTerms = signal<any[]>([]);
  /** Sub-terms — rows 1-2 of the same catalogue (PhD, Master). The degree options. */
  capdevsSubTerms = signal<any[]>([]);
  deliveryMethodOptions = signal<any[]>([]);

  /**
   * Local UI state for the term cascade, mirroring the editor
   * (`pages/bilateral/components/section-type-specific/type-capacity-sharing/type-capacity-sharing.component.ts:170-198`).
   * `capdev_term_id` stays the ONE persisted key: these two are derived from it for display and
   * recomposed into it only from a user-initiated change (design.md §3).
   */
  capdevTermId1: number | null = null;
  capdevTermId2: number | null = null;

  ngOnInit(): void {
    this.loadCapdevsTerms();
    this.loadDeliveryMethods();
  }

  private loadCapdevsTerms(): void {
    this.api.resultsSE.GET_capdevsTerms().subscribe({
      next: ({ response }) => {
        // design.md DD-5 — the parent split is unchanged; the sub-term list is ADDED beside it.
        this.capdevsSubTerms.set(response.slice(0, 2));
        this.capdevsTerms.set(response.slice(2, 4));
      },
      error: () => {
        this.capdevsTerms.set([]);
        this.capdevsSubTerms.set([]);
      }
    });
  }

  /**
   * Term id 4 is a parent bucket disambiguated by a sub-term (1 = PhD, 2 = Master); term 3 stands alone.
   *
   * 🛑 **Read-only** (design.md DD-4, `CSD-R-6` BUT clause). This derives the two local ids FROM
   * `capdev_term_id` and writes nothing back: the drawer compares a normalized snapshot of
   * `resultTypeResponse[0]` captured at load against the live object
   * (`result-review-drawer.component.ts:377-402`), and `hasDataStandardUnsavedChanges()` gates
   * `canApprove()`. A single write here would mark a freshly opened drawer dirty and block Approve
   * with a change the reviewer never made.
   *
   * Idempotent: the setter can fire more than once on the same object. When the stored key already
   * matches what the local pair composes to, the pair is by definition in sync — a re-emit (or a
   * re-emit right after the reviewer picked a degree, which wrote through in place) must leave the
   * in-progress selection exactly as it is.
   */
  private hydrateTermCascade(): void {
    const stored = this._resultDetail?.resultTypeResponse?.[0]?.capdev_term_id ?? null;
    if (stored === this.composedTermId) return;

    if (stored === 1 || stored === 2) {
      this.capdevTermId1 = 4;
      this.capdevTermId2 = stored;
    } else if (stored === 4 || stored === 3) {
      this.capdevTermId1 = stored;
      this.capdevTermId2 = null;
    } else {
      this.capdevTermId1 = null;
      this.capdevTermId2 = null;
    }
  }

  /** What the local pair would persist as — the degree when one is chosen, otherwise the parent term. */
  private get composedTermId(): number | null {
    return this.capdevTermId2 ?? this.capdevTermId1 ?? null;
  }

  /**
   * The only write path. Mutates `resultTypeResponse[0]` in place, per
   * `result-review-drawer/AGENTS.md` §8 — the drawer reads that same reference when it builds the
   * Data Standards payload, so there is no second source of truth.
   */
  private syncCapdevTermId(): void {
    const body: any = this._resultDetail?.resultTypeResponse?.[0];
    if (!body) return;
    body.capdev_term_id = this.composedTermId;
  }

  onCapdevTermId1Change(): void {
    if (this.capdevTermId1 === 3) this.capdevTermId2 = null;
    this.syncCapdevTermId();
  }

  onCapdevTermId2Change(): void {
    this.syncCapdevTermId();
  }

  private loadDeliveryMethods(): void {
    this.api.resultsSE.GET_capdevsDeliveryMethod().subscribe({
      next: ({ response }) => {
        this.deliveryMethodOptions.set(response);
      },
      error: () => this.deliveryMethodOptions.set([])
    });
  }

  getTotalParticipants(): number {
    return (
      Number(this.resultDetail?.resultTypeResponse?.[0]?.male_using || 0) +
      Number(this.resultDetail?.resultTypeResponse?.[0]?.female_using || 0) +
      Number(this.resultDetail?.resultTypeResponse?.[0]?.non_binary_using || 0) +
      Number(this.resultDetail?.resultTypeResponse?.[0]?.has_unkown_using || 0)
    );
  }

  lengthOfTrainingDescription(): string {
    return `<ul>
    <li>Long-term training refers to training that goes for 3 or more months.</li>
    <li>Short-term training refers to training that goes for less than 3 months.</li>
    </ul>`;
  }
}
