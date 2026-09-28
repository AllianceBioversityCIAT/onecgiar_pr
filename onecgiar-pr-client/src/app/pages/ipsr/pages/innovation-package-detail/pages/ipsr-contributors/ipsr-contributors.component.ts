import { ChangeDetectorRef, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ContributorsBody } from './model/contributorsBody';
import { RdTheoryOfChangesServicesService } from '../../../../../results/pages/result-detail/pages/rd-theory-of-change/rd-theory-of-changes-services.service';
import { RdContributorsAndPartnersService } from '../../../../../results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { ResultLevelService } from '../../../../../results/pages/result-creator/services/result-level.service';
import { InnovationUseResultsService } from '../../../../../../shared/services/global/innovation-use-results.service';
import { IpsrCompletenessStatusService } from '../../../../services/ipsr-completeness-status.service';
import { filterOutAvisaInitiatives } from '../../../../../../shared/utils/avisa-initiative.util';
import { RESULT_DETAIL_SECTION_LOAD_COPY } from '../../../../../../internationalization/result-detail-section-load.copy';
import { CanComponentDeactivate } from '../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';

@Component({
  selector: 'app-ipsr-contributors',
  templateUrl: './ipsr-contributors.component.html',
  styleUrls: ['./ipsr-contributors.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class IpsrContributorsComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  contributorsBody = new ContributorsBody();

  /**
   * P2-3427 (Ángel, 28-Sep-2026 review) — component-scoped dirty-diff tracker, the mechanism W1/W2's
   * Contributors and Partners already uses (`rd-contributors-and-partners.component.ts`). Snapshotted at
   * the end of `onSectionInformation()` and again the instant a save resolves (`performSave()`).
   *
   * What it diffs is NOT the bare `contributorsBody` — see `dirtySnapshotValue()`: the Lead center /
   * Lead partner picks and the P25 "new contributing initiatives" feed the PATCH payload but live on
   * `RdContributorsAndPartnersService`, and the shared ToC children (`app-cp-multiple-wps`) stamp
   * client-only fields onto the ToC rows after this component's snapshot.
   */
  private readonly dirtyTracker = inject(SectionDirtyTrackerService);
  /**
   * The exact value last handed to `dirtyTracker.snapshot(...)`, frozen as an independent copy, so
   * `reconcileLeadFieldsAfterLateCatalogue()` can compare against it (the tracker keeps only a string).
   */
  private lastDirtySnapshot: Record<string, unknown> | null = null;
  private readonly onCatalogueDrivenLeadUpdate = (source: 'centers' | 'institutions') => {
    this.reconcileLeadFieldsAfterLateCatalogue(source);
    // P2-3838: a saved project's owner can only be resolved once the centers catalogue exists.
    if (source === 'centers') this.syncProjectDerivedCentersAfterLoad();
  };
  disabledOptions = [];
  rdPartnersSE = inject(RdContributorsAndPartnersService);
  centersSE = inject(CentersService);
  resultLevelSE = inject(ResultLevelService);
  contributingInitiativesList = [];
  /** P2-3746 — raw catalog before the owner exclusion in `applyOwnerExclusion`. */
  private allContributingInitiatives = [];
  fieldsManagerSE = inject(FieldsManagerService);
  innovationUseResultsSE = inject(InnovationUseResultsService);
  ipsrCompletenessStatusSE = inject(IpsrCompletenessStatusService);
  disabledText = 'To remove this center, please contact your librarian';
  submitter: string = '';
  result_toc_result = null;
  contributors_result_toc_result = null;
  initiativeIdSignal = signal<any>(null);
  getConsumed = signal<boolean>(false);

  /**
   * Night sweep 2026-09-23, IPSR-8 — three-state load flag (P2-3556 contract). The GET had no error
   * branch: on a failure the empty `ContributorsBody` stayed on screen with Save enabled, and saving
   * it sent `result_toc_result.initiative_id: null` with no `changePrimaryInit` (only set after a
   * successful GET). The server's `createTocMappingV2` reads that as "change the owner" and demoted
   * the package's Science Program — the package vanished from the list and Contributors answered 404
   * (prtest 11172 / 12037, not repairable from the UI). A failed RE-load keeps `true`.
   */
  readonly loaded = signal<boolean | null>(null);
  readonly loadErrorNote = RESULT_DETAIL_SECTION_LOAD_COPY.loadErrorNote;
  tocConsumed = true;

  /**
   * P2-3427 (Ángel, 25-Sep-2026 review of the IPSR flow) — the ToC question in IPSR Contributors and Partners
   * must read and behave like the W1/W2 one (`rd-contributors-and-partners.component.ts:436-476`): label,
   * tooltip, the 2026 "financial resources" question when the answer is No, and the 50-word justification.
   * Gated on the PHASE year (`isContributorsPartners2026`), never on the portfolio (R9).
   */
  readonly isCP2026 = computed(() => !!this.fieldsManagerSE.isContributorsPartners2026?.());

  readonly tocQuestionLabel = computed(() =>
    this.isCP2026() ? 'Can this result be mapped to a ToC KPI?' : "Does this result align with the Program's planned TOC indicators?"
  );

  readonly tocQuestionInfoNote = computed(() =>
    this.isCP2026()
      ? 'If <strong>Yes</strong>, please select the relevant level, KPI, and indicate the result contribution to the target. If <strong>No</strong>, please provide a short justification explaining why this result is being reported outside the 2026 ToC KPI. No-mapped results will be shared with the Program team for consideration as part of the adaptive management process, and may feed into updates to the Program’s 2027 ToC.'
      : 'If your answer is <strong>Yes</strong>, please select the relevant <strong>HLO, indicator</strong>, and <strong>contribution to target</strong> below. If the result is not planned for in the 2025 ToC (planned indicators), please select <strong>No</strong> and, where applicable, choose the <strong>HLO</strong> under which it is most appropriate to report the result. Please also provide a short justification explaining why you are reporting it even though it is not reflected in a 2025 ToC indicator. These “No”-flagged results could be reviewed by the Program team as part of the adaptive management process and may inform updates or adjustments to the Program’s 2026 ToC and planned indicators.'
  );

  // P2-3063 / P2-3036 AC6 — the single on-screen radio reads the first ToC row and writes every row, as W1/W2 does.
  readonly financialResourcesInfoNote =
    "Select 'Yes' if direct program funds were utilized to achieve this result. Select 'No' if the result was achieved organically (e.g., policy influence) without financial investment from the program.";

  get programInvestedFinancialResources(): boolean | null {
    return this.rdPartnersSE.partnersBody?.result_toc_result?.result_toc_results?.[0]?.program_invested_financial_resources ?? null;
  }
  set programInvestedFinancialResources(value: boolean) {
    (this.rdPartnersSE.partnersBody?.result_toc_result?.result_toc_results || []).forEach((row: any) => {
      row.program_invested_financial_resources = value;
    });
  }

  constructor(
    public api: ApiService,
    public rolesSE: RolesService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // P2-3427: the shared service is a root singleton; without this reset the split selections of the last W1/W2
    // result (`otherCentersSelected`, ToC reference centers) leak into the package and break the "exactly one
    // contributing center" check behind the automatic Lead center. W1/W2 does the same (component.ts:356).
    this.rdPartnersSE.resetState();
    // P2-3427 — the CLARISA centers/institutions catalogue can land AFTER this section's own GET and re-run
    // `setLeadCenterOnLoad`/`setLeadPartnerOnLoad` (service constructor). Let the service call us back so the
    // dirty baseline follows that catalogue-driven lead, not a user edit. Detached in `ngOnDestroy`.
    this.rdPartnersSE.onCatalogueDrivenLeadUpdate = this.onCatalogueDrivenLeadUpdate;
    this.getSectionInformation();
    this.requestEvent();
    this.api.dataControlSE.detailSectionTitle('Contributors');
    this.api.resultsSE.ipsrDataControlSE.inContributos = true;
    // only for p25
    if (this.fieldsManagerSE.isP25()) {
      this.GET_AllWithoutResults();
      // P2-3838: the projects catalogue carries each project's owner Center; re-derive once it lands.
      this.rdPartnersSE.loadClarisaProjects(() => this.syncProjectDerivedCentersAfterLoad());
    }
  }

  /** P2-3427 — detach our callback from the root-provided service (only if it is still ours). */
  ngOnDestroy(): void {
    if (this.rdPartnersSE.onCatalogueDrivenLeadUpdate === this.onCatalogueDrivenLeadUpdate) {
      this.rdPartnersSE.onCatalogueDrivenLeadUpdate = undefined;
    }
  }

  GET_AllWithoutResults() {
    const activePortfolio = this.api.dataControlSE.currentResult?.portfolio;
    this.api.resultsSE.GET_AllWithoutResults(activePortfolio).subscribe(({ response }) => {
      this.allContributingInitiatives = filterOutAvisaInitiatives(response);
      this.applyOwnerExclusion();
    });
  }

  /**
   * P2-3746 — the package's OWN Science Program must never be offered as a contributing one.
   *
   * The server drops it without saying so: `createTocMappingV2` runs
   * `pendingIds.filter(id => id !== initSubmitter.initiative_id)`
   * (`results-toc-results.service.ts:1596`) and `resultRequest` refuses to share a result with its
   * own owner (`share-result-request.service.ts:183`). So picking it answered `201`, the toast said
   * the section was saved, and the chip was gone on reload — the whole of P2-3746.
   *
   * Both sibling forms already exclude it and this one lost the filter in the P25 migration:
   * `rd-contributors-and-partners.component.ts:728` (`sp.id !== ownerId`) and
   * `ipsr-contributors-toc.component.ts:38`.
   *
   * 🛑 Re-filtering in a template getter would hand `app-pr-multi-select` a NEW array on every
   * change-detection pass, which is one of the two NG0103 loop conditions for that control. The
   * list is therefore recomputed only when one of its two inputs lands — the catalog here, and the
   * owner in `getSectionInformation` — so the reference stays stable in between.
   */
  private applyOwnerExclusion() {
    const ownerId = this.rdPartnersSE.partnersBody?.owner_initiative?.id ?? this.rdPartnersSE.partnersBody?.result_toc_result?.initiative_id;

    this.contributingInitiativesList =
      ownerId == null ? this.allContributingInitiatives : this.allContributingInitiatives.filter(init => init.id != ownerId);
  }

  toggleActiveContributor(item) {
    item.is_active = !item.is_active;
  }

  onRemoveContribuiting(index, isAcceptedArray: boolean) {
    if (isAcceptedArray) {
      this.rdPartnersSE.partnersBody.contributing_initiatives.accepted_contributing_initiatives.splice(index, 1);
    } else {
      this.rdPartnersSE.contributingInitiativeNew.splice(index, 1);
    }
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
    // P2-3427: the center the Lead pick auto-added is gone; forget it so the next pick does not strip a
    // center the user chose by hand.
    if (deletedCenter.length === 1 && this.rdPartnersSE.autoAddedLeadCenterCode === deletedCenter[0].code) {
      this.rdPartnersSE.autoAddedLeadCenterCode = null;
    }
    if (updateComponent) {
      setTimeout(() => {
        this.rdPartnersSE.updatingLeadData = false;
      }, 50);
    }
  }
  /** Shown only while the lead is a partner: partners still have to be added in this section first. */
  getMessageLead() {
    return `Please select the partner leading this result. <b>Only partners already added in this section can be selected as the result lead.</b>`;
  }

  /** The Lead center offers the full CLARISA catalogue (LC-DD-1), so no "already added" restriction applies. */
  getMessageLeadCenter() {
    return `Please select the CG Center leading this result.`;
  }

  /**
   * P2-3427 — W1/W2 behaviour brought to IPSR (`rd-contributors-and-partners.service.ts:701-749`), on the flat
   * path only: IPSR has a single "Contributing CGIAR Centers" list bound to `contributing_center`, so a lead
   * that is not a contributor yet is added straight there (never to the W1/W2 ToC/"Other(s)" split, which
   * this screen neither shows nor saves). Swapping the pick removes only the center THIS handler added.
   */
  onLeadCenterSelected(code: string | null): void {
    const list = this.rdPartnersSE.partnersBody.contributing_center || [];
    if (code && list.some(c => c.code === code)) return;

    let changed = false;
    const stale = this.rdPartnersSE.autoAddedLeadCenterCode;
    if (stale && list.some(c => c.code === stale)) {
      this.rdPartnersSE.partnersBody.contributing_center = list.filter(c => c.code !== stale);
      this.rdPartnersSE.autoAddedLeadCenterCode = null;
      changed = true;
    }

    if (code) {
      const center = this.centersSE.centersList?.find(c => c.code === code);
      if (center) {
        this.rdPartnersSE.partnersBody.contributing_center = [...(this.rdPartnersSE.partnersBody.contributing_center || []), { ...center }] as any[];
        this.rdPartnersSE.autoAddedLeadCenterCode = code;
        changed = true;
      }
    }

    if (changed) this.rdPartnersSE.setPossibleLeadCenters(true);
  }

  formatResultLabel(option: any): string {
    if (option?.result_code && option?.name) {
      let phaseInfo = '';
      if (option?.acronym && option?.phase_year) {
        phaseInfo = `(${option.acronym} - ${option.phase_year}) `;
      } else if (option?.acronym) {
        phaseInfo = `(${option.acronym}) `;
      } else if (option?.phase_year) {
        phaseInfo = `(${option.phase_year}) `;
      }

      const resultType = option?.result_type_name || option?.resultTypeName || option?.type_name || '';
      const resultTypeInfo = resultType ? ` (${resultType})` : '';

      const title = option?.title ? ` - ${option.title}` : '';

      return `${phaseInfo}${option.result_code} - ${option.name}${resultTypeInfo}${title}`;
    }
    return option?.title || option?.name || '';
  }

  getTocLogic() {
    this.theoryOfChangesServices.theoryOfChangeBody = this.contributorsBody;

    if (this.contributorsBody?.result_toc_result?.result_toc_results !== null) {
      this.theoryOfChangesServices.result_toc_result = this.contributorsBody?.result_toc_result;
      this.theoryOfChangesServices.result_toc_result.planned_result =
        this.contributorsBody?.result_toc_result?.result_toc_results[0]?.planned_result ?? null;
      this.theoryOfChangesServices.result_toc_result.showMultipleWPsContent = true;
    }

    if (this.contributorsBody?.contributors_result_toc_result !== null) {
      this.theoryOfChangesServices.contributors_result_toc_result = this.contributorsBody?.contributors_result_toc_result;
      this.theoryOfChangesServices.contributors_result_toc_result.forEach((tab: any, index) => {
        tab.planned_result = tab.result_toc_results[0]?.planned_result ?? null;
        tab.index = index;
        tab.showMultipleWPsContent = true;
      });
    }
  }

  getTocLogicp25(response: any) {
    //     //! TOC
    this.rdPartnersSE.partnersBody.linked_results = response.linked_results || [];
    this.rdPartnersSE.partnersBody?.contributing_and_primary_initiative.forEach(
      init => (init.full_name = `${init?.official_code} - <strong>${init?.short_name}</strong> - ${init?.initiative_name}`)
    );
    this.submitter = this.rdPartnersSE.partnersBody.contributing_and_primary_initiative.find(
      init => init.id === this.rdPartnersSE.partnersBody?.result_toc_result?.initiative_id
    )?.full_name;
    if (this.rdPartnersSE.partnersBody?.impactsTarge)
      this.rdPartnersSE.partnersBody?.impactsTarge.forEach(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
    if (this.rdPartnersSE.partnersBody?.sdgTargets)
      this.rdPartnersSE.partnersBody?.sdgTargets.forEach(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));
    if (this.rdPartnersSE.partnersBody?.result_toc_result?.result_toc_results !== null) {
      this.result_toc_result = this.rdPartnersSE.partnersBody?.result_toc_result;
      this.result_toc_result.planned_result = this.rdPartnersSE.partnersBody?.result_toc_result?.result_toc_results?.[0]?.planned_result ?? null;
      this.result_toc_result.showMultipleWPsContent = true;
      // P2-3427: a never-saved package arrives with no ToC row; give it the one the form expects.
      this.ensureTocRow(this.result_toc_result);
    }
    if (this.rdPartnersSE.partnersBody?.contributors_result_toc_result !== null) {
      this.contributors_result_toc_result = this.rdPartnersSE.partnersBody?.contributors_result_toc_result;
      this.contributors_result_toc_result.forEach((tab: any, index) => {
        tab.planned_result = tab.result_toc_results?.[0]?.planned_result ?? null;
        tab.index = index;
        tab.showMultipleWPsContent = true;
      });
    }
    this.rdPartnersSE.partnersBody.changePrimaryInit = this.rdPartnersSE.partnersBody?.result_toc_result.initiative_id;
    this.disabledOptions = [
      ...(this.rdPartnersSE.partnersBody?.contributing_initiatives.accepted_contributing_initiatives || []),
      ...(this.rdPartnersSE.partnersBody?.contributing_initiatives.pending_contributing_initiatives || [])
    ];
    this.initiativeIdSignal.set(this.rdPartnersSE.partnersBody?.result_toc_result?.initiative_id);

    this.getConsumed.set(true);
    this.contributorsBody.bilateral_projects.forEach(project => {
      project.fullName = project.obj_clarisa_project.fullName;
    });

    // Lead center/partner mapping on load — same order as W1/W2 (`rd-contributors-and-partners.service.ts:436-438`):
    // the saved lead is read FIRST and the auto-assign runs LAST. P2-3427: the previous order ran the auto-assign
    // inside `setPossibleLeadCenters(true)` and then `setLeadCenterOnLoad` overwrote it with `undefined`, so a
    // package with a single contributing center and no saved lead opened without a Lead center.
    this.rdPartnersSE.setPossibleLeadPartners(true, false);
    this.rdPartnersSE.setLeadPartnerOnLoad(true);
    this.rdPartnersSE.setPossibleLeadCenters(true, false);
    this.rdPartnersSE.setLeadCenterOnLoad(true);
    this.rdPartnersSE.runAutoAssignLeads();
    // P2-3838: saved projects lock (or re-add) their owner Center. Runs BEFORE the load snapshot in
    // `onSectionInformation`, so whatever it settles is part of the clean baseline.
    this.rdPartnersSE.syncProjectDerivedCenters({ animate: false });
  }

  /**
   * P2-3427 (PO's package 9638, 25-Sep-2026): a package that never saved its ToC answer comes back from the
   * server with ZERO `result_toc_results` rows. With no row, answering "Yes" showed only the "+" tab and an
   * empty strip instead of loading the Level (PO: "acá haría cargarme una vez el level… como se ha venido
   * trabajando"), and answering "No" left the financial-resources radio with no row to write to. W1/W2 always
   * gets at least one row from its endpoint; IPSR did not. Same shape as `multiple-wps.onAddTab()`.
   */
  ensureTocRow(item: any) {
    if (!item) return;
    if (!Array.isArray(item.result_toc_results)) item.result_toc_results = [];
    if (item.result_toc_results.length) return;
    item.result_toc_results.push({
      action_area_outcome_id: null,
      initiative_id: item.initiative_id,
      official_code: item.official_code,
      planned_result: item.planned_result ?? null,
      results_id: null,
      short_name: item.short_name,
      toc_level_id: null,
      toc_result_id: null,
      uniqueId: '0',
      related_node_id: null,
      toc_progressive_narrative: null,
      indicators: [{ related_node_id: null, targets: [{ contributing_indicator: null }] }]
    });
  }

  /**
   * P2-3843 — "Can this result be mapped to a ToC KPI? No" was lost on save. `ensureTocRow` (P2-3427) gives a
   * never-saved package a blank row so the form can render; on a "No" the server's `createTocMappingV2`
   * deactivates every active row and then re-writes only the rows that carry a `result_toc_result_id` or a
   * `toc_result_id` (`results-toc-results.service.ts` ~1889). A blank row is skipped, and because the array is
   * not empty the "no rows" branch that records the bare answer never runs — nothing is written, and the
   * reload comes back unanswered. Sending the "No" without the blank rows sends it down that branch, which
   * reads the financial-resources answer from the block, so it is lifted there from the row the radio wrote.
   * The on-screen body is left untouched: only the payload copy changes.
   */
  buildUnplannedSafeTocPayload(tocResult: any) {
    if (tocResult?.planned_result !== false || !Array.isArray(tocResult.result_toc_results)) return tocResult;
    const anchoredRows = tocResult.result_toc_results.filter((row: any) => row?.result_toc_result_id || row?.toc_result_id);
    if (anchoredRows.length === tocResult.result_toc_results.length) return tocResult;

    const payload: any = { ...tocResult, result_toc_results: anchoredRows };
    const financialResources = tocResult.result_toc_results[0]?.program_invested_financial_resources;
    if (financialResources !== undefined && payload.program_invested_financial_resources === undefined) {
      payload.program_invested_financial_resources = financialResources;
    }
    return payload;
  }

  onPlannedResultChange(item: any) {
    if (item?.result_toc_results?.length > 1) {
      item.result_toc_results = [item.result_toc_results[0]];
    }
    this.ensureTocRow(item);

    item?.result_toc_results?.forEach((tab: any) => {
      if (tab.indicators?.[0]) {
        tab.indicators[0].related_node_id = null;
        tab.indicators[0].toc_results_indicator_id = null;
        if (tab.indicators[0].targets?.[0]) {
          tab.indicators[0].targets[0].contributing_indicator = null;
        }
      }
      tab.toc_progressive_narrative = null;
      tab.toc_result_id = null;
      tab.toc_level_id = null;
    });

    this.tocConsumed = false;

    setTimeout(() => {
      this.tocConsumed = true;
      this.cdr.detectChanges();
    }, 200);
  }

  getSectionInformation() {
    this.rdPartnersSE.contributingInitiativeNew = [];
    this.api.resultsSE.GETContributorsByIpsrResultId(this.fieldsManagerSE.isP25()).subscribe({
      next: ({ response }) => this.onSectionInformation(response),
      // IPSR-8 — see `loaded`.
      error: () => {
        if (this.loaded() !== true) this.loaded.set(false);
      }
    });
  }

  private onSectionInformation(response: any) {
    {
      this.contributorsBody = response;
      this.rdPartnersSE.partnersBody = response;
      this.contributorsBody.institutions.forEach(item => (item.institutions_type_name = item.institutions_name));

      this.fieldsManagerSE.isP25() ? this.getTocLogicp25(response) : this.getTocLogic();

      this.disabledOptions = [
        ...(this.rdPartnersSE.partnersBody?.contributing_initiatives.accepted_contributing_initiatives || []),
        ...(this.rdPartnersSE.partnersBody?.contributing_initiatives.pending_contributing_initiatives || [])
      ];

      this.contributorsBody.contributingInitiativeNew = [];

      // P2-3746 — the owner only becomes known with this response; re-run the exclusion now.
      this.applyOwnerExclusion();
      this.loaded.set(true);

      // P2-3427 — the END of the load flow: `getTocLogicp25()` / `getTocLogic()` above are synchronous
      // (they also run `setLeadCenterOnLoad`/`runAutoAssignLeads`, so the lead fields already reflect this
      // load), and nothing else in this component mutates the body afterwards. A freshly loaded, untouched
      // section must report `hasUnsavedChanges() === false`.
      this.snapshotBaseline();
    }
  }

  saveTocLogic() {
    this.contributorsBody.result_toc_result = this.theoryOfChangesServices.theoryOfChangeBody.result_toc_result;

    this.contributorsBody.contributors_result_toc_result = this.theoryOfChangesServices.contributors_result_toc_result;
  }
  saveTocLogicp25() {
    // P2-3427: the Lead center is stamped whatever the partner toggle says, as W1/W2 does
    // (`rd-contributors-and-partners.component.ts:1091-1096`) — the two leads are decoupled.
    this.rdPartnersSE.partnersBody.contributing_center?.forEach(center => {
      center.is_leading_result = this.rdPartnersSE.leadCenterCode === center.code;
    });
    // Map the partner lead based on the is_lead_by_partner selection
    if (this.rdPartnersSE.partnersBody.is_lead_by_partner) {
      this.rdPartnersSE.partnersBody.mqap_institutions?.forEach(mqap => {
        mqap.is_leading_result = this.rdPartnersSE.leadPartnerId === mqap.institutions_id;
      });
      this.rdPartnersSE.partnersBody.institutions?.forEach(i => {
        i.is_leading_result = this.rdPartnersSE.leadPartnerId === i.institutions_id;
      });
    } else {
      this.rdPartnersSE.partnersBody.mqap_institutions?.forEach(mqap => {
        mqap.is_leading_result = false;
      });
      this.rdPartnersSE.partnersBody.institutions?.forEach(i => {
        i.is_leading_result = false;
      });
    }
  }

  onSaveSection() {
    // IPSR-8 — never send a body that was not read from the server (see `loaded`).
    if (this.loaded() !== true) return;
    this.performSave().subscribe({ error: () => {} });
  }

  /** P2-3427 — `CanComponentDeactivate.hasUnsavedChanges()`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtySnapshotValue());
  }

  /**
   * P2-3427 — `CanComponentDeactivate.saveSection()`. Wraps `performSave()`'s exact PATCH call to resolve
   * `true`/`false` instead of void, for `UnsavedChangesGuard`. The IPSR-8 precondition resolves `false`
   * without calling the server, exactly as the Save button refuses.
   */
  saveSection(): Observable<boolean> {
    if (this.loaded() !== true) return of(false);
    return this.performSave().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * P2-3427 — the value the dirty tracker snapshots and diffs: `contributorsBody` (same object as
   * `rdPartnersSE.partnersBody`) with its ToC rows normalized (`normalizeTocResultsForDiff()`), PLUS the
   * fields the PATCH payload reads from `RdContributorsAndPartnersService` that are not on the body:
   * the Lead center / Lead partner (stamped onto `is_leading_result` only at save time by
   * `saveTocLogicp25()`), the "Other(s)" External Partners and the P25 new contributing initiatives. Same shape as W1/W2's
   * `dirtySnapshotValue()`; the body's own `contributingInitiativeNew` (non-P25 path) travels in the spread.
   */
  private dirtySnapshotValue(): Record<string, unknown> {
    const body: any = this.contributorsBody;
    const resultTocResult = body?.result_toc_result
      ? { ...body.result_toc_result, result_toc_results: this.normalizeTocResultsForDiff(body.result_toc_result.result_toc_results) }
      : body?.result_toc_result;
    const contributorsResultTocResult = (body?.contributors_result_toc_result ?? []).map((contributor: any) => ({
      ...contributor,
      result_toc_results: this.normalizeTocResultsForDiff(contributor?.result_toc_results)
    }));
    return {
      ...body,
      result_toc_result: resultTocResult,
      contributors_result_toc_result: contributorsResultTocResult,
      leadCenterCode: this.rdPartnersSE.leadCenterCode,
      leadPartnerId: this.rdPartnersSE.leadPartnerId,
      // P2-3066 "Other(s)" External Partners: picked in the second dropdown, kept on the service, sent in the payload.
      otherPartnersSelected: this.rdPartnersSE.otherPartnersSelected,
      serviceContributingInitiativeNew: this.rdPartnersSE.contributingInitiativeNew
    };
  }

  /**
   * P2-3427 — the shared ToC children write client-only fields onto the rows AFTER this component's
   * snapshot: `CPMultipleWPsComponent.ngOnChanges()` stamps `uniqueId`, and `multiple-wps-content`'s
   * `getIndicatorsList()` mirrors `toc_results_indicator_id` into `indicators[0].related_node_id` and
   * defaults `toc_progressive_narrative` from `null` to `''`. None of them is a user edit, so they are
   * stripped/normalized on BOTH sides of the diff (same rule as W1/W2's `normalizeTocResultsForDiff()`).
   */
  private normalizeTocResultsForDiff(rows: any[] | undefined | null): any[] {
    return (rows ?? []).map((row: any) => {
      const { uniqueId, ...rest } = row ?? {};
      const indicators = (rest.indicators ?? []).map((indicator: any) => {
        const { related_node_id, ...indicatorRest } = indicator ?? {};
        return indicatorRest;
      });
      return {
        ...rest,
        indicators,
        toc_progressive_narrative: rest.toc_progressive_narrative ?? ''
      };
    });
  }

  /**
   * P2-3838 — project → owner Center sync for data that lands AFTER the load snapshot (projects catalogue,
   * centers catalogue). Deriving a Center there is not a user edit, so a section that was clean stays clean:
   * the baseline moves with it. A section the user already edited keeps its baseline, so the edit is not
   * swallowed (same rule as `reconcileLeadFieldsAfterLateCatalogue`).
   */
  private syncProjectDerivedCentersAfterLoad(): void {
    const wasClean = !!this.lastDirtySnapshot && !this.hasUnsavedChanges();
    this.rdPartnersSE.syncProjectDerivedCenters({ animate: false });
    if (wasClean) this.snapshotBaseline();
  }

  /** P2-3427 — single write path for the tracker's baseline and its frozen structural copy. */
  private snapshotBaseline(value: Record<string, unknown> = this.dirtySnapshotValue()): void {
    this.dirtyTracker.snapshot(value);
    this.lastDirtySnapshot = JSON.parse(JSON.stringify(value));
  }

  /**
   * P2-3427 — invoked by the service whenever the centers/institutions catalogue emits `loaded`, which may
   * re-run `setLeadCenterOnLoad`/`setLeadPartnerOnLoad` after our snapshot on a cold entry (hard reload or
   * deep link straight onto this section). The baseline moves ONLY when nothing but that one lead field
   * differs from it: a real concurrent edit must stay dirty, and a plain "re-snapshot" would swallow it.
   */
  private reconcileLeadFieldsAfterLateCatalogue(source: 'centers' | 'institutions'): void {
    if (!this.lastDirtySnapshot) return;
    const current = this.dirtySnapshotValue();
    const currentWithBaselineLeadFields = {
      ...current,
      ...(source === 'institutions' ? { leadPartnerId: this.lastDirtySnapshot['leadPartnerId'] } : {}),
      ...(source === 'centers' ? { leadCenterCode: this.lastDirtySnapshot['leadCenterCode'] } : {})
    };
    if (JSON.stringify(currentWithBaselineLeadFields) !== JSON.stringify(this.lastDirtySnapshot)) return;
    this.snapshotBaseline(current);
  }

  /**
   * P2-3427 — returns the PATCH `Observable` instead of self-subscribing, so the Save button
   * (`onSaveSection`) and the guard (`saveSection`) drive the exact same payload and side effects.
   * The body of this method is the former `onSaveSection()`, moved verbatim.
   */
  private performSave(): Observable<void> {
    this.fieldsManagerSE.isP25() ? this.saveTocLogicp25() : this.saveTocLogic();

    const sendedData: any = {
      ...this.contributorsBody,
      contributing_initiatives: {
        ...this.contributorsBody.contributing_initiatives,
        pending_contributing_initiatives: [
          ...this.contributorsBody.contributing_initiatives.pending_contributing_initiatives,
          ...this.contributorsBody.contributingInitiativeNew
        ]
      },
      contributing_center: this.rdPartnersSE.partnersBody.contributing_center,
      bilateral_projects: this.rdPartnersSE.partnersBody.bilateral_projects
    };

    if (this.fieldsManagerSE.isP25()) {
      sendedData.contributing_initiatives.pending_contributing_initiatives = [
        ...this.rdPartnersSE.contributingInitiativeNew,
        ...this.contributorsBody.contributing_initiatives.pending_contributing_initiatives
      ];
      sendedData.result_toc_result = this.buildUnplannedSafeTocPayload(this.rdPartnersSE.partnersBody.result_toc_result);
      sendedData.is_lead_by_partner = this.rdPartnersSE.partnersBody.is_lead_by_partner;
      // P2-3427 (Ángel, 28-Sep-2026 review, prtest) — the shared External Partners selector (`normal-selector`,
      // P2-3066) keeps the "Other(s)" SENTINEL (`institutions_id = OTHER_PARTNERS_CODE`, -999999) inside
      // `partnersBody.institutions` and the partners picked in the second dropdown in
      // `rdPartnersSE.otherPartnersSelected`. Sending `institutions` as-is posted the sentinel — MySQL answered
      // "Cannot add or update a child row: a foreign key constraint fails (results_by_institution.institutions_id
      // -> clarisa_institutions.id)" — and silently dropped the chosen Other(s). Same payload as W1/W2
      // (`rd-contributors-and-partners.component.ts:1142-1151`), which this endpoint shares on the server
      // (`contributors-partners.service.ts:243` → `results_by_institutions.service.ts:1092/1107`): ToC partners minus
      // the sentinel (`from_toc: true`) ∪ Other(s) (`from_toc: false`), lead computed with the ONE criterion
      // `saveTocLogicp25()` already stamps (`is_lead_by_partner && leadPartnerId === institutions_id`). Gated on the
      // 2026 phase exactly like W1/W2: the sentinel and `otherPartnersSelected` only exist there (`applyTocMappingOnLoad`
      // returns early otherwise, `normal-selector.component.html:183`), so a 2025 package keeps today's payload.
      if (this.isCP2026()) {
        const isLeadByPartner = !!this.rdPartnersSE.partnersBody.is_lead_by_partner;
        const isLeadPartner = (p: any) => isLeadByPartner && this.rdPartnersSE.leadPartnerId === p?.institutions_id;
        const tocPartners = (this.rdPartnersSE.partnersBody.institutions || [])
          .filter((p: any) => p?.institutions_id !== this.rdPartnersSE.OTHER_PARTNERS_CODE)
          .map((p: any) => ({ ...p, from_toc: true, is_leading_result: isLeadPartner(p) }));
        const otherPartners = (this.rdPartnersSE.otherPartnersSelected || []).map((p: any) => ({
          ...p,
          from_toc: false,
          is_leading_result: isLeadPartner(p)
        }));
        sendedData.institutions = [...tocPartners, ...otherPartners];
      } else {
        sendedData.institutions = this.rdPartnersSE.partnersBody.institutions;
      }
      sendedData.mqap_institutions = this.rdPartnersSE.partnersBody.mqap_institutions;
    }

    // Night sweep 2026-09-23, IPSR-7 — the GET body carries `has_innovation_link` / `linked_results`,
    // and spreading it echoed them back. No IPSR screen asks that question, but the shared P25 service
    // (`contributors-partners.service.ts` ~373, ~474-482) reads their mere presence as an answer and
    // re-wrote the links, dropping the ones Step 2.1 had auto-linked (prtest 12037: 1 → 0). Absent keys
    // mean "leave untouched" there, so they are not sent.
    delete sendedData.has_innovation_link;
    delete sendedData.linked_results;

    return this.api.resultsSE.PATCHContributorsByIpsrResultId(sendedData, this.fieldsManagerSE.isP25()).pipe(
      tap(() => {
        // Snapshot HERE, synchronously, the instant the PATCH resolves — after `saveTocLogic*()` stamped the
        // leads onto the body, so the persisted state is the baseline. `saveSection()`'s `map(() => true)` can
        // reach the guard before the reload below (and its own re-snapshot) lands, or the reload can fail:
        // a genuinely saved section must not report dirty in either case.
        this.snapshotBaseline();
        this.getSectionInformation();
        this.ipsrCompletenessStatusSE.updateGreenChecks();
      }),
      map(() => undefined),
      catchError(err => {
        console.error(err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Wires the "request partners" alerts once they exist in the DOM.
   *
   * 🛑 `findClassTenSeconds` RESOLVES WITH `false` when the element never shows up — it gives up
   * after ten one-second polls and does not reject (`data-control.service.ts:180-195`). The previous
   * body ignored what it resolved with and ran its own `document.querySelector(...).addEventListener`,
   * so on every section where these alerts are simply not rendered `querySelector` returned `null`
   * and threw `Cannot read properties of null (reading 'addEventListener')`. The `try/catch` swallowed
   * it into a `console.error`, which is the error QA pasted into P2-3673 as evidence.
   *
   * Using the resolved element removes both the throw and the second lookup — the first search
   * already found it, and re-querying could legitimately answer something else after ten seconds of
   * rendering.
   */
  requestEvent() {
    const openPartnersRequest = () => (this.api.dataControlSE.showPartnersRequest = true);

    ['alert-event', 'alert-event-2'].forEach(className => {
      this.api.dataControlSE.findClassTenSeconds(className).then(element => {
        // `false` is the give-up value, so an optional chain is not enough — it is not nullish.
        const target = element as HTMLElement | false;
        if (target && typeof target.addEventListener === 'function') {
          target.addEventListener('click', openPartnersRequest);
        }
      });
    });
  }

  getContributorDescription(contributor: any) {
    const contributorsText = `<strong>${contributor?.official_code} ${contributor?.short_name}</strong> - ${this.tocQuestionLabel()}`;

    if (!contributor?.result_toc_results?.length) {
      return `<strong>${contributor?.official_code} ${contributor?.short_name}</strong> - Pending confirmation`;
    }

    return contributorsText;
  }
}
