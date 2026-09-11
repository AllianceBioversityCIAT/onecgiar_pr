import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { NonPooledProjectDto, PartnersBody } from './models/partnersBody';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { RdPartnersService } from './rd-partners.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { CanComponentDeactivate } from '../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';

@Component({
  selector: 'app-rd-partners',
  templateUrl: './rd-partners.component.html',
  styleUrls: ['./rd-partners.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class RdPartnersComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  alertStatusMessage: string = `Partner organization or CG Center that you collaborated with or are currently collaborating with to generate this result.`;

  disabledText = 'To remove this center, please contact your librarian';

  /**
   * `UCA-T-9` rework (attempt 2) — component-scoped dirty-diff tracker
   * (`providers: [SectionDirtyTrackerService]` on this component). Snapshotted at the true end of
   * `RdPartnersService.getSectionInformation()`'s load flow (via its `onLoaded` callback) and again
   * synchronously in `performSave()`'s success branch. See
   * `docs/specs/changes/unsaved-changes-alert/design.md` `UCA-DD-1`.
   *
   * Attempt-1 rework note (Reviewer FAIL, Discovered Issue 2): `leadCenterCode`/`leadPartnerId` are
   * bound OUTSIDE `partnersBody` (on `RdPartnersService` directly) but are read by `performSave()`'s
   * PATCH payload — editing ONLY a mandatory Lead Center/Lead Partner select left `partnersBody`
   * byte-identical, so `hasUnsavedChanges()` stayed `false` and Next silently navigated away without
   * saving. Fix: `dirtySnapshotValue()` below tracks a composite `{ partnersBody, leadCenterCode,
   * leadPartnerId }`, snapshotted/diffed as one unit.
   *
   * Timing investigated (not assumed) to avoid reintroducing Issue 1's bug class for these two
   * fields: `RdPartnersService.getSectionInformation()`'s `next` handler calls
   * `setLeadPartnerOnLoad`/`setLeadCenterOnLoad` SYNCHRONOUSLY, before `onLoaded?.()` fires
   * (`rd-partners.service.ts:174-191`) — so by the time this component's `onLoaded` callback
   * snapshots, both fields already reflect that load's own auto-assignment. A further gap existed
   * around the CLARISA centres/institutions catalogue's own async re-fetch (`centersSE.getData()`/
   * `institutionsSE`, P2-3554 recovery path): if that catalogue is still loading when this section's
   * own GET resolves, its `loadedCenters`/`loadedInstitutions` emission can re-run
   * `setLeadCenterOnLoad`/`setLeadPartnerOnLoad` again AFTER this snapshot. Attempt 2 originally
   * recorded this as a narrow, accepted residual gap — that framing was wrong (Reviewer FAIL,
   * Discovered Issue 1, attempt 2): `InstitutionsService` has NO bootstrap prefetch, so its GET
   * genuinely races this section's own GET on a cold entry, not a rare recovery path. **It IS closed
   * now**, via `reconcileLeadFieldsAfterLateCatalogue()` below: attempt 3 introduced the
   * reconciliation hook (`onCatalogueDrivenLeadUpdate`, wired in `ngOnInit`), and attempt 4 fixed a
   * bug in that hook itself — see the method's own docstring and the twin
   * `RdContributorsAndPartnersComponent`'s identical fix
   * (`docs/specs/changes/unsaved-changes-alert/execution.md`, `UCA-T-9` attempts 3-4) for the full
   * rationale on why a plain unconditional re-snapshot, a plain "skip while already dirty", or an
   * unscoped (source-agnostic) substitution are all wrong.
   */
  private readonly dirtyTracker = inject(SectionDirtyTrackerService);
  /**
   * The exact object last passed to `dirtyTracker.snapshot(...)` — kept alongside the tracker's own
   * (JSON-string) baseline so `reconcileLeadFieldsAfterLateCatalogue()` can structurally compare
   * against it (the tracker exposes no getter for its stored baseline). Single write path:
   * `snapshotBaseline()`.
   */
  private lastDirtySnapshot: { partnersBody: PartnersBody; leadCenterCode: string; leadPartnerId: number } | null = null;

  constructor(
    public api: ApiService,
    public institutionsSE: InstitutionsService,
    public rolesSE: RolesService,
    public rdPartnersSE: RdPartnersService,
    private readonly customizedAlertsFeSE: CustomizedAlertsFeService,
    public centersSE: CentersService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Partners & Contributors');
  }

  ngOnInit() {
    this.rdPartnersSE.partnersBody = new PartnersBody();
    // Root-singleton service: without this the skeleton would only ever show on the first result
    // opened in the session. Raised here (first entry) and NOT in getSectionInformation, so the
    // post-save reload does not re-flash on top of the save spinner.
    this.rdPartnersSE.sectionLoading.set(true);
    // `UCA-T-9` attempt 3, Issue 1: tell the service to call us back whenever a catalogue-driven lead
    // re-assignment happens after our own load, so we can reconcile the baseline. Cleared in
    // `ngOnDestroy` — the service is root-provided and outlives this component.
    this.rdPartnersSE.onCatalogueDrivenLeadUpdate = source => this.reconcileLeadFieldsAfterLateCatalogue(source);
    this.rdPartnersSE.getSectionInformation(undefined, false, () => this.snapshotBaseline());
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(_resp => {
      try {
        document.querySelectorAll('.alert-event').forEach(element => {
          element.addEventListener('click', _e => {
            this.api.dataControlSE.showPartnersRequest = true;
          });
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  /** `UCA-T-9` attempt 3, Issue 1: detach our callback from the root-provided service. */
  ngOnDestroy(): void {
    if (this.rdPartnersSE.onCatalogueDrivenLeadUpdate) {
      this.rdPartnersSE.onCatalogueDrivenLeadUpdate = undefined;
    }
  }

  onSyncSection() {
    const confirmationMessage = `Sync result with CGSpace? <br/> Unsaved changes in the section will be lost. `;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Sync confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'Yes, sync information'
      },
      () => {
        this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
          this.rdPartnersSE.getSectionInformation();
        });
      }
    );
  }

  deleteEvidence(index: number) {
    this.rdPartnersSE.partnersBody.contributing_np_projects.splice(index, 1);
  }

  addBilateralContribution() {
    this.rdPartnersSE.partnersBody.contributing_np_projects.push(new NonPooledProjectDto());
  }

  deleteContributingCenter(index: number, updateComponent: boolean = false) {
    if (updateComponent) {
      this.rdPartnersSE.updatingLeadData = true;
    }

    const deletedCenter = this.rdPartnersSE.partnersBody?.contributing_center.splice(index, 1);
    if (deletedCenter.length === 1 && this.rdPartnersSE.leadCenterCode === deletedCenter[0].code) {
      //always should happen
      this.rdPartnersSE.leadCenterCode = null;
    }
    if (updateComponent) {
      setTimeout(() => {
        this.rdPartnersSE.updatingLeadData = false;
      }, 50);
    }
  }

  get validateGranTitle() {
    for (const iterator of this.rdPartnersSE.partnersBody.contributing_np_projects) {
      const evidencesFinded = this.rdPartnersSE.partnersBody.contributing_np_projects.filter(
        evidence => evidence.grant_title == iterator.grant_title
      );
      if (evidencesFinded.length >= 2) {
        return evidencesFinded.length >= 2;
      }
    }

    return !!this.rdPartnersSE.partnersBody.contributing_np_projects.find(evidence => !evidence.grant_title);
  }

  /**
   * `UCA-T-9` rework — the value the dirty tracker snapshots/diffs: `partnersBody` PLUS the two
   * lead fields `performSave()` reads from `RdPartnersService` directly (see the tracker's docstring
   * above for why these two, and the investigated timing that keeps this safe).
   */
  private dirtySnapshotValue(): { partnersBody: PartnersBody; leadCenterCode: string; leadPartnerId: number } {
    return {
      partnersBody: this.rdPartnersSE.partnersBody,
      leadCenterCode: this.rdPartnersSE.leadCenterCode,
      leadPartnerId: this.rdPartnersSE.leadPartnerId
    };
  }

  /**
   * `UCA-T-9` attempt 3, Issue 1 — single write path for both `dirtyTracker`'s baseline and
   * `lastDirtySnapshot`. Replaces every direct `dirtyTracker.snapshot(...)` call. See the twin
   * `RdContributorsAndPartnersComponent`'s identical method for the full rationale.
   *
   * ⚠️ `value.partnersBody` is a REFERENCE to the live, mutable `RdPartnersService.partnersBody` — a
   * later in-place edit (e.g. `partnersBody.no_applicable_partner = true`) would otherwise silently
   * "update" whatever `lastDirtySnapshot` last pointed at too, defeating
   * `reconcileLeadFieldsAfterLateCatalogue()`'s whole comparison (self-caught while writing this
   * fix's own regression test: a genuine edit was wrongly folded away as if nothing had changed).
   * `dirtyTracker.snapshot()` is immune to this because it stores a `JSON.stringify` STRING, not the
   * object — so `lastDirtySnapshot` needs the same JSON round-trip to freeze it as an independent
   * copy, matching the tracker's own established cloning mechanism
   * (`SectionDirtyTrackerService.snapshot()`'s docstring).
   */
  private snapshotBaseline(
    value: { partnersBody: PartnersBody; leadCenterCode: string; leadPartnerId: number } = this.dirtySnapshotValue()
  ): void {
    this.dirtyTracker.snapshot(value);
    this.lastDirtySnapshot = JSON.parse(JSON.stringify(value));
  }

  /**
   * `UCA-T-9` attempt 3, Issue 1 fix — see `RdContributorsAndPartnersComponent`'s identical method
   * for the full rationale (why unconditional re-snapshot and "skip while dirty" are both wrong).
   * Structural rule: fold the catalogue's corrected `leadCenterCode`/`leadPartnerId` into a fresh
   * baseline ONLY when nothing else differs from the current baseline.
   *
   * `UCA-T-9` attempt 4 fix — `source` scopes the substitution to the ONE field the emitting
   * catalogue could actually have changed: `leadPartnerId` only when `source === 'institutions'`,
   * `leadCenterCode` only when `source === 'centers'`. Attempt 3 substituted BOTH fields back to
   * baseline unconditionally, regardless of which catalogue emitted — so a genuine concurrent edit
   * to the OTHER field (the one the emitting catalogue never touches) was silently folded away as
   * if nothing had changed, the exact silent-data-loss failure this spec exists to prevent. Scoping
   * the substitution means an edit to that other field now correctly survives as a real diff and
   * keeps the section dirty.
   */
  private reconcileLeadFieldsAfterLateCatalogue(source: 'centers' | 'institutions'): void {
    if (!this.lastDirtySnapshot) return;
    const current = this.dirtySnapshotValue();
    const currentWithBaselineLeadFields = {
      ...current,
      ...(source === 'institutions' ? { leadPartnerId: this.lastDirtySnapshot.leadPartnerId } : {}),
      ...(source === 'centers' ? { leadCenterCode: this.lastDirtySnapshot.leadCenterCode } : {})
    };
    if (JSON.stringify(currentWithBaselineLeadFields) !== JSON.stringify(this.lastDirtySnapshot)) return;
    this.snapshotBaseline(current);
  }

  /** `UCA-T-9` — `CanComponentDeactivate.hasUnsavedChanges()`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtySnapshotValue());
  }

  /**
   * `UCA-T-9` — `CanComponentDeactivate.saveSection()`. Wraps `performSave()`'s exact PATCH call
   * and error branch (`UCA-DD-3`, no duplicated save logic) to resolve `true`/`false` instead of
   * void, for `UnsavedChangesGuard`.
   */
  saveSection(): Observable<boolean> {
    return this.performSave().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  onSaveSection() {
    this.performSave().subscribe({ error: () => {} });
  }

  /**
   * `UCA-T-9`: returns the PATCH `Observable` instead of self-subscribing, so both this
   * component's own Save action (`onSaveSection`, above) and `saveSection()` (the
   * `CanComponentDeactivate` contract, below) drive the exact same call and error branch — no
   * duplicated save logic (`UCA-DD-3`).
   */
  private performSave(): Observable<void> {
    if (this.rdPartnersSE.partnersBody.no_applicable_partner) {
      this.rdPartnersSE.partnersBody.institutions = [];
    }

    if (this.rdPartnersSE.partnersBody.is_lead_by_partner) {
      this.rdPartnersSE.partnersBody.mqap_institutions?.forEach(mqap => {
        mqap.is_leading_result = this.rdPartnersSE.leadPartnerId === mqap.institutions_id;
      });
      this.rdPartnersSE.partnersBody.institutions?.forEach(i => {
        i.is_leading_result = this.rdPartnersSE.leadPartnerId === i.institutions_id;
      });
      this.rdPartnersSE.partnersBody.contributing_center?.forEach(center => (center.is_leading_result = false));
    } else {
      this.rdPartnersSE.partnersBody.contributing_center?.forEach(center => {
        center.is_leading_result = this.rdPartnersSE.leadCenterCode === center.code;
      });
      this.rdPartnersSE.partnersBody.mqap_institutions?.forEach(mqap => {
        mqap.is_leading_result = false;
      });
      this.rdPartnersSE.partnersBody.institutions?.forEach(i => {
        i.is_leading_result = false;
      });
    }

    return this.api.resultsSE.PATCH_partnersSection(this.rdPartnersSE.partnersBody).pipe(
      tap(() => {
        // `UCA-T-9` — snapshot HERE, synchronously, the instant the PATCH resolves: the local
        // `partnersBody` at this exact instant is precisely what the server just persisted. This
        // closes the same race `UCA-T-6`'s rework fixed — `saveSection()`'s `map(() => true)` can
        // emit to `UnsavedChangesGuard` before the reload below (and its own re-snapshot) resolves,
        // or the reload could fail and leave the section dirty forever despite a real save.
        this.snapshotBaseline();
        // Re-fetches and re-snapshots `partnersBody` with the server-normalized body once it
        // resolves. Harmless on top of the snapshot above — refines it, doesn't undo it.
        this.rdPartnersSE.getSectionInformation(null, true, () => this.snapshotBaseline());
      }),
      map(() => undefined),
      catchError(err => {
        console.error(err);
        return throwError(() => err);
      })
    );
  }

  getMessageLead() {
    const entity = this.rdPartnersSE.partnersBody.is_lead_by_partner ? 'partner' : 'CG Center';
    return `Please select the ${entity} leading this result. <b>Only ${entity}s already added in this section can be selected as the result lead.</b>`;
  }
}
