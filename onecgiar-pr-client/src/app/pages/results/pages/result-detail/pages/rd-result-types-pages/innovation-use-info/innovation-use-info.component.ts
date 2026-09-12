import { Component, computed, effect, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { IpsrStep1Body } from '../../../../../../ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/model/Ipsr-step-1-body.model';
import { FieldsManagerService } from '../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import {
  INNOVATION_LINK_MIN_PHASE_YEAR,
  INNOVATION_LINK_QUESTION,
  INNOVATION_USE_RESULT_TYPE_ID,
  QaInnovationDevelopmentOption,
  QaInnovationDevelopmentResultsService
} from '../../../../../../../shared/services/global/qa-innovation-development-results.service';
import { CanComponentDeactivate } from '../../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';

@Component({
  selector: 'app-innovation-use-info',
  templateUrl: './innovation-use-info.component.html',
  styleUrls: ['./innovation-use-info.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class InnovationUseInfoComponent implements CanComponentDeactivate {
  innovationUseInfoBody = new IpsrStep1Body();
  savingSection = false;

  /**
   * `UCA-T-11` — component-scoped dirty-diff tracker (`providers: [SectionDirtyTrackerService]`),
   * same pattern as `rd-general-information`/`UCA-T-6` and `rd-geographic-location`/`UCA-T-7`.
   * Snapshotted at the true end of each load flow (`getSectionInformation()` /
   * `getSectionInformationp25()`) and again directly inside the save flow's success branch.
   *
   * **Child-mutation hazard (same bug class as `UCA-T-7`'s `sub-geoscope`), investigated and
   * neutralized via normalization, not timing:** `app-innovation-use-form` (the only child this
   * section renders) itself renders `app-studies-link` (`*ngIf="body.has_scaling_studies &&
   * getUseLevelIndex() >= 6 && !isScalingStudiesQuestionHidden()"`), and
   * `StudiesLinkComponent.ngOnInit()` (`studies-link.component.ts:21-28`) pushes a placeholder
   * empty-string row into `body.scaling_studies_urls` whenever that array is empty and the section
   * is editable — `if (!this.disabled && this.body.scaling_studies_urls.length === 0) {
   * this.body.scaling_studies_urls = ['']; }`. This child only mounts once the load response has
   * set `has_innovation_link`/`has_scaling_studies`/`innovation_use_level_id` on the SAME
   * `innovationUseInfoBody` this component already snapshotted, so its `ngOnInit` write lands on
   * the very next change-detection pass AFTER the load flow's own `next` handler returns — i.e.
   * strictly after any snapshot taken at the naive "end of `next`" point. A P25 result with
   * `has_scaling_studies: true`, a use level ≥ 6, a pre-2026 phase (so the question isn't retired)
   * and an empty stored `scaling_studies_urls` therefore reported `hasUnsavedChanges() === true`
   * immediately after a clean, untouched load — reproduced directly against this exact scenario in
   * this component's own spec before the fix (see the spec's `UCA-T-11` describe block).
   *
   * `InnovationUseFormComponent.initializeComponentProperties()` (`ngOnInit`/`ngOnChanges`) was also
   * investigated: it writes several defaults onto the SAME bound object (`initiative_expected_investment`,
   * `reference_materials`, `pictures`, `studies_links`, `result`, etc.), but that write happens on the
   * child's FIRST creation — which Angular performs synchronously while building this component's own
   * initial view, strictly BEFORE the `OnChangePortfolio` effect below has even scheduled the load GET
   * (the effect's first run is deferred to a later microtask; the HTTP call itself is further out
   * still). Because `innovationUseInfoBody`'s object reference is never reassigned (only mutated),
   * Angular never re-invokes that child's `ngOnChanges` later, so this particular write cannot race a
   * snapshot taken after the load resolves — confirmed by tracing every `ngOnInit`/`ngOnChanges` on
   * every component this section's template renders, transitively (also checked `app-estimates-cgiar`,
   * and the `custom-fields` controls this template binds via `[(ngModel)]` on leaf scalars — none of
   * them declare `ngOnInit`/`ngOnChanges` that write back into the bound model).
   *
   * Fix: `normalizeScalingStudiesUrlsForDiff()` below, applied identically inside
   * `dirtySnapshotValue()` (fed to both `snapshot()` and `isDirty()`), same "project the
   * child-decoration out of the diff" shape as `rd-geographic-location`'s `normalizeCountriesForDiff()`
   * — chosen over re-snapshotting after the child "settles" because `StudiesLinkComponent` exposes no
   * such signal (only user-driven mutation methods) and is timing-agnostic regardless of whether the
   * catalogue-dependent `getUseLevelIndex()` resolves before or after this component's own load.
   */
  private readonly dirtyTracker = inject(SectionDirtyTrackerService);

  constructor(
    private readonly api: ApiService,
    private readonly fieldsManagerSE: FieldsManagerService,
    private readonly dataControlSE: DataControlService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Innovation use information');
  }

  /**
   * Drives `[appSectionSkeleton]`. TRUE from construction and NOT from "a request is in flight":
   * this section loads from an `effect()` gated on `currentResultSignal()?.portfolio`, so between
   * first paint and the GET there is no request at all and the empty body would paint as a
   * mandatory-but-empty form. Released on `next` AND `error`.
   */
  readonly sectionLoading = signal(true);

  OnChangePortfolio = effect(() => {
    if (this.dataControlSE.currentResultSignal()?.portfolio !== undefined) {
      this.fieldsManagerSE.isP25() ? this.getSectionInformationp25() : this.getSectionInformation();
    }
  });

  // ---------------------------------------------------------------------------------------------
  // P2-3424 — the link to a QA'd Innovation Development result, as an OPTIONAL question of THIS
  // section. PO decision (Ángel Jarrín, 10 Sep 2026): "la opción B es la correcta … lo mejor es
  // mostrar la información en la sección de Innovation Use. Este campo no debería ser un MDS."
  //
  // 🛑 It was MOVED, not copied: `rd-contributors-and-partners` no longer renders it (nor sends it)
  // for these results. Both questions answer the SAME stored field
  // (`results_innovations_use.has_innovation_link` + the `linked_result` table), and two editing
  // surfaces over one answer is the defect P2-3199 removed.
  // ---------------------------------------------------------------------------------------------
  private readonly qaInnovationsSE = inject(QaInnovationDevelopmentResultsService);

  /** Verbatim wording from P2-3420 / P2-3421 — QA reads it back word for word. */
  readonly innovationLinkQuestion = INNOVATION_LINK_QUESTION;

  /**
   * Innovation use + phase 2026 onwards.
   * 🛑 A PHASE-YEAR gate, never `isP25()`: prtest holds 2025-phase results inside the P25 portfolio,
   * and for those the question stays where it always was (Contributors and partners).
   * 🛑 An UNKNOWN year renders NOTHING here — the same fail-towards-the-legacy-form rule the twin
   * gate in `rd-contributors-and-partners` documents: in the detail the result can land after the
   * section mounts, and the two gates must never both be off (the answer would be unreachable) nor
   * both be on (two surfaces, one answer).
   */
  readonly showsInnovationLink = computed(() => {
    const result = this.dataControlSE.currentResultSignal?.();
    const year = result?.phase_year;
    return Number(result?.result_type_id) === INNOVATION_USE_RESULT_TYPE_ID && typeof year === 'number' && year >= INNOVATION_LINK_MIN_PHASE_YEAR;
  });

  /**
   * The catalogue is fetched only for the surface that uses it. The result (and with it its phase
   * year) usually lands after the section mounts, hence an effect; `load()` is idempotent.
   */
  private readonly loadQaInnovationCatalogue = effect(() => this.ensureQaInnovationCatalogue());

  /** The effect's body, callable so it can be asserted directly. */
  ensureQaInnovationCatalogue(): void {
    if (this.showsInnovationLink()) this.qaInnovationsSE.load();
  }

  /**
   * Single selection over an array-shaped payload: `linked_results` stays an array both ways (the
   * GET returns `number[]` and the PATCH contract is shared with the multi-select surfaces).
   */
  get linkedInnovationId(): number | null {
    const first = (this.innovationUseInfoBody?.linked_results ?? [])[0];
    const id = Number((first as any)?.id ?? first);
    return Number.isFinite(id) ? id : null;
  }
  /**
   * 🛑 The array this single-select writes into is NOT this question's private storage.
   * `linked_result` is a shared table and the read path gives this section EVERY active row of the
   * result: `getLinkedResultsByOrigin` (`results-innovations-use.repository.ts:245-259`) selects
   * `linked_results_id` for the origin with no filter on WHICH surface wrote it, so the P22 "Links to
   * results" rows and the ones versioning replicated from the previous phase arrive here too, mixed
   * with the answer to this question.
   *
   * Measured on the test DB and on prtest (11 Sep 2026): 28 active Innovation use results carry more
   * than one active link, and result 11164 (code 8696, 2026 phase) carries three — 8738, 8826 and
   * 8877, all three Policy change results. `v2/api/innovation-use/get/result/11164` returns the three
   * of them, while this select can only ever paint ONE (the id the getter above returns).
   *
   * Overwriting the whole array with `[value]` therefore deleted the links this surface never showed:
   * the payload carries the array verbatim (`currentInnovationLink()` below) and
   * `LinkedResultsService.createForInnovationUse` → `LinkedResultRepository.updateLink`
   * de-activates every active row whose id is missing from it
   * (`linked-results.repository.ts:313-330`). So only the slot actually on screen is replaced; every
   * other stored id rides through untouched.
   */
  set linkedInnovationId(value: number | null) {
    const displayed = this.linkedInnovationId;
    const untouched = this.toLinkedResultIds(this.innovationUseInfoBody?.linked_results).filter(id => Number.isFinite(id) && id !== displayed);
    this.innovationUseInfoBody.linked_results = value == null ? untouched : [value, ...untouched];
  }

  /**
   * ⚠️ The stored link is just an id and the catalogue only lists what is linkable TODAY. A link
   * saved before that innovation left those statuses would paint an EMPTY select, and saving the
   * section would then wipe it without the user touching anything. So the stored id is kept as an
   * option; its title is unknown here (this section loads no wider catalogue), which is why the
   * fallback label says so instead of inventing one.
   */
  get qaInnovationOptions(): QaInnovationDevelopmentOption[] {
    const options = this.qaInnovationsSE.options();
    const selected = this.linkedInnovationId;
    if (selected == null || options.some(option => option.id === selected)) return options;
    return [
      {
        id: selected,
        result_code: selected,
        title: '',
        status_id: 0,
        phase_year: 0,
        acronym: null,
        display: `${selected} - (linked result outside the QA’d list)`
      },
      ...options
    ];
  }

  /** "No" clears the selection — P2-3421 asks for it, and the server reads a false flag as "no link". */
  onInnovationLinkChange(): void {
    if (!this.showsInnovationLink()) return;
    if (!this.innovationUseInfoBody.has_innovation_link) this.innovationUseInfoBody.linked_results = [];
  }

  getSectionInformation() {
    this.api.resultsSE.GET_innovationUse().subscribe({
      next: ({ response }) => {
        this.innovationUseInfoBody.innovatonUse = response;
        this.convertOrganizations(this.innovationUseInfoBody?.innovatonUse?.organization);
        this.convertOrganizations(this.innovationUseInfoBody?.innovation_use_2030?.organization);
        // `UCA-T-11` — true end of this load flow: everything above is synchronous, so a freshly
        // loaded, unedited section is correctly non-dirty right here. See the `dirtyTracker` field
        // docblock above for the child-mutation hazard this snapshot is normalized against.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.sectionLoading.set(false);
      },
      error: err => {
        console.error(err);
        this.sectionLoading.set(false);
      }
    });
  }
  getSectionInformationp25() {
    this.api.resultsSE.GET_innovationUseP25().subscribe({
      next: ({ response }) => {
        if (response) {
          this.innovationUseInfoBody.has_innovation_link = response.has_innovation_link === 1;
          this.innovationUseInfoBody.linked_results = response.linked_results || [];
          this.innovationUseInfoBody.innovation_readiness_level_id = response.innovation_readiness_level_id;
          this.innovationUseInfoBody.readiness_level_explanation = response.readiness_level_explanation || '';
          const hs = response.has_scaling_studies;
          this.innovationUseInfoBody.has_scaling_studies = hs === null || hs === undefined ? undefined : hs === 1;
          this.innovationUseInfoBody.scaling_studies_urls = response.scaling_studies_urls || [];
          this.innovationUseInfoBody.innov_use_to_be_determined = response.innov_use_to_be_determined === 1;
          this.innovationUseInfoBody.innov_use_2030_to_be_determined = response.innov_use_2030_to_be_determined === 1;
          // Investment sections for app-estimates-CGIAR
          this.innovationUseInfoBody.investment_programs = response.investment_programs || [];
          this.innovationUseInfoBody.investment_bilateral = response.investment_bilateral || [];
          this.innovationUseInfoBody.investment_partners = response.investment_partners || [];
          this.innovationUseInfoBody.innovation_use_level_id = response.level;
          this.innovationUseInfoBody.innovatonUse = {
            actors: response.actors || [],
            measures: response.measures || [],
            organization: response.organization || []
          };

          this.innovationUseInfoBody.innovation_use_2030 = response.innovation_use_2030 || {
            actors: [],
            measures: [],
            organization: []
          };

          // P2-3613 — 🛑 this hydration is written key by key, so a key the server sends and this
          // block does not name never reaches `app-innovation-use-form`, whose `@Input() body` IS
          // this object. The five below were all missing, and each one reaches the screen as a
          // silent absence rather than an error:
          //
          // - `current_use_previous` gates `showCurrentUseUpdate()`. Undefined here means the whole
          //   Current Use Update block never renders, which is exactly what QA reported on 7 Sep
          //   2026 (result 8398, a real 2025 -> 2026 rollover). Measured the same day: the server
          //   answers `{result_id: 10866, phase_year: 2025, total_actors: 8825}` for that result,
          //   so the defect was never in the read path the block was verified against.
          // - `innovation_use_2030_previous` gates the same way for the 2030 projection (P2-3295).
          // - `innov_use_2030_justification`, `new_users_added` and `use_expansion_narrative` are
          //   bound with `[(ngModel)]`: the reporter types them, `saveSectionWith` sends them, and
          //   the reload paints them empty. Worse for the last two, which the server writes as
          //   `?? null`: a later save from this section would erase what was stored.
          //
          // `?? null` and not `|| null` on the three answers: 0 and '' are answers. §5 of the story
          // allows "the use was verified and did not grow" explicitly, which is a reported 0.
          this.innovationUseInfoBody.current_use_previous = response.current_use_previous ?? null;
          this.innovationUseInfoBody.innovation_use_2030_previous = response.innovation_use_2030_previous ?? null;
          this.innovationUseInfoBody.innov_use_2030_justification = response.innov_use_2030_justification ?? null;
          this.innovationUseInfoBody.new_users_added = response.new_users_added ?? null;
          this.innovationUseInfoBody.use_expansion_narrative = response.use_expansion_narrative ?? null;
        }
        this.convertOrganizations(this.innovationUseInfoBody?.innovatonUse?.organization);
        this.convertOrganizations(this.innovationUseInfoBody?.innovation_use_2030?.organization);
        // `UCA-T-11` — true end of this load flow, same rationale as `getSectionInformation()` above.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.sectionLoading.set(false);
      },
      error: err => {
        console.error(err);
        this.sectionLoading.set(false);
      }
    });
  }

  /** `UCA-T-11` — `CanComponentDeactivate.hasUnsavedChanges()`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtySnapshotValue());
  }

  /**
   * `UCA-T-11` — `CanComponentDeactivate.saveSection()`. Wraps the exact same save flow
   * `onSaveSection()` drives (`performSave()`, below — `UCA-DD-3`), resolving `true`/`false`
   * instead of void, for `UnsavedChangesGuard`.
   */
  saveSection(): Observable<boolean> {
    return this.performSave().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * `UCA-T-11` — the value the dirty tracker snapshots/diffs.
   *
   * Two normalizations, both discovered by actually rendering the real child tree in this
   * component's own spec rather than reasoning about timing in the abstract (a synchronous
   * `of(...)` mock had ALSO reproduced the second one below — confirming this class of race
   * doesn't require genuine HTTP asynchrony to manifest, only a later Angular change-detection
   * pass, which is enough on its own):
   *
   * 1. `scaling_studies_urls` — see the `dirtyTracker` field docblock: `app-studies-link` seeds a
   *    placeholder empty-string row into this array from its own `ngOnInit`.
   * 2. `KEYS_ONLY_INNOVATION_USE_FORM_DEFAULTS_ON_LOAD` below — `InnovationUseFormComponent`
   *    .initializeComponentProperties()` (`ngOnInit`/`ngOnChanges`) unconditionally seeds SEVEN
   *    keys (`initiative_expected_investment`, `bilateral_expected_investment`,
   *    `institutions_expected_investment`, `reference_materials`, `pictures`, `studies_links`,
   *    `result`) that `IpsrStep1Body` never declares — so their first write inserts a NEW property
   *    into the tracked object, at whatever moment the child happens to run. Empirically (this
   *    component's own spec, `CanComponentDeactivate (UCA-T-11)`), that moment can land BEFORE or
   *    AFTER this component's own load-flow snapshot depending on nothing more than whether the
   *    section GET resolves synchronously or is genuinely deferred — so a plain `{...body}` spread
   *    is not just racing one known child, it is sensitive to JSON key-insertion ORDER itself.
   *    None of these seven keys is read or written anywhere in `innovation-use-form.component.html`
   *    (verified by grep — they are artifacts of the model class being shared with IPSR step 1,
   *    which this host never renders), so they are excluded from the diff entirely rather than
   *    default-matched — there is no legitimate edit this host could ever make to them.
   */
  private dirtySnapshotValue(): unknown {
    const { ...rest } = this.innovationUseInfoBody as any;
    for (const key of InnovationUseInfoComponent.KEYS_ONLY_INNOVATION_USE_FORM_DEFAULTS_ON_LOAD) {
      delete rest[key];
    }
    rest.scaling_studies_urls = this.normalizeScalingStudiesUrlsForDiff(this.innovationUseInfoBody.scaling_studies_urls);
    return rest;
  }

  /** See `dirtySnapshotValue()` above. */
  private static readonly KEYS_ONLY_INNOVATION_USE_FORM_DEFAULTS_ON_LOAD = [
    'initiative_expected_investment',
    'bilateral_expected_investment',
    'institutions_expected_investment',
    'reference_materials',
    'pictures',
    'studies_links',
    'result'
  ] as const;

  /**
   * `UCA-T-11` — projects out `StudiesLinkComponent.ngOnInit()`'s placeholder empty-string row
   * (`studies-link.component.ts:21-28`) from the diff. Filters ALL blank/whitespace-only entries,
   * not just a single trailing one: `addStudiesLink()` always leaves at most one blank row (it
   * strips existing blanks before pushing a new one), so this stays symmetric without needing to
   * special-case "trailing" vs. "any position". A real typed URL is never blank, so this never
   * hides a genuine edit; deleting every real URL still reports dirty (`[]` after normalization
   * differs from a non-empty snapshot).
   */
  private normalizeScalingStudiesUrlsForDiff(urls: unknown): string[] {
    return (Array.isArray(urls) ? urls : []).filter((u: unknown) => typeof u === 'string' && u.trim() !== '');
  }

  /**
   * `UCA-T-11`: returns the save `Observable` instead of self-subscribing, so both this
   * component's own Save action (`onSaveSection`, below) and `saveSection()` (the
   * `CanComponentDeactivate` contract, above) drive the exact same call (`UCA-DD-3`). Folds in the
   * P2-3199 innovation-link pre-read so both callers get the identical fresh-read-then-save
   * behavior the original `onSaveSection()` had.
   */
  private performSave(): Observable<void> {
    // P2-3199: the innovation link question lives in Contributors and partners (section 2) for every
    // result this section does not ask it for. There it must re-read the current value right before
    // saving — otherwise a stale value loaded on mount would overwrite the section 2 answer and,
    // because the server treats a falsy value as "no link", delete the results linked there.
    //
    // 🛑 P2-3424 — but NOT when the question lives here (Innovation use, phase 2026 onwards). Re-reading
    // then would discard the answer the user just gave in this very section: the value on screen would
    // be replaced by the one already stored, silently, with a green save toast.
    const resolveInnovationLink: Observable<{ has_innovation_link: boolean; linked_results: number[] }> =
      this.fieldsManagerSE.isP25() && !this.showsInnovationLink()
        ? this.api.resultsSE.GET_innovationUseP25().pipe(
            map(({ response }) => this.innovationLinkFrom(response)),
            catchError(err => {
              console.error(err);
              return of(this.currentInnovationLink());
            })
          )
        : of(this.currentInnovationLink());

    return resolveInnovationLink.pipe(switchMap(innovationLink => this.saveSectionWith(innovationLink)));
  }

  onSaveSection() {
    this.savingSection = true;
    this.performSave().subscribe({
      next: () => {
        this.savingSection = false;
      },
      error: err => {
        console.error(err);
        this.savingSection = false;
      }
    });
  }

  /** Innovation link values as currently held by this section (fallback when the fresh read fails). */
  private currentInnovationLink() {
    return {
      has_innovation_link: this.innovationUseInfoBody.has_innovation_link,
      linked_results: this.toLinkedResultIds(this.innovationUseInfoBody.linked_results)
    };
  }

  /** Innovation link values as stored on the server, normalized the same way the section loads them. */
  private innovationLinkFrom(response: any) {
    if (!response) return this.currentInnovationLink();

    return {
      has_innovation_link: response.has_innovation_link === 1 || response.has_innovation_link === true,
      linked_results: this.toLinkedResultIds(response.linked_results)
    };
  }

  private toLinkedResultIds(linkedResults: any[]) {
    return (linkedResults || []).map((r: any) => Number(r?.id ?? r));
  }

  private saveSectionWith(innovationLink: { has_innovation_link: boolean; linked_results: number[] }): Observable<void> {
    const { investment_programs = [], investment_bilateral = [], investment_partners = [] } = this.innovationUseInfoBody as any;
    const actors = this.innovationUseInfoBody?.innovatonUse?.actors || [];
    const measures = this.innovationUseInfoBody?.innovatonUse?.measures || [];
    // Do not mutate UI-bound state; map payload only
    const organization = (this.innovationUseInfoBody?.innovatonUse?.organization || []).map((item: any) => ({
      ...item,
      institution_types_id: item?.institution_sub_type_id ?? item?.institution_types_id
    }));

    const innovation_use_2030 = this.innovationUseInfoBody.innovation_use_2030
      ? {
          ...this.innovationUseInfoBody.innovation_use_2030,
          organization: (this.innovationUseInfoBody.innovation_use_2030.organization || []).map((item: any) => ({
            ...item,
            institution_types_id: item?.institution_sub_type_id ?? item?.institution_types_id
          }))
        }
      : this.innovationUseInfoBody.innovation_use_2030;

    const bodyToSend = {
      has_innovation_link: innovationLink.has_innovation_link,
      linked_results: innovationLink.linked_results,
      innovation_use_level_id: (this.innovationUseInfoBody as any).innovation_use_level_id,
      readiness_level_explanation: this.innovationUseInfoBody.readiness_level_explanation,
      has_scaling_studies: this.innovationUseInfoBody.has_scaling_studies,
      scaling_studies_urls: this.innovationUseInfoBody.scaling_studies_urls,
      innov_use_to_be_determined: this.innovationUseInfoBody.innov_use_to_be_determined,
      innov_use_2030_to_be_determined: this.innovationUseInfoBody.innov_use_2030_to_be_determined,
      // P2-3295 §3. This payload is built key by key, so a field the form collects and this object
      // does not name is typed by the reporter and thrown away on save, with no error to show it.
      innov_use_2030_justification: (this.innovationUseInfoBody as any).innov_use_2030_justification ?? null,
      // P2-3613 §4 — same trap as the line above, one story later. The server assigns both as
      // `?? null` (innovation-use.service.ts:192-193), so omitting them here does not "leave them
      // alone": every save from this section would blank whatever the reporter had stored.
      new_users_added: this.innovationUseInfoBody.new_users_added ?? null,
      use_expansion_narrative: this.innovationUseInfoBody.use_expansion_narrative ?? null,
      investment_programs,
      investment_bilateral,
      investment_partners,
      actors,
      measures,
      organization,
      innovation_use_2030
    };

    if (this.fieldsManagerSE.isP25()) {
      return this.api.resultsSE.PATCH_innovationUseP25(bodyToSend).pipe(
        tap(() => {
          // `UCA-T-11` (per `UCA-T-6`'s rework lesson) — snapshot HERE, synchronously, the instant
          // the PATCH resolves, in addition to (not instead of) the reload below. `bodyToSend` (via
          // `this.innovationUseInfoBody`, read fresh by `dirtySnapshotValue()`) is precisely what the
          // server just persisted, so this is correct even before the reload completes — closing the
          // same race `UCA-T-6` attempt 1 was FAILed for: `saveSection()`'s `map(() => true)` could
          // otherwise emit to `UnsavedChangesGuard` before the reload's own re-snapshot resolves, or
          // (if that reload fails) the section would stay dirty forever despite a genuinely
          // successful save.
          this.dirtyTracker.snapshot(this.dirtySnapshotValue());
          this.getSectionInformationp25();
        }),
        map(() => undefined),
        catchError(err => throwError(() => err))
      );
    }

    return this.api.resultsSE.PATCH_innovationUse(bodyToSend).pipe(
      tap(() => {
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.getSectionInformation();
      }),
      map(() => undefined),
      catchError(err => throwError(() => err))
    );
  }

  convertOrganizations(organizations) {
    organizations?.map((item: any) => {
      if (item.parent_institution_type_id) {
        item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item?.parent_institution_type_id;
      }
    });
  }

  convertOrganizationsTosave() {
    this.innovationUseInfoBody.innovatonUse.organization.forEach((item: any) => {
      if (item.institution_sub_type_id) {
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
  }
}
