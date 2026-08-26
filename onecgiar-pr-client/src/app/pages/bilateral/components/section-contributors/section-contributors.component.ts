import { Component, inject, computed, signal, OnInit, OnDestroy, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../shared/services/global/institutions.service';
import { InnovationUseResultsService } from '../../../../shared/services/global/innovation-use-results.service';
import { SectionTocComponent } from '../section-toc/section-toc.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';

interface CenterOption {
  institutionId: number;
  code: string;
  name: string;
  acronym: string;
  full_name: string;
}

interface ProjectOption {
  id: number;
  shortName: string;
  fullName: string;
}

const PARTNERS_MDS_GROUP = 'partners';

@Component({
  selector: 'app-section-contributors',
  imports: [CommonModule, FormsModule, CustomFieldsModule, SectionTocComponent],
  templateUrl: './section-contributors.component.html',
  styleUrl: './section-contributors.component.scss'
})
export class SectionContributorsComponent implements OnInit, OnDestroy {
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);
  readonly autoSave = inject(BilateralAutoSaveService);
  readonly centersService = inject(CentersService);
  readonly institutionsService = inject(InstitutionsService);
  readonly innovationUseResultsSE = inject(InnovationUseResultsService);
  readonly api = inject(ApiService);
  readonly bilateralApi = inject(BilateralApiService);

  private centersSubscription?: Subscription;

  readonly primarySpData = computed(() => {
    const sp = this.creationService.selectedPrimarySp();
    if (!sp) return null;
    const project = this.creationService.selectedProject();
    const sps = project?.sciencePrograms ?? [];
    const full = sps.find(s => s.programId === sp.programId);
    return {
      programCode: sp.programCode,
      allocation: sp.allocation,
      shortName: sp.shortName || full?.spShortName || '',
      name: sp.name || full?.spName || '',
      iconSrc: `assets/result-framework-reporting/SPs-Icons/${sp.programCode}.png`,
    };
  });

  availableCenters = signal<CenterOption[]>([]);
  selectedCenterInstitutionIds = signal<number[]>([]);

  availableProjects = signal<ProjectOption[]>([]);
  selectedProjectIds = signal<number[]>([]);

  readonly availableProjectsComputed = computed(() => {
    const leadProj = this.creationService.selectedProject();
    const leadId = leadProj?.id ? Number(leadProj.id) : null;
    return this.availableProjects().map(p => ({
      ...p,
      disabled: Number(p.id) === leadId
    }));
  });

  readonly availableCentersComputed = computed(() => {
    const project = this.creationService.selectedProject();
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const leadCenterId = project?.leadCenter?.id ?? resultLeadCenterId;
    const leadInstId = leadCenterId ? Number(leadCenterId) : null;
    return this.availableCenters().map(c => ({
      ...c,
      disabled: Number(c.institutionId) === leadInstId
    }));
  });

  readonly disabledCenterOptions = computed(() => this.availableCentersComputed().filter(c => c.disabled));
  readonly disabledProjectOptions = computed(() => this.availableProjectsComputed().filter(p => p.disabled));

  // ─────────────────────────────────────────────────────────────────────────
  // P2-3368 · Contributing science programs (optional, multi)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Options come from the project's own science programs, minus the primary one (the story excludes
   * SP01 because it is already shown as "Primary contributing science program").
   *
   * ⚠️ `BilateralCreationService.selectedProject().sciencePrograms` is set to `[]` when an EXISTING
   * result is loaded (`bilateral-creation.service.ts:170`) — only the creation wizard fills it. So on
   * a saved result this list is empty and the dropdown is not rendered at all; the chips below it
   * remain the read-only view of whatever was chosen at creation time. Do not "fix" that by rendering
   * an empty dropdown: a control with nothing in it reads as a bug to the user.
   */
  readonly availableSecondarySpOptions = computed(() => {
    const primaryId = this.creationService.selectedPrimarySp()?.programId;
    const sps = (this.creationService.selectedProject()?.sciencePrograms ?? []) as any[];
    return sps
      .filter(sp => sp?.programId != null && sp.programId !== primaryId)
      .map(sp => ({
        programId: Number(sp.programId),
        programCode: sp.programCode,
        allocation: sp.allocation ?? '',
        full_name: `${sp.programCode}${sp.spName || sp.spShortName ? ' - ' + (sp.spName || sp.spShortName) : ''}`
      }));
  });

  readonly selectedSecondarySpIds = computed(() => this.creationService.selectedSecondarySps().map(sp => Number(sp.programId)));

  /**
   * 🛑 HOUSE RULE — a control whose value cannot be stored ships VISIBLE BUT DISABLED with a
   * `Coming soon` tag, and never tells the user it will be saved.
   *
   * Three controls are in that state here: **Contributing science programs**, the
   * **linked/bundled question** and the **results dropdown** it unlocks. None of them has a field
   * on `SaveBilateralContributorsDto` nor a home in the bilateral detail payload, so answering
   * them wrote to a component signal and nothing else — the answer was gone on the next reload.
   * Same markup as `result-ai-item.component.html` (`globalDisabled` + the tag span).
   *
   * The flag is a named member rather than a literal in the template because the spec overrides
   * the template: an inline `[ngClass]="{ globalDisabled: true }"` would be untestable. Flip it to
   * `false` — and put the fields back into `hiddenFieldsWithValues()` — the day the DTO accepts
   * them.
   */
  readonly unpersistedFieldsComingSoon: boolean = true;

  // ─────────────────────────────────────────────────────────────────────────
  // P2-3368 · External partners (mandatory: at least one partner OR the "no partners" checkbox)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Same catalogue W1/W2 uses for External partners (`InstitutionsService`), read through the SIGNAL
   * view on purpose — the plain array is not a reactive dependency and any `computed()` over it
   * caches an empty list forever (P2-3335).
   */
  readonly availablePartners = this.institutionsService.institutionsWithoutCentersPartners;

  selectedPartnerInstitutionIds = signal<number[]>([]);
  noExternalPartners = signal(false);

  /**
   * P2-3443. Until the stored partner block has come back from the server the PATCH must NOT carry
   * the partner keys: `saveContributors` is fired by every centre/project change too, and sending
   * an empty `institutions` before hydration would wipe the partners the user saved last session.
   * Omitting the keys is what tells the server "leave this block alone".
   */
  readonly partnersHydrated = signal(false);
  private partnersLoadedForResultId: number | null = null;

  /**
   * The read failed and there is NO automatic second chance: `hydrateWhenReady` only re-runs when
   * one of the signals it tracks changes, and after the initial load none of them does. Without a
   * visible error the section became a black hole — the user picked partners, the block went green
   * and Submit unlocked, while every PATCH silently dropped `institutions`. So the failure is shown
   * with a Retry, and `updateContributorsMds()` keeps `external-partners` unfilled meanwhile.
   */
  readonly partnersLoadFailed = signal(false);

  /** AC5/AC7: the field is satisfied by EITHER at least one partner OR the explicit "none" declaration. */
  readonly externalPartnersSatisfied = computed(() => this.noExternalPartners() || this.selectedPartnerInstitutionIds().length > 0);

  // ─────────────────────────────────────────────────────────────────────────
  // P2-3368 · Full metadata toggle + linked/bundled question
  // ─────────────────────────────────────────────────────────────────────────
  showAllFields = signal(this.loadShowAllFromStorage());

  /**
   * P2-3358 wording: ONE question for every typology. Kept verbatim in sync with
   * `rd-contributors-and-partners.component.ts:234` (W1/W2) and with
   * `FieldsManagerService.fields()['[innovation-use-form]-has-innovation-link']`.
   */
  readonly linkedResultQuestionLabel =
    'Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?';

  readonly yesNoOptions = [
    { value: true, label: 'Yes' },
    { value: false, label: 'No' }
  ];

  hasLinkedResult = signal<boolean | null>(null);
  selectedLinkedResultIds = signal<(number | string)[]>([]);

  /**
   * AC13's message ("N hidden field(s) has values and will be saved.") is a PROMISE, and the only
   * field behind the toggle is the linked/bundled question — which is `Coming soon` precisely
   * because nothing persists it (see `unpersistedFieldsComingSoon`). Counting it made the screen
   * promise a save that never happened: the user answered, read the note, reloaded, and the answer
   * was gone.
   *
   * So the count is 0 while every hidden field is Coming soon, and the note never renders. This
   * stays a `computed` — not a constant — because it is the template's contract: add the term back
   * here, one per field, as soon as a hidden field actually reaches the server.
   */
  readonly hiddenFieldsWithValues = computed(() => {
    if (this.unpersistedFieldsComingSoon) return 0;
    return this.hasLinkedResult() !== null || this.selectedLinkedResultIds().length > 0 ? 1 : 0;
  });

  readonly showHiddenFieldsNote = computed(() => !this.showAllFields() && this.hiddenFieldsWithValues() > 0);

  /**
   * The three Block-2 gates are named computeds rather than inline template expressions so the spec
   * can assert the SAME expression the template renders. The suite overrides the template (see
   * `section-contributors.component.spec.ts`), so an inline `@if` would be untested.
   */
  readonly showLinkedResultQuestion = computed(() => this.showAllFields());
  readonly showLinkedResultsDropdown = computed(() => this.showLinkedResultQuestion() && this.hasLinkedResult() === true);
  readonly fullMetadataButtonLabel = computed(() => (this.showAllFields() ? 'Hide full metadata' : 'Complete full metadata'));

  readonlyLeadCenterInstitutionId: number | null = null;
  readonlyLeadProjectId: number | null = null;

  private readonly centersReady = signal(false);
  private readonly projectsReady = signal(false);

  /**
   * True once the stored centres and projects are actually on screen.
   *
   * ⚠️ Until this flips, `contributing_center` and `contributing_bilateral_projects` MUST NOT
   * travel. Both arrays are built by filtering the selection against the loaded catalogues
   * (`availableCenters` / `availableProjects`), so before the catalogues arrive — or after a failed
   * GET, which still sets `projectsReady` — they filter down to `[]`. An explicit `[]` is not
   * "no change" to the server: `syncContributingCenters` runs `upDateAllInactive`, which
   * deactivates EVERY `results_center` row of the result WITHOUT excluding `is_leading_result`,
   * and `syncBilateralProjects` drops the lead project the same way.
   *
   * The result is unrecoverable from the UI: the lead centre is read-only here, and
   * `assertCenterPermission` then refuses the submit forever with "The result has no lead center
   * assigned". Same invariant `partnersHydrated` already enforces for the partner keys.
   */
  readonly contributorsHydrated = signal(false);

  private readonly hydrateWhenReady = effect(() => {
    const loading = this.creationService.isLoadingResult();
    const centersReady = this.centersReady();
    const projectsReady = this.projectsReady();
    // Touch contributing ids so hydrate re-runs after result detail arrives.
    this.creationService.resultContributingCenterIds();
    this.creationService.resultContributingProjectIds();
    this.creationService.resultLeadCenterId();
    this.creationService.selectedProject();
    this.creationService.currentResultId();
    if (loading || !centersReady || !projectsReady) return;
    untracked(() => {
      this.hydrateLeadAndSelection();
      this.loadExternalPartnersState();
      this.contributorsHydrated.set(true);
    });
  });

  ngOnInit(): void {
    this.loadCenters();
    this.loadProjects();
  }

  private loadProjects(): void {
    this.api.resultsSE.GET_ClarisaProjects().subscribe({
      next: ({ response }) => {
        this.availableProjects.set(
          (response ?? []).map((p: any) => ({
            id: Number(p.id),
            shortName: p.shortName,
            fullName: p.fullName,
          }))
        );
        this.projectsReady.set(true);
      },
      error: () => {
        this.availableProjects.set([]);
        this.projectsReady.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.centersSubscription?.unsubscribe();
  }

  private loadCenters(): void {
    if (this.centersService.centersList?.length) {
      this.mapCenters();
      return;
    }
    this.centersSubscription = this.centersService.loadedCenters.subscribe(() => {
      this.mapCenters();
    });
    this.centersService.getData()?.catch(() => {});
  }

  private mapCenters(): void {
    const centers = this.centersService.centersList ?? [];
    this.availableCenters.set(
      centers.map(c => ({
        institutionId: c.institutionId,
        code: c.code,
        name: c.name,
        acronym: (c as any).acronym || c.code,
        full_name: `${(c as any).acronym || c.code} - ${c.name}`,
      }))
    );
    this.centersReady.set(true);
  }

  /** One-shot UI hydrate after centers/projects/result data are available. No network. */
  hydrateLeadAndSelection(): void {
    const project = this.creationService.selectedProject();
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const leadCenterId = project?.leadCenter?.id ?? resultLeadCenterId;

    if (leadCenterId && this.availableCenters().length) {
      const leadInstitutionId = Number(leadCenterId);
      if (this.availableCenters().some(c => c.institutionId === leadInstitutionId)) {
        this.readonlyLeadCenterInstitutionId = leadInstitutionId;
      }
    }

    if (project?.id && this.availableProjects().length) {
      const leadProjId = Number(project.id);
      if (this.availableProjects().some(p => p.id === leadProjId)) {
        this.readonlyLeadProjectId = leadProjId;
      }
    }

    const centerIds = new Set<number>(this.creationService.resultContributingCenterIds());
    if (this.readonlyLeadCenterInstitutionId != null) {
      centerIds.add(this.readonlyLeadCenterInstitutionId);
    }
    this.selectedCenterInstitutionIds.set(Array.from(centerIds));

    const projectIds = new Set<number>(this.creationService.resultContributingProjectIds());
    if (this.readonlyLeadProjectId != null) {
      projectIds.add(this.readonlyLeadProjectId);
    }
    this.selectedProjectIds.set(Array.from(projectIds));

    this.updateContributorsMds();
  }

  private buildContributorsPayload(): {
    contributing_center?: { institution_id: number }[];
    contributing_bilateral_projects?: { project_id: number; is_lead?: boolean }[];
    institutions?: { institutions_id: number }[];
    no_external_partners?: boolean;
    is_lead_by_partner?: boolean;
  } {
    const selectedCenters = this.selectedCenterInstitutionIds()
      .map(id => {
        const center = this.availableCenters().find(c => c.institutionId === id);
        return center ? { institution_id: center.institutionId } : null;
      })
      .filter(Boolean) as { institution_id: number }[];

    const leadProjectId = this.readonlyLeadProjectId ?? this.creationService.selectedProject()?.id ?? null;
    const selectedProjects = this.selectedProjectIds()
      .map(id => {
        const exists = this.availableProjects().some(p => p.id === id);
        return exists
          ? {
              project_id: id,
              is_lead: leadProjectId != null && id === Number(leadProjectId),
            }
          : null;
      })
      .filter(Boolean) as { project_id: number; is_lead?: boolean }[];

    const payload: {
      contributing_center?: { institution_id: number }[];
      contributing_bilateral_projects?: { project_id: number; is_lead?: boolean }[];
      institutions?: { institutions_id: number }[];
      no_external_partners?: boolean;
      is_lead_by_partner?: boolean;
    } = {};

    // See `contributorsHydrated`: omitting the keys is the only safe default. The server treats a
    // missing key as "leave untouched" (`dto.contributing_center !== undefined`) but an empty array
    // as "deactivate everything, lead row included".
    if (this.contributorsHydrated()) {
      payload.contributing_center = selectedCenters;
      payload.contributing_bilateral_projects = selectedProjects;
    }

    // P2-3443. The partner keys only travel once the stored block is on screen — see
    // `partnersHydrated`. `institutions` is sent even when the box is ticked so the server has an
    // explicit empty set to reconcile against.
    if (this.partnersHydrated()) {
      payload.institutions = this.noExternalPartners()
        ? []
        : this.selectedPartnerInstitutionIds().map(id => ({ institutions_id: Number(id) }));
      payload.no_external_partners = this.noExternalPartners();
      // A bilateral result is always led by its lead centre — the section has no "led by a partner"
      // control and the lead centre is read-only above. Sent explicitly because the shared
      // `validation_partners_*` MySQL functions treat a NULL `is_lead_by_partner` as "not answered"
      // and never turn the section green.
      payload.is_lead_by_partner = false;
    }

    return payload;
  }

  private persistContributors(): void {
    this.autoSave.saveContributors(this.buildContributorsPayload());
    this.updateContributorsMds();
  }

  /**
   * Partner slots for the progress aside (ToC publishes its own group).
   *
   * Same defect class as P2-3348, found while fixing it: `contributing-selection` used to be tracked
   * here even though both multi-selects that feed it render `[required]="false"` — and Submit is gated
   * on `overallStatus() === 'complete'`, so a field the UI labels Optional could hold the button
   * disabled with nothing on screen explaining why. The tracker must mirror the Mandatory/Optional
   * affordance the user actually sees. Contributing centers and projects are genuinely optional
   * additions beyond the lead pair, so they are no longer counted. If product wants them mandatory,
   * flip `[required]` in the template and re-add the item here — not the other way round.
   */
  updateContributorsMds(): void {
    this.mdsTracker.setSectionFields(
      'contributors',
      [
        {
          key: 'lead-center',
          label: 'Lead center',
          filled: this.readonlyLeadCenterInstitutionId != null,
        },
        {
          key: 'lead-project',
          label: 'Lead project',
          filled: this.readonlyLeadProjectId != null,
        },
        // P2-3443: restored. It was held out of the tracker only because the answer was not
        // persisted — a reload turned it back to incomplete and Submit stayed blocked with no way
        // out. Now that the partners and the "no external partners" flag round-trip, the mandatory
        // affordance the user sees (red asterisk + inline hint) matches what gates Submit again.
        {
          key: 'external-partners',
          label: 'External partners',
          // 🛑 INVARIANT: a field is never reported as satisfied while the payload is throwing its
          // keys away. `buildContributorsPayload()` omits `institutions`, `no_external_partners`
          // and `is_lead_by_partner` until `partnersHydrated()` is true (and a failed read leaves
          // it false forever), so a selection made in that window reaches no server. Reporting it
          // `filled` turned the green tick and the Submit gate into a lie — the user chose
          // partners, the section went green, and nothing was ever written.
          filled: this.partnersHydrated() && this.externalPartnersSatisfied(),
        },
      ],
      PARTNERS_MDS_GROUP
    );
  }

  // ───────────────────────── P2-3368 · contributing science programs ─────────────────────────

  onSecondarySpsModelChange(selected: any[]): void {
    const ids = (selected ?? []).map(item => (typeof item === 'object' && item !== null ? Number(item.programId) : Number(item)));
    const options = this.availableSecondarySpOptions();
    const next = ids
      .map(id => options.find(o => o.programId === id))
      .filter(Boolean)
      .map(o => ({ programId: o!.programId, programCode: o!.programCode, allocation: o!.allocation }));
    // ⚠️ UNREACHABLE from the UI while `unpersistedFieldsComingSoon` is true: the multi-select is
    // rendered disabled with a `Coming soon` tag precisely because nothing persists this —
    // SaveBilateralContributorsDto has no field for it and the selection lives in
    // BilateralCreationService only. Kept so the wiring is one flag away from working.
    this.creationService.selectedSecondarySps.set(next);
  }

  // ───────────────────────── P2-3368 · external partners ─────────────────────────

  onPartnersModelChange(selected: any[]): void {
    const ids = (selected ?? []).map(item => (typeof item === 'object' && item !== null ? Number(item.institutions_id) : Number(item)));
    this.selectedPartnerInstitutionIds.set(ids);
    this.persistExternalPartners();
  }

  /**
   * Edge case in the story: checking the box hides the dropdown and satisfies the field; unchecking it
   * puts the field straight back into the unsatisfied state when no partner is selected. Selections are
   * cleared on check so a hidden list can never be submitted behind the user's back — same rule W1/W2
   * applies in `rd-contributors-and-partners.component.ts:401`.
   */
  onNoExternalPartnersChange(): void {
    if (this.noExternalPartners()) {
      this.selectedPartnerInstitutionIds.set([]);
    }
    this.persistExternalPartners();
  }

  removePartner(id: number): void {
    this.selectedPartnerInstitutionIds.set(this.selectedPartnerInstitutionIds().filter(i => i !== id));
    this.persistExternalPartners();
  }

  getPartnerDisplayName(id: number): string {
    const partner = (this.availablePartners() ?? []).find((p: any) => Number(p.institutions_id) === Number(id));
    if (!partner) return String(id);
    return partner.institutions_acronym || partner.institutions_name || String(id);
  }

  /**
   * P2-3443. Goes through the very same PATCH the centres and projects use — the server now accepts
   * `institutions`, `no_external_partners` and `is_lead_by_partner` on
   * `SaveBilateralContributorsDto` and writes them to `results_by_institution` + the two `result`
   * flags, exactly like the pool-funding partners form does.
   */
  private persistExternalPartners(): void {
    this.autoSave.saveContributors(this.buildContributorsPayload());
    this.updateContributorsMds();
  }

  /**
   * P2-3443 — one-shot read of the stored partner block for an existing result.
   *
   * It re-reads the bilateral detail endpoint instead of taking the values from
   * `BilateralCreationService`: that service does not keep `contributingInstitutions` nor the two
   * flags, and this section is the only consumer of them. Guarded by `partnersLoadedForResultId`
   * so the hydrate effect — which re-runs on several signals — cannot loop on the network.
   */
  private loadExternalPartnersState(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    if (this.partnersLoadedForResultId === resultId) return;
    this.partnersLoadedForResultId = resultId;

    this.partnersLoadFailed.set(false);
    this.bilateralApi.GET_BilateralResultDetail(resultId).subscribe({
      next: ({ response }) => {
        const ids = (response?.contributingInstitutions ?? [])
          .map((inst: any) => Number(inst?.institutions_id))
          .filter((id: number) => Number.isFinite(id) && id > 0);
        this.selectedPartnerInstitutionIds.set(Array.from(new Set<number>(ids)));
        // `no_applicable_partner` is a MySQL tinyint and can arrive as the string '0', which `!!`
        // reads as true — compare numerically (same trap as `is_ai_generated`).
        this.noExternalPartners.set(ids.length === 0 && Number(response?.commonFields?.no_applicable_partner) === 1);
        this.partnersHydrated.set(true);
        this.updateContributorsMds();
      },
      error: () => {
        // Leave the block unhydrated: a failed read must not let an empty selection overwrite
        // stored partners on the next centre/project change. Clearing the guard is what lets
        // `retryLoadExternalPartners()` fire the GET again — the hydrate effect will not.
        this.partnersLoadedForResultId = null;
        this.partnersLoadFailed.set(true);
        // Re-publish so `external-partners` drops back to unfilled: the section must not stay
        // green on a selection whose keys the next PATCH will discard.
        this.updateContributorsMds();
      }
    });
  }

  /** Manual second chance for a failed partner read — the hydrate effect never re-fires by itself. */
  retryLoadExternalPartners(): void {
    this.partnersLoadFailed.set(false);
    this.loadExternalPartnersState();
  }

  // ───────────────────────── P2-3368 · full metadata toggle ─────────────────────────

  toggleShowAll(): void {
    this.showAllFields.update(v => !v);
    this.saveShowAllToStorage();
  }

  /**
   * AC12: answering "No" collapses the results dropdown AND clears whatever was already picked.
   * Disabled on screen — see `unpersistedFieldsComingSoon`.
   */
  onHasLinkedResultChange(value: boolean | null): void {
    this.hasLinkedResult.set(value);
    if (value !== true) {
      this.selectedLinkedResultIds.set([]);
    }
    // ⚠️ UNREACHABLE from the UI while `unpersistedFieldsComingSoon` is true: the question is
    // rendered disabled with a `Coming soon` tag because the answer and the linked results it
    // unlocks have no field on SaveBilateralContributorsDto and no home in the detail payload.
    // Kept so the clearing rule (AC12) is one flag away from working.
  }

  onLinkedResultsModelChange(selected: any[]): void {
    const ids = (selected ?? []).map(item => (typeof item === 'object' && item !== null ? item.id : item));
    this.selectedLinkedResultIds.set(ids);
  }

  /** Same label shape W1/W2 shows in its linked-results dropdown (`rd-contributors-and-partners.component.ts:551`). */
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

  private showAllStorageKey(): string {
    const rid = this.creationService.currentResultId();
    return rid ? `bp_extra_${rid}_contributors` : 'bp_extra_0_contributors';
  }

  private loadShowAllFromStorage(): boolean {
    try {
      return localStorage.getItem(this.showAllStorageKey()) === 'true';
    } catch {
      return false;
    }
  }

  private saveShowAllToStorage(): void {
    try {
      localStorage.setItem(this.showAllStorageKey(), String(this.showAllFields()));
    } catch {
      /* ignore */
    }
  }

  onCentersModelChange(selected: any[]): void {
    const ids = (selected ?? []).map(item => (typeof item === 'object' && item !== null ? Number(item.institutionId) : Number(item)));
    this.onCentersChange(ids);
  }

  onProjectsModelChange(selected: any[]): void {
    const ids = (selected ?? []).map(item => (typeof item === 'object' && item !== null ? Number(item.id) : Number(item)));
    this.onProjectsChange(ids);
  }

  onCentersChange(ids: number[]): void {
    let finalIds = ids ?? [];
    if (this.readonlyLeadCenterInstitutionId && !finalIds.includes(this.readonlyLeadCenterInstitutionId)) {
      finalIds = [this.readonlyLeadCenterInstitutionId, ...finalIds];
    }
    this.selectedCenterInstitutionIds.set(finalIds);
    this.persistContributors();
  }

  onProjectsChange(ids: number[]): void {
    let finalIds = ids ?? [];
    if (this.readonlyLeadProjectId && !finalIds.includes(this.readonlyLeadProjectId)) {
      finalIds = [this.readonlyLeadProjectId, ...finalIds];
    }
    this.selectedProjectIds.set(finalIds);
    this.persistContributors();
  }

  formatAlloc(value: string | null | undefined): string {
    if (!value) return '';
    const n = Number.parseFloat(value);
    return Number.isNaN(n) ? value : String(Math.round(n));
  }

  getStatusClass(fieldPath: string): string {
    const status = this.autoSave.fieldStatus()[fieldPath];
    return status ? `status-${status}` : '';
  }

  getCenterDisplayName(id: number): string {
    const center = this.availableCenters().find(c => c.institutionId === id);
    return center ? (center.acronym || center.code) : String(id);
  }

  getProjectDisplayName(id: number): string {
    const project = this.availableProjects().find(p => p.id === id);
    if (project) {
      return project.shortName || project.fullName;
    }
    const loadedProj = this.creationService.resultContributingProjects().find(p => p.id === id);
    if (loadedProj) {
      return loadedProj.shortName || loadedProj.fullName;
    }
    const leadProj = this.creationService.selectedProject();
    if (leadProj?.id === id) {
      return leadProj.shortName || leadProj.fullName;
    }
    return '';
  }

  isLeadCenterItem(option: CenterOption): boolean {
    return option.institutionId === this.readonlyLeadCenterInstitutionId;
  }

  isLeadCenter(id: number): boolean {
    return id === this.readonlyLeadCenterInstitutionId;
  }

  isLeadProject(id: number): boolean {
    return id === this.readonlyLeadProjectId;
  }

  removeCenter(id: number): void {
    if (id === this.readonlyLeadCenterInstitutionId) {
      return;
    }
    this.onCentersChange(this.selectedCenterInstitutionIds().filter(i => i !== id));
  }

  removeProject(id: number): void {
    if (id === this.readonlyLeadProjectId) {
      return;
    }
    this.onProjectsChange(this.selectedProjectIds().filter(p => p !== id));
  }
}
