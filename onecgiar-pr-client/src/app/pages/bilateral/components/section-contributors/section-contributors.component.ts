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
import { BilateralFieldQualityFlagComponent } from '../bilateral-field-quality-flag/bilateral-field-quality-flag.component';

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
  /**
   * BCT-DD-4 — the owning Center of this project, additive on `GET clarisa/projects/get/all`
   * (`owner_center_institution_id`). `null`/`undefined` means the owner could not be resolved and
   * locks nothing (see `lockedCenterInstitutionIds`).
   */
  ownerCenterInstitutionId?: number | null;
}

const PARTNERS_MDS_GROUP = 'partners';

/**
 * Result types whose linked/bundled answer is owned by another surface — see
 * `linkedQuestionOwnedElsewhere()`. Declared here rather than imported from
 * `qa-innovation-development-results.service.ts` so this section does not depend on a QA service
 * for two numbers; same idiom as `type-innovation-use.component.ts:56`.
 */
const INNOVATION_USE_RESULT_TYPE_ID = 2;
const INNOVATION_DEVELOPMENT_RESULT_TYPE_ID = 7;

@Component({
  selector: 'app-section-contributors',
  imports: [BilateralFieldQualityFlagComponent, CommonModule, FormsModule, CustomFieldsModule, SectionTocComponent],
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

  /**
   * P2-3520 / P2-3352 — the centre stops being able to edit the result once it leaves Editing.
   * Read straight from the service, the way this section already reads the rest of the result state.
   */
  readonly readOnly = computed(() => !this.creationService.isEditableByCenterUser());


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

  /**
   * P2-3228 — the read-only "Lead center" value. The lead project's organisation wins, as before;
   * a result with no project (API-reported W3/bilateral results often have none) falls back to the
   * result's own lead Center, the same id `hydrateLeadAndSelection` already selects below.
   */
  readonly leadCenterLabel = computed(() => {
    const projectLead = this.creationService.selectedProject()?.leadCenter;
    if (projectLead?.acronym || projectLead?.name) {
      return [projectLead.acronym, projectLead.name].filter(Boolean).join(' - ');
    }
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const resultLead = resultLeadCenterId
      ? this.availableCenters().find(c => c.institutionId === Number(resultLeadCenterId))
      : null;
    return resultLead ? `${resultLead.acronym} - ${resultLead.name}` : '-';
  });

  readonly availableCentersComputed = computed(() => {
    const project = this.creationService.selectedProject();
    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const leadCenterId = project?.leadCenter?.id ?? resultLeadCenterId;
    const leadInstId = leadCenterId ? Number(leadCenterId) : null;
    const locked = this.lockedCenterInstitutionIds();
    return this.availableCenters().map(c => ({
      ...c,
      disabled: Number(c.institutionId) === leadInstId || locked.has(Number(c.institutionId))
    }));
  });

  readonly disabledCenterOptions = computed(() => this.availableCentersComputed().filter(c => c.disabled));
  readonly disabledProjectOptions = computed(() => this.availableProjectsComputed().filter(p => p.disabled));

  /**
   * BCT-R-1 / BCT-R-3 / BCT-R-4 — Centers owned by a currently-selected, non-lead project.
   *
   * Excludes:
   * - the lead project's own owner (the lead is handled by its own read-only mechanism, and its
   *   owner must never be treated as "derived" — falsifier: "the lead project's owner is locked");
   * - the lead Center's own id (it is already disabled as the lead; folding it into this set would
   *   just make it redundant, and the reporting Center's own project must lock nothing — BCT-R-1
   *   "reporting Center's project" scenario);
   * - `null`/unresolved owners (BCT-R-1 "owner cannot be resolved" scenario — locks nothing).
   */
  readonly lockedCenterInstitutionIds = computed<Set<number>>(() => {
    const leadProject = this.creationService.selectedProject();
    const leadProjectId = leadProject?.id ? Number(leadProject.id) : null;

    const resultLeadCenterId = this.creationService.resultLeadCenterId();
    const leadCenterId = leadProject?.leadCenter?.id ?? resultLeadCenterId;
    const leadInstId = leadCenterId ? Number(leadCenterId) : null;

    const projectsById = new Map(this.availableProjects().map(p => [p.id, p]));
    const locked = new Set<number>();
    for (const id of this.selectedProjectIds()) {
      if (leadProjectId != null && id === leadProjectId) continue;
      const owner = projectsById.get(id)?.ownerCenterInstitutionId;
      if (owner == null) continue;
      const ownerId = Number(owner);
      if (leadInstId != null && ownerId === leadInstId) continue;
      locked.add(ownerId);
    }
    return locked;
  });

  /** Unions `lockedCenterInstitutionIds()` into the current Center selection, in place. Returns whether anything changed. */
  private unionLockedCentersIntoSelection(): boolean {
    const locked = this.lockedCenterInstitutionIds();
    if (!locked.size) return false;
    const centerIds = new Set<number>(this.selectedCenterInstitutionIds());
    let changed = false;
    for (const id of locked) {
      if (!centerIds.has(id)) {
        centerIds.add(id);
        changed = true;
      }
    }
    if (changed) {
      this.selectedCenterInstitutionIds.set(Array.from(centerIds));
    }
    return changed;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // P2-3368 · Contributing science programs (optional, multi)
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Every P25 Science Program / Accelerator (`clarisa/initiatives/p25`), minus the primary one — it
   * is already shown as "Primary contributing science program". Nicoleta Trifa via Ángel Jarrín,
   * 2026-09-03: the question must be there "regardless of the mapping %". It used to offer only the
   * project's own programs, so a project mapped 100% to one program showed nothing at all, and an
   * existing result (loaded with `sciencePrograms: []`) never showed the control either.
   *
   * The project's programs remain the fallback while the catalogue is still loading.
   */
  readonly sciencePrograms = signal<{ programId: number; programCode: string; name: string }[]>([]);

  readonly availableSecondarySpOptions = computed(() => {
    const primaryId = this.creationService.selectedPrimarySp()?.programId;
    const catalogue = this.sciencePrograms();
    const source: { programId: number; programCode: string; name: string; allocation?: string }[] = catalogue.length
      ? catalogue
      : ((this.creationService.selectedProject()?.sciencePrograms ?? []) as any[]).map(sp => ({
          programId: Number(sp.programId),
          programCode: sp.programCode,
          name: sp.spName || sp.spShortName || '',
          allocation: sp.allocation ?? ''
        }));
    return source
      .filter(sp => sp?.programId != null && Number(sp.programId) !== Number(primaryId))
      .map(sp => ({
        programId: Number(sp.programId),
        programCode: sp.programCode,
        name: sp.name ?? '',
        allocation: sp.allocation ?? '',
        full_name: `${sp.programCode}${sp.name ? ' - ' + sp.name : ''}`
      }));
  });

  readonly selectedSecondarySpIds = computed(() => this.creationService.selectedSecondarySps().map(sp => Number(sp.programId)));

  // 🛑 HOUSE RULE — a control whose value cannot be stored ships VISIBLE BUT DISABLED with a
  // `Coming soon` tag, and never tells the user it will be saved. NOTHING in this section is in
  // that state any more: the linked/bundled question and its results dropdown were the last two
  // out, on 2026-09-24 (P2-3368 AC10-AC14), after contributing science programs on 2026-09-03.
  // Put the tag back — never a silently-dropped value — if a control here ever loses its storage.

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
   * P2-3368 AC10-AC14 — the linked/bundled twin of `partnersHydrated`, and it is load-bearing for
   * the same reason: `saveContributors` fires on every centre or project change, so a payload sent
   * before the stored answer is on screen would PATCH `has_innovation_link: null` over a saved
   * "Yes" and, with it, drop the links. Omitting the keys is what tells the server to leave the
   * block alone. Set from the same detail read that hydrates the partners.
   */
  readonly linkedHydrated = signal(false);

  /**
   * The read failed and there is NO automatic second chance: `hydrateWhenReady` only re-runs when
   * one of the signals it tracks changes, and after the initial load none of them does. Without a
   * visible error the section became a black hole — the user picked partners, the block went green
   * and Submit unlocked, while every PATCH silently dropped `institutions`. So the failure is shown
   * with a Retry, and `updateContributorsMds()` keeps `external-partners` unfilled meanwhile.
   */
  readonly partnersLoadFailed = signal(false);

  /**
   * BIL-T-1 — `loadCenters()` used to swallow a `CentersService.getData()` rejection with
   * `.catch(() => {})`: no signal, no flag. `centersReady` is only ever set from `mapCenters()`
   * (via the `loadedCenters` subscription), which never fires on failure, so `hydrateWhenReady`
   * stayed permanently blocked with zero visible error — same failure shape as `partnersLoadFailed`
   * above, one call site earlier in the hydration chain. Shown with a Retry, mirroring that pattern.
   */
  readonly centersLoadFailed = signal(false);

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
   * P2-3823 — the linked keys travel only once the user has changed THIS question in this visit.
   *
   * Before, every centre/project/partner autosave re-sent this tab's snapshot of the links, and
   * the server replaced `linked_result` with it: a link added meanwhile from another tab, user or
   * section was deactivated by an unrelated centre change.
   *
   * 🛑 Why "since touched" and not "only on the click itself": `BilateralAutoSaveService` keeps ONE
   * pending payload per endpoint and REPLACES it (`schedulePayload` → `_pendingPayloads.set`); the
   * body only leaves on Save draft / page leave. If the question's PATCH were the only one to carry
   * the keys, a centre change right after answering would overwrite it in the queue and the
   * answer would be lost. So once touched, every later payload keeps carrying the user's state.
   *
   * Two flags because the list is riskier than the flag: answering Yes must not replace rows the
   * picker never showed (server contract: Yes without `linked_results` = "flag changed, list did
   * not"). Both reset on hydration — a fresh read is the new baseline.
   */
  private readonly linkedAnswerTouched = signal(false);
  private readonly linkedListTouched = signal(false);

  /** The results catalogue as a signal; stubs without `resultsListSig` fall back to the array. */
  private readonly linkedCatalogue = computed<any[]>(() => {
    const sig = this.innovationUseResultsSE.resultsListSig?.();
    if (Array.isArray(sig) && sig.length) return sig;
    return Array.isArray(this.innovationUseResultsSE.resultsList) ? this.innovationUseResultsSE.resultsList : [];
  });

  /**
   * P2-3823 — the picker's options: the catalogue PLUS a placeholder for every stored link the
   * catalogue cannot name.
   *
   * 🛑 `app-pr-multi-select.writeValue` maps ids to options and DROPS the misses
   * (`pr-multi-select.component.ts:295-300`); the next pick then emits the shortened list and the
   * server deactivates the missing rows. Misses are real: the catalogue only lists QA'd/approved
   * results (`status_id IN (2, 6)`), and it loads asynchronously. With a placeholder for every
   * selected id the picker always finds them, and a read-only result (AC14) still shows a chip.
   */
  readonly linkedResultOptions = computed<any[]>(() => {
    const catalogue = this.linkedCatalogue();
    const known = new Set(catalogue.map((o: any) => Number(o?.id)));
    const placeholders = this.selectedLinkedResultIds()
      .map(id => Number(id))
      .filter(id => Number.isFinite(id) && id > 0 && !known.has(id))
      .map(id => ({ id, title: `Result not in the list (internal id ${id})`, unlisted: true }));
    return placeholders.length ? [...catalogue, ...placeholders] : catalogue;
  });

  /**
   * The picker's model. A NEW array whenever the options change, so `writeValue` re-maps the ids
   * against the current options (a late catalogue swaps placeholders for real labels).
   */
  readonly linkedResultModel = computed<(number | string)[]>(() => {
    this.linkedResultOptions();
    return [...this.selectedLinkedResultIds()];
  });

  /**
   * AC13's message ("N hidden field(s) has values and will be saved.") is a PROMISE: it may only
   * count fields that actually reach the server. It stayed at 0 while the linked/bundled question
   * was `Coming soon`; since P2-3368 AC10-AC14 the answer persists, so it counts again — one term
   * per hidden field with a value.
   *
   * 🛑 It also stays at 0 for the result types that do not ask the question here at all
   * (`linkedQuestionOwnedElsewhere()`); otherwise a collapsed block would promise to save a field
   * this section never renders.
   */
  readonly hiddenFieldsWithValues = computed(() => {
    if (this.linkedQuestionOwnedElsewhere()) return 0;
    // P2-3823 — unhydrated keys never travel (`buildContributorsPayload`), so after a failed read
    // the note must not promise to save them.
    if (!this.linkedHydrated()) return 0;
    return this.hasLinkedResult() !== null || this.selectedLinkedResultIds().length > 0 ? 1 : 0;
  });

  readonly showHiddenFieldsNote = computed(() => !this.showAllFields() && this.hiddenFieldsWithValues() > 0);

  /**
   * 🛑 Innovation Use (2) and Innovation Development (7) do NOT ask the linked/bundled question in
   * this section, and the server ignores both keys for them.
   *
   * - Innovation Use asks it in its own type-specific section, which writes the very same
   *   `result.has_innovation_link` + `linked_result` storage (`type-innovation-use.component.html:332`).
   *   That is the PO decision Ángel Jarrín took on 2026-09-10 (P2-3424), already implemented this
   *   way in the pooled form, which drops the whole block for those results
   *   (`rd-contributors-and-partners.component.html:552-558`). Two editing surfaces over one
   *   answer is exactly the defect P2-3199 removed.
   * - Innovation Development mirrors the flag into `results_innovations_dev.has_innovation_link`,
   *   the row the green-check functions read; only the classic writer maintains that mirror.
   *
   * Hidden, not disabled: a disabled control with no tag is unexplained furniture, and for
   * Innovation Use the question is one section away.
   */
  readonly linkedQuestionOwnedElsewhere = computed(() => {
    // Optional call: hosts and specs stub `BilateralCreationService` field by field, and a stub
    // without this signal must not crash the section — same guard `showsQaInnovationLink` uses in
    // the pooled form. An unknown type keeps the question here, which is the reversible side: the
    // server ignores the keys for types 2 and 7 anyway.
    const typeId = Number(this.creationService.resultTypeId?.());
    return typeId === INNOVATION_USE_RESULT_TYPE_ID || typeId === INNOVATION_DEVELOPMENT_RESULT_TYPE_ID;
  });

  /**
   * The Block-2 gates are named computeds rather than inline template expressions so the spec can
   * assert the SAME expression the template renders. The suite overrides the template (see
   * `section-contributors.component.spec.ts`), so an inline `@if` would be untested.
   */
  readonly showLinkedResultQuestion = computed(() => this.showAllFields() && !this.linkedQuestionOwnedElsewhere());
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
    this.loadSciencePrograms();
  }

  private loadSciencePrograms(): void {
    this.api.resultsSE.GET_AllInitiatives('p25').subscribe({
      next: ({ response }: any) => {
        this.sciencePrograms.set(
          (response ?? [])
            .filter((i: any) => i?.id != null && i?.official_code)
            .map((i: any) => ({ programId: Number(i.id), programCode: i.official_code, name: i.name ?? i.short_name ?? '' }))
        );
      },
      error: () => this.sciencePrograms.set([])
    });
  }

  private loadProjects(): void {
    this.api.resultsSE.GET_ClarisaProjects().subscribe({
      next: ({ response }) => {
        this.availableProjects.set(
          (response ?? []).map((p: any) => ({
            id: Number(p.id),
            shortName: p.shortName,
            fullName: p.fullName,
            // BCT-DD-4: additive field on the catalog. `null` (unresolved owner, or the field
            // simply absent from an older payload) means "locks nothing".
            ownerCenterInstitutionId: p.owner_center_institution_id != null ? Number(p.owner_center_institution_id) : null,
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
      this.centersLoadFailed.set(false);
      this.mapCenters();
    });
    this.centersService.getData()?.catch(() => {
      this.centersLoadFailed.set(true);
    });
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

  /** Manual second chance for a failed centers-catalogue read — mirrors `retryLoadExternalPartners()`. */
  retryLoadCenters(): void {
    this.centersLoadFailed.set(false);
    this.loadCenters();
  }

  /** One-shot UI hydrate after centers/projects/result data are available. No network. */
  hydrateLeadAndSelection(): void {
    this.readonlyLeadCenterInstitutionId = null;
    this.readonlyLeadProjectId = null;
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

    // BCT-R-1 "appears selected without reload": a legacy result whose contributing project was
    // saved before Part A shipped may load with its owner Center not yet in
    // `resultContributingCenterIds()`. Union it in here — no network, no persist (BCT-NFR-4 keeps
    // the payload guarded by `contributorsHydrated()` regardless).
    this.unionLockedCentersIntoSelection();

    this.updateContributorsMds();
  }

  private buildContributorsPayload(): {
    contributing_center?: { institution_id: number }[];
    contributing_bilateral_projects?: { project_id: number; is_lead?: boolean }[];
    contributing_programs?: { science_program_id: string }[];
    institutions?: { institutions_id: number }[];
    no_external_partners?: boolean;
    is_lead_by_partner?: boolean;
    has_innovation_link?: boolean | null;
    linked_results?: number[];
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
      contributing_programs?: { science_program_id: string }[];
      institutions?: { institutions_id: number }[];
      no_external_partners?: boolean;
      is_lead_by_partner?: boolean;
      has_innovation_link?: boolean | null;
      linked_results?: number[];
    } = {};

    // See `contributorsHydrated`: omitting the keys is the only safe default. The server treats a
    // missing key as "leave untouched" (`dto.contributing_center !== undefined`) but an empty array
    // as "deactivate everything, lead row included".
    if (this.contributorsHydrated()) {
      payload.contributing_center = selectedCenters;
      payload.contributing_bilateral_projects = selectedProjects;
      // Same hydration guard: the stored programs arrive with the detail (role-2 rows), and an
      // empty array means "remove them all" on the server.
      payload.contributing_programs = this.creationService
        .selectedSecondarySps()
        .filter(sp => !!sp.programCode)
        .map(sp => ({ science_program_id: sp.programCode }));
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

    // P2-3368 AC10-AC14. Guarded by `linkedHydrated` for the same reason as the partner keys, and
    // skipped entirely for the types that do not ask the question here — the server ignores them
    // too, but a payload that never carries the keys is the honest contract.
    // P2-3823 — and only once the user changed the question in this visit (`linkedAnswerTouched`),
    // so an unrelated centre change never re-sends a stale snapshot of the links.
    if (this.linkedHydrated() && !this.linkedQuestionOwnedElsewhere() && this.linkedAnswerTouched()) {
      payload.has_innovation_link = this.hasLinkedResult();
      if (this.linkedListTouched()) {
        payload.linked_results = this.selectedLinkedResultIds()
          .map(id => Number(id))
          .filter(id => Number.isFinite(id) && id > 0);
      }
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
        // Manual creation always assigns a lead project before this editor opens. API imports and
        // versions may legitimately have none, and there is no required lead-project choice here.
        ...(this.creationService.selectedProject()
          ? [{
              key: 'lead-project',
              label: 'Lead project',
              filled: this.readonlyLeadProjectId != null,
            }]
          : []),
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
      // `name` rides along so the selected chip can show "CODE - Name" like the dropdown option did.
      .map(o => ({ programId: o!.programId, programCode: o!.programCode, allocation: o!.allocation, name: o!.name ?? '' }));
    this.creationService.selectedSecondarySps.set(next);
    // Persisted since 2026-09-03 (`contributing_programs[]` on SaveBilateralContributorsDto); staged
    // like every other contributor change and written by Save draft.
    this.persistContributors();
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
        this.hydrateLinkedBundled(response);
        this.updateContributorsMds();
      },
      error: () => {
        // Leave the block unhydrated: a failed read must not let an empty selection overwrite
        // stored partners on the next centre/project change. Clearing the guard is what lets
        // `retryLoadExternalPartners()` fire the GET again — the hydrate effect will not.
        this.partnersLoadedForResultId = null;
        this.partnersLoadFailed.set(true);
        // Same posture for the linked/bundled keys: unhydrated means "do not send", so a failed
        // read can never let a blank answer overwrite the stored one.
        this.linkedHydrated.set(false);
        // Re-publish so `external-partners` drops back to unfilled: the section must not stay
        // green on a selection whose keys the next PATCH will discard.
        this.updateContributorsMds();
      }
    });
  }

  /**
   * P2-3368 AC13/AC14 — reads the stored linked/bundled answer out of the detail response the
   * partner block already fetches.
   *
   * 🛑 `has_innovation_link` is a MySQL tinyint and can arrive as the string '0', which `!!` reads
   * as true — the same trap `no_applicable_partner` documents two lines above. It is compared
   * numerically, and a NULL stays `null`: "never answered" is not "answered No", and AC13's
   * counter tells them apart.
   */
  private hydrateLinkedBundled(response: any): void {
    const storedAnswer = response?.commonFields?.has_innovation_link;
    this.hasLinkedResult.set(storedAnswer === null || storedAnswer === undefined ? null : Number(storedAnswer) === 1);

    const linkedIds = (response?.linkedResults ?? [])
      .map((id: any) => Number(id))
      .filter((id: number) => Number.isFinite(id) && id > 0);
    this.selectedLinkedResultIds.set(Array.from(new Set<number>(linkedIds)));

    // A fresh read is the new baseline: nothing the user did before it may travel.
    this.linkedAnswerTouched.set(false);
    this.linkedListTouched.set(false);
    this.linkedHydrated.set(true);
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
   *
   * The clearing is not only cosmetic — the payload below carries the emptied list, and the server
   * turns a "No" that retracts a stored "Yes" into the narrow `linked_result` cleanup (P2-3424).
   */
  onHasLinkedResultChange(value: boolean | null): void {
    // P2-3823 — belt and braces for the template's `!linkedHydrated()` lock: a click that lands
    // before the stored answer is on screen would be overwritten by hydration a moment later.
    if (!this.linkedHydrated()) return;
    this.hasLinkedResult.set(value);
    this.linkedAnswerTouched.set(true);
    if (value !== true && this.selectedLinkedResultIds().length) {
      // Clearing IS a list change: if the user comes back to Yes before saving, the payload must
      // carry the empty list they now see, not leave the old rows alive behind an empty picker.
      this.selectedLinkedResultIds.set([]);
      this.linkedListTouched.set(true);
    }
    this.persistContributors();
  }

  onLinkedResultsModelChange(selected: any[]): void {
    if (!this.linkedHydrated()) return;
    const pickerIds = (selected ?? [])
      .map(item => Number(typeof item === 'object' && item !== null ? item.id : item))
      .filter(id => Number.isFinite(id) && id > 0);
    // P2-3823 — last line of defence against the picker's silent drop: a stored id that is not
    // among the options the picker was given can never be removed by omission, only by No (AC12).
    const offered = new Set(this.linkedResultOptions().map((o: any) => Number(o?.id)));
    const kept = this.selectedLinkedResultIds()
      .map(id => Number(id))
      .filter(id => !offered.has(id) && !pickerIds.includes(id));
    this.selectedLinkedResultIds.set(Array.from(new Set<number>([...pickerIds, ...kept])));
    this.linkedAnswerTouched.set(true);
    this.linkedListTouched.set(true);
    this.persistContributors();
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
    // BCT-R-3: a locked Center (owner of a currently-selected non-lead project) is refused the same
    // way the lead Center is — re-added if the multiselect model change tried to drop it.
    for (const lockedId of this.lockedCenterInstitutionIds()) {
      if (!finalIds.includes(lockedId)) {
        finalIds = [...finalIds, lockedId];
      }
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

    // BCT-R-1: fold each newly-derived owner into the Center selection before the single persist
    // below — never a second `saveContributors` call just for the lock.
    this.unionLockedCentersIntoSelection();

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
    // BCT-R-3: same refusal as the lead Center, including through the chip's remove action.
    if (this.lockedCenterInstitutionIds().has(id)) {
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
