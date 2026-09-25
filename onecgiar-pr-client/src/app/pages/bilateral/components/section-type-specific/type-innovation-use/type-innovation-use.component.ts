import { Component, effect, inject, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { InnovationControlListService } from '../../../../../shared/services/global/innovation-control-list.service';
import {
  QaInnovationDevelopmentResultsService,
  QaInnovationDevelopmentOption
} from '../../../../../shared/services/global/qa-innovation-development-results.service';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';
import { EstimatesCgiarComponent } from '../../../../../shared/components/innovation-use-form/components/estimates/estimates.component';
import { BILATERAL_INNOVATION_USE_ACTORS_COPY } from '../../../../../internationalization/bilateral-innovation-use-actors.copy';
import { INNOVATION_USE_2030_PROJECTION_COPY } from '../../../../../internationalization/innovation-use-2030-projection.copy';

const SECTION_NAME = 'type-specific';

/** actor_type_id whose row needs a free-text label (mirrors the W1/W2 anticipated-user-demand form). */
const OTHER_ACTOR_TYPE_ID = 5;

/** institution_types_id codes with an extra field, per the CLARISA institution-type tree (mirrors W1/W2). */
const OTHER_INSTITUTION_TYPE_ID = 78;
const GRADUATE_STUDENTS_INSTITUTION_TYPE_ID = 50;

/**
 * P2-3428 AC1 / P2-3331 AC2 — verbatim text of the MDS note. Kept as a constant (and not inlined in the
 * template like the sibling sections do) so the wording is asserted by a unit test: it is copy the story
 * quotes character for character and QA reads it back word for word.
 */
const MDS_INFO_NOTE =
  'The fields displayed on this screen correspond to the minimum data standard (MDS) required for bilateral result reporting. ' +
  'If you need to complete the full metadata for this section, click the button on the right.';

/**
 * P2-3556 — what the person reads when the section could not be fetched. Plain language on purpose:
 * the only two things that matter to them are that nothing they type is being kept, and that what
 * they reported before is untouched. Same copy, word for word, as the sibling Innovation Development,
 * Policy Change and Capacity Sharing sections so the form never explains the same failure two
 * different ways.
 */
const LOAD_ERROR_NOTE =
  'We could not load the information saved for this section, so the fields below are empty and nothing typed here will be saved. ' +
  'Please reload the page to try again — the information reported earlier has not been changed.';

/**
 * P2-3424 (PO instruction recorded on the ticket, 23-ago-2026): the link-to-a-QA'd-Innovation-Development
 * question exists only from the 2026 reporting phase onwards; earlier phases must render exactly as they do
 * today. This is a PHASE-YEAR threshold, not a portfolio one — prtest holds 2025-phase results inside the P25
 * portfolio, so `isP25()` would switch the field on for them. Declared locally instead of inside
 * `ReportingDesignYear` because that enum is a shared file this story does not own; if a second bilateral
 * section needs the same cut-off, promote it there.
 */
const INNOVATION_LINK_MIN_PHASE_YEAR = 2026;

/**
 * P2-3294 / P2-3428 AC13: the scaling-strategy-studies question disappears from use level 6 upwards.
 * The W1/W2 form now applies the same ceiling (`innovation-use-form.component.html:338`), but there it
 * sits behind a 2026 phase gate so earlier phases keep the old behaviour. This section has no phase gate
 * on purpose: bilateral only exists from 2026 onwards. See CLAUDE.md.
 */
const SCALING_STUDIES_MAX_USE_LEVEL = 6;

/** W1/W2 shows the use-level explanation for levels 5..9 (`innovation-use-form.component.html:325`). */
const USE_LEVEL_EXPLANATION_MIN = 5;
const USE_LEVEL_EXPLANATION_MAX = 9;

@Component({
  selector: 'app-type-innovation-use',
  imports: [FormsModule, NgTemplateOutlet, CustomFieldsModule, EstimatesCgiarComponent],
  templateUrl: './type-innovation-use.component.html',
  styleUrl: './type-innovation-use.component.scss'
})
export class TypeInnovationUseComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);
  private readonly expandableState = inject(BilateralExpandableStateService);
  readonly innovationControlListSE = inject(InnovationControlListService);
  /** Same catalog the W1/W2 Contributors & Partners dropdown consumes — reused, not re-fetched here. */
  readonly qaInnovationsSE = inject(QaInnovationDevelopmentResultsService);

  body: any = {};
  actorsTypeList: any[] = [];
  institutionsTypeTreeList: any[] = [];
  private readonly institutionsTypeTreeChildrenCache: Record<string, any[]> = {};

  readonly otherActorTypeId = OTHER_ACTOR_TYPE_ID;
  readonly otherInstitutionTypeId = OTHER_INSTITUTION_TYPE_ID;
  readonly graduateStudentsInstitutionTypeId = GRADUATE_STUDENTS_INSTITUTION_TYPE_ID;
  readonly mdsInfoNote = MDS_INFO_NOTE;
  readonly loadErrorNote = LOAD_ERROR_NOTE;
  readonly copy = BILATERAL_INNOVATION_USE_ACTORS_COPY;
  /** P2-3428 — same copy as the W1/W2 "2030 Use Projection" (title, guidance note, question, tooltip). */
  readonly projection2030Copy = INNOVATION_USE_2030_PROJECTION_COPY;
  /** P2-3785 (4b) — the two sex groups, each with its Youth / Non-youth split, as in pooled reporting. */
  readonly genderGroups = [
    { key: 'women', label: 'Women', youthWarning: BILATERAL_INNOVATION_USE_ACTORS_COPY.womenYouthWarning },
    { key: 'men', label: 'Men', youthWarning: BILATERAL_INNOVATION_USE_ACTORS_COPY.menYouthWarning }
  ] as const;

  /**
   * P2-3556 — three-state load flag: `null` while the GET is still in flight, `true` once the
   * server's body is in hand, `false` when the fetch failed. Same shape and the same
   * "null means not loaded yet" contract the folder already uses for
   * `hasLinkedResult = signal<boolean | null>(null)` (`../../section-contributors/section-contributors.component.ts:198`)
   * and for `resultStatusId` (`../../../services/bilateral-creation.service.ts:351-357`).
   *
   * It exists because a save may only go out once the component knows what the server holds. `body`
   * is constructed as `{}`, so a form that never loaded is indistinguishable from a form the user
   * emptied — and `buildPayload()` sends `?? null` / `?? []` for every key. `loadData()` had no error
   * handler, and the interceptor rethrows every failed response
   * (`shared/interceptors/general-interceptor.service.ts:81-83`), so `next` never ran, the form
   * painted blank with no warning, and the first keystroke autosaved that empty body.
   *
   * What an empty body does key by key on the server, verified before writing this — the answer is
   * NOT the same as the sibling sections', and it is worse for the scalars than for the lists:
   *
   * - `innov_use_to_be_determined` and `innovation_use_level_id` are written as `?? null` on the
   *   update branch (`api/results/summary/summary.service.ts:104-106`), the insert branch (`:121-123`)
   *   and the duplicate-key retry (`:138-139`) — the stored answer and the MDS use level are NULLED.
   * - `has_scaling_studies`, `innov_use_2030_to_be_determined`, `readiness_level_explanation` and
   *   `has_innovation_link` are only written when the key is PRESENT (`:185-201`), and
   *   `buildPayload()` always sends them, as `null` — so all four are NULLED too.
   * - `scaling_studies_urls` as `[]` is not "no news": `shouldSync` is true whenever the key is present
   *   (`:228-230`), and the sync de-activates every stored row first
   *   (`:241-245`, `update … { is_active: false }`) and re-inserts nothing — EVERY stored study link
   *   is deleted.
   * - The three lists are the only safe keys: `saveAnticipatedInnoUser` guards each writer on
   *   `?.length` with NO `else` branch (`api/results/summary/innovation_dev.service.ts:158`, `:259`,
   *   `:323`), so an empty `actors` / `organization` / `measures` is a no-op. This is where this section
   *   differs from Policy Change and Capacity Sharing, whose `institutions` `else` branch de-activates
   *   every stored organization.
   * - `linked_results: []` is a no-op as well, but only by accident of the guard order: the sync needs
   *   `has_innovation_link` to be exactly `true` or a `false` retracting a stored `true` (`:273-291`),
   *   and an unloaded body sends `null`.
   *
   * `null` blocks for the same reason `false` does: `GET summary/innovation-use/get/result/:id` takes
   * 94-159 ms on prtest (measured 2-Sep-2026 over ids 187, 347, 1011, 8090, 8582…8767) against an
   * 800 ms autosave debounce, so an early edit could otherwise reach the PATCH before the body arrived
   * and a payload built from `{}` blanks the record exactly as a failed load does.
   *
   * ⚠️ Unlike Policy Change, this GET never answers 404 for a result with no row: `getInnovationUse`
   * assembles its skeleton with `innUseExists?.x ?? null` and returns `HttpStatus.OK` whether the row
   * exists or not (`summary.service.ts:301-374`). Measured on prtest 2-Sep-2026:
   * `…/innovation-use/get/result/999999` → `200` with every key null and the three lists empty, and so
   * does a non-numeric id. So there is no "no record yet" status to whitelist here — every error that
   * reaches the handler really is one (401 on an expired token, a 5xx, an Apache 403, a dropped
   * connection), and none of them may write.
   */
  /**
   * P2-3428 / AC17 — the result left Editing, so its fields are read-only.
   *
   * `isFormReadOnly` (bilateral-result-creator) was built for exactly this in P2-3520 and every
   * other section reads it; type-specific never did, so on a Pending Review result the ten fields
   * here still took input (measured on prtest #9479, 2026-09-21). The autosave was already locked,
   * so nothing reached the database — the screen simply lied about what could be changed.
   */
  readonly readOnly = computed(() => !this.creationService.isEditableByCenterUser());

  readonly loaded = signal<boolean | null>(null);

  readonly saving = computed(() => this.autoSave.fieldStatus()['type-specific'] === 'saving');
  showAllFields = signal(false);

  get visibleActors(): any[] {
    return (this.body.actors ?? []).filter((a: any) => a.is_active !== false);
  }

  get visibleOrganizations(): any[] {
    return (this.body.organization ?? []).filter((o: any) => o.is_active !== false);
  }

  get visibleMeasures(): any[] {
    return (this.body.measures ?? []).filter((m: any) => m.is_active !== false);
  }

  /**
   * P2-3428 — the 2030 Use Projection lists (`innovation_use_2030`, stored server-side under
   * `section_id = 2`). Optional full metadata: nothing here is published to the MDS tracker.
   */
  get projection2030(): { actors: any[]; organization: any[]; measures: any[] } {
    if (!this.body.innovation_use_2030) this.body.innovation_use_2030 = { actors: [], organization: [], measures: [] };
    const p = this.body.innovation_use_2030;
    p.actors ??= [];
    p.organization ??= [];
    p.measures ??= [];
    return p;
  }

  /** The projection lists show only while the 2030 use is not "yet to be determined" — as in W1/W2. */
  get showProjection2030Lists(): boolean {
    return this.body.innov_use_2030_to_be_determined !== true;
  }

  activeRows(rows: any[] | null | undefined): any[] {
    return (rows ?? []).filter((r: any) => r.is_active !== false);
  }

  /**
   * Night sweep 2026-09-23, BIL-1 — an active actor row that carries something to store (a figure,
   * the free-text type, the demand text) but no `actor_type_id`.
   *
   * The server skips a NEW row whose only judged value is `actor_type_id` as blank
   * (`onecgiar-pr-server/src/api/results/summary/innovation_dev.service.ts` `isDiscardable(el,
   * el?.result_actors_id, el?.actor_type_id)`, 146d26112 — deliberately, so the blank row "Add" stages
   * does not sink the whole save), and answers 201. So a row with Women 5 / Men 6 and no type vanished
   * on reload with no message while the section read complete (measured on prtest, result 9519).
   * Truly blank rows are NOT caught here — they stay discardable exactly as 146d26112 intends.
   */
  actorMissingType(actor: any): boolean {
    if (!actor || actor.is_active === false) return false;
    if (actor.actor_type_id !== null && actor.actor_type_id !== undefined && `${actor.actor_type_id}`.trim() !== '') return false;
    const filled = (value: unknown) => value !== null && value !== undefined && `${value}`.trim() !== '';
    return [actor.women, actor.women_youth, actor.men, actor.men_youth, actor.how_many, actor.other_actor_type, actor.addressing_demands].some(filled);
  }

  /** BIL-1 — any VISIBLE actor list (current use, or the 2030 projection while shown) holds such a row. */
  get hasActorMissingType(): boolean {
    const current = this.body.innov_use_to_be_determined === false ? (this.body.actors ?? []) : [];
    const projection = this.showProjection2030Lists ? (this.body.innovation_use_2030?.actors ?? []) : [];
    return [...current, ...projection].some((actor: any) => this.actorMissingType(actor));
  }

  /** Numeric use level (0..9) behind the selected `innovation_use_level_id`; -1 when nothing is picked. */
  get useLevelNumber(): number {
    const selectedId = this.body.innovation_use_level_id;
    if (selectedId === null || selectedId === undefined) return -1;
    // `useLevelsList` is declared as `[]` in the shared service, so TS infers `never[]`; cast locally
    // rather than retyping the service, which other forms consume.
    const selected = ((this.innovationControlListSE.useLevelsList ?? []) as any[]).find(lvl => String(lvl?.id) === String(selectedId));
    const level = Number(selected?.level);
    return Number.isFinite(level) ? level : -1;
  }

  /**
   * P2-3294 / P2-3428 AC13 — shown while the use level is below 6, hidden from 6 upwards. `useLevelNumber`
   * is `-1` when nothing has been picked yet, and `-1 < 6` is `true`: an unanswered level is NOT "6 or
   * higher", so the question stays visible until the user actually picks a level of 6 or more. There is no
   * separate `level >= 0` guard here on purpose — adding one would hide the question by default and only
   * reveal it once level 0-5 is chosen, which is not what AC13 says.
   */
  get showScalingStudies(): boolean {
    return this.useLevelNumber < SCALING_STUDIES_MAX_USE_LEVEL;
  }

  /** Mirrors the W1/W2 gate for the use-level justification textarea. */
  get showUseLevelExplanation(): boolean {
    const level = this.useLevelNumber;
    return level >= USE_LEVEL_EXPLANATION_MIN && level <= USE_LEVEL_EXPLANATION_MAX;
  }

  /**
   * P2-3424 — the question is 2026-onwards only. A draft whose phase year has not been resolved yet is
   * treated as the current phase: the bilateral creator only ever opens results of the running cycle.
   */
  get showInnovationLinkQuestion(): boolean {
    const year = this.creationService.reportingYear();
    return year == null || year >= INNOVATION_LINK_MIN_PHASE_YEAR;
  }

  /**
   * P2-3424 AC4 — the Innovation Development results the user may link to.
   *
   * 🛑 This reads the SAME catalogue as W1/W2 (`QaInnovationDevelopmentResultsService`, owned by
   * P2-3422), so the two routes can no longer offer different lists for the same question. It used
   * to read `InnovationUseResultsService`, which is a different thing: the wide Contributors &
   * Partners list — every phase, no de-duplication by result code — narrowed here by a client-side
   * filter that asked for `status_id === 2`.
   *
   * That filter was justified by a comment claiming the endpoint "carries NO status_id". It does:
   * `getResultsForInnovUse` (result.repository.ts:3079) selects `r.status_id` and already filters
   * `IN (2, 6)`. So the client filter was not inert — it silently dropped every Approved (6)
   * result, which is precisely what a bilateral Innovation Development is, and left the dropdown
   * missing the results AC4 asks for.
   *
   * ⚠️ The stored link is only an id, and the catalogue lists what is linkable TODAY. Keeping the
   * saved id as an option is what stops a previously linked result from painting an empty select
   * and being wiped on the next save (AC8/AC9). Same fallback wording as the W1/W2 twin.
   */
  get qaInnovationDevelopmentResults(): QaInnovationDevelopmentOption[] {
    const options = this.qaInnovationsSE.options();
    const selected = this.body?.linked_result_id;
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

  ngOnInit(): void {
    const resultId = this.creationService.currentResultId();
    this.showAllFields.set(this.expandableState.getShowAllFields(resultId ?? 0, SECTION_NAME));
    // P2-3424 AC4: idempotent — the first surface to ask fetches, the rest reuse the cached list.
    if (this.showInnovationLinkQuestion) this.qaInnovationsSE.load();
    this.loadData();
  }

  /**
   * The three "Investment (USD)" tables list one row per entity the result is LINKED to, and those
   * links are owned by other sections — contributing projects by `section-contributors`. Because the
   * sections are siblings under `[hidden]` and all mounted once with the page
   * (`bilateral-result-creator.component.html`), `loadData` above is a snapshot of the moment the
   * page opened: a project added afterwards never appeared in this table, could therefore never be
   * given an amount or "This is yet to be determined", and the reporter had no way to correct it
   * short of a browser reload — while `updateMds` below, reading the same stale array, reported the
   * field complete. Server-side it was not, and `submit-for-review` refused the result with an
   * error naming data the form was showing as done (result code 9506, AfricaRice, 21-Sep-2026).
   *
   * Re-reads only on the transition INTO this section, so returning to it costs one GET and being
   * here costs none.
   */
  private lastOpenSection: string | null = null;
  private readonly refreshInvestmentTablesOnOpen = effect(() => {
    const open = this.autoSave.openSection();
    const previous = this.lastOpenSection;
    this.lastOpenSection = open;
    if (open !== SECTION_NAME || previous === SECTION_NAME) return;
    // Before the first successful load there is nothing to reconcile against, and `loadData` is
    // about to publish the same rows anyway.
    if (this.loaded() !== true) return;
    this.reconcileInvestmentTables();
  });

  /**
   * Takes the row SET from the server (which entities are linked, and their names) while keeping
   * whatever the reporter has typed but not yet saved. A row the server no longer sends is gone
   * from the result and drops out; a row it sends that was not on screen appears with its stored
   * values.
   */
  private reconcileInvestmentTables(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    this.bilateralApi.GET_innovationUse(resultId).subscribe({
      next: ({ response }) => {
        if (!response) return;
        this.body.investment_programs = this.mergeInvestmentRows(this.body.investment_programs, response.investment_programs);
        this.body.investment_bilateral = this.mergeInvestmentRows(this.body.investment_bilateral, response.investment_bilateral);
        this.body.investment_partners = this.mergeInvestmentRows(this.body.investment_partners, response.investment_partners);
        this.updateMds();
      },
      // A failed refresh leaves the table exactly as it was: the reporter keeps editing what is on
      // screen rather than watching their rows vanish on a dropped request.
      error: () => undefined
    });
  }

  private mergeInvestmentRows(staged: any[] | undefined, fresh: any[] | undefined): any[] {
    const rows = Array.isArray(fresh) ? fresh : [];
    const key = (row: any) => String(row?.project_id ?? row?.id ?? '');
    const stagedByKey = new Map((staged ?? []).map((row: any) => [key(row), row]));
    return rows.map((row: any) => {
      const previous = stagedByKey.get(key(row));
      // Only the two the person edits are carried over; the name and the budget-row id are the
      // server's to state.
      return previous ? { ...row, kind_cash: previous.kind_cash, is_determined: previous.is_determined } : row;
    });
  }

  toggleShowAll(): void {
    this.showAllFields.update(v => !v);
    const resultId = this.creationService.currentResultId();
    this.expandableState.setShowAllFields(resultId ?? 0, SECTION_NAME, this.showAllFields());
  }

  private loadData(): void {
    this.bilateralApi.GET_actorsTypes().subscribe(({ response }) => {
      this.actorsTypeList = response || [];
    });
    this.bilateralApi.GET_institutionsTypeTree().subscribe(({ response }) => {
      this.institutionsTypeTreeList = response || [];
    });
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    this.bilateralApi.GET_innovationUse(resultId).subscribe({
      next: ({ response }) => {
        this.body = response || {};
        this.hydrateOrganizations();
        this.hydrateStoredAnswers();
        this.hydrateInnovationLink();
        this.hydrateInvestmentTables();
        this.loaded.set(true);
        this.updateMds();
      },
      error: () => {
        this.body = {};
        // P2-3556 — see the `loaded` doc for what the server does with an empty innovation-use payload.
        this.loaded.set(false);
        // The checklist is published on EVERY outcome, failure included — same reason as the sibling
        // section (`../type-capacity-sharing/type-capacity-sharing.component.ts:73-94`, P2-3355):
        // publishing nothing leaves the section at "0/0 fields", which reads as "nothing required
        // here" instead of as incomplete. Three unfilled items keep it honestly amber.
        this.updateMds();
      }
    });
  }

  /**
   * The server only ever stores one code in `institution_types_id` (the leaf, if a sub-type
   * was picked). It hydrates `parent_institution_type_id` alongside it so the UI can show a
   * parent dropdown + a refining child dropdown — split that back out on load; `buildPayload()`
   * flattens it back into a single code before every save.
   */
  private hydrateOrganizations(): void {
    [...(this.body.organization ?? []), ...(this.body.innovation_use_2030?.organization ?? [])].forEach((org: any) => {
      if (org.parent_institution_type_id) {
        org.institution_sub_type_id = org.institution_types_id;
        org.institution_types_id = org.parent_institution_type_id;
      }
    });
  }

  /**
   * P2-3424 — the contract carries the link as a list (`linked_results`) because W1/W2 allows several;
   * this story caps it at one ("UI enforces one selection maximum"), so the UI binds a single id and the
   * payload puts it back into the list.
   */
  /**
   * P2-3390 — the server sends one row per active link, but a result with no links at all (or a failed
   * load) leaves the keys absent. The shared table component writes straight into these arrays, so they
   * must exist as arrays before it renders.
   */
  private hydrateInvestmentTables(): void {
    this.body.investment_programs = this.body.investment_programs ?? [];
    this.body.investment_bilateral = this.body.investment_bilateral ?? [];
    this.body.investment_partners = this.body.investment_partners ?? [];
  }

  private hydrateInnovationLink(): void {
    const linked = this.body.linked_results;
    const first = Array.isArray(linked) ? linked[0] : linked;
    // Only written when something was stored — an untouched section must stay an empty body.
    if (first != null) this.body.linked_result_id = Number(first?.id ?? first);
    this.normalizeStoredBoolean('has_innovation_link');
  }

  /**
   * P2-3424 — the yes/no radios bind `true`/`false`, but MySQL `tinyint` columns come back as `1`/`0`
   * (same reason the W1/W2 section compares with `=== 1`, `innovation-use-info.component.ts:55-64`).
   * Without this the stored answer reloads unselected and the block it gates stays hidden.
   */
  private hydrateStoredAnswers(): void {
    // P2-3533 — this one was missing, and it is the field that gates the whole Actors block
    // (`.component.html:17`, `=== false`). Its siblings were normalised here from the start, so on
    // reload the answer came back as `0`, matched neither radio option and rendered nothing: the
    // actors looked lost, and the obvious reaction is to enter them again.
    this.normalizeStoredBoolean('innov_use_to_be_determined');
    this.normalizeStoredBoolean('has_scaling_studies');
    this.normalizeStoredBoolean('innov_use_2030_to_be_determined');
    // P2-3785 (4b) — the actor flags now bind checkboxes, which need a real boolean too.
    [...(this.body.actors ?? []), ...(this.body.innovation_use_2030?.actors ?? [])].forEach((actor: any) => {
      for (const key of ['sex_and_age_disaggregation', 'age_disaggregation_not_available', 'youth_split_applied_by_system']) {
        const value = actor?.[key];
        if (value !== null && value !== undefined && typeof value !== 'boolean') actor[key] = Boolean(value);
      }
    });
  }

  /** Rewrites `1`/`0` as `true`/`false`. An unanswered field (`null`/absent) is left untouched. */
  private normalizeStoredBoolean(key: string): void {
    const value = this.body[key];
    if (value === null || value === undefined || typeof value === 'boolean') return;
    this.body[key] = Boolean(value);
  }

  getInstitutionsTypeTreeChildren(institutionTypesId: number): any[] {
    const key = String(institutionTypesId);
    if (this.institutionsTypeTreeChildrenCache[key]) {
      return this.institutionsTypeTreeChildrenCache[key];
    }
    const parent = this.institutionsTypeTreeList.find(inst => inst.code == institutionTypesId);
    const children = parent?.childrens ?? [];
    this.institutionsTypeTreeChildrenCache[key] = children;
    return children;
  }

  addActor(): void {
    if (!this.body.actors) this.body.actors = [];
    this.body.actors.push({ actor_type_id: null, sex_and_age_disaggregation: false, is_active: true });
    this.onFieldChange();
  }

  deleteActor(actor: any): void {
    actor.is_active = false;
    this.onFieldChange();
  }

  /**
   * P2-3785 (4b) — ticking "Sex and age disaggregation does not apply" switches both breakdowns off, so
   * the figures and the age-only fallback are cleared, as the pooled `cleanActor()` does.
   * Unticking only drops the single "How many" and keeps whatever Women/Men the row holds: rows saved
   * under the old Yes/No carry their breakdown behind a `true`, and unticking is how that breakdown
   * comes back into view — clearing it there would delete what the reporter had entered.
   */
  onDisaggregationChange(actor: any): void {
    if (actor?.sex_and_age_disaggregation) {
      actor.women = null;
      actor.women_youth = null;
      actor.men = null;
      actor.men_youth = null;
      actor.how_many = null;
      actor.age_disaggregation_not_available = null;
      actor.youth_split_applied_by_system = null;
    } else {
      this.syncTotal(actor);
    }
    this.onFieldChange();
  }

  /** Non-youth is never stored: it is the group total minus its youth (server `summary.service.ts` derives it the same way). */
  nonYouth(actor: any, group: 'women' | 'men'): number | null {
    const total = this.toCount(actor?.[group]);
    if (total === null) return null;
    return Math.max(total - (this.toCount(actor?.[`${group}_youth`]) ?? 0), 0);
  }

  /** The Total the reporter can read — Women + Men, as the pooled form computes it. */
  actorTotal(actor: any): number | null {
    const women = this.toCount(actor?.women);
    const men = this.toCount(actor?.men);
    if (women === null && men === null) return null;
    return (women ?? 0) + (men ?? 0);
  }

  youthExceeds(actor: any, group: 'women' | 'men'): boolean {
    const total = this.toCount(actor?.[group]);
    const youth = this.toCount(actor?.[`${group}_youth`]);
    return total !== null && youth !== null && youth > total;
  }

  /** Women or Men changed: keep the system 50/50 split in step and the stored total in sync. */
  onGenderChange(actor: any): void {
    if (actor?.age_disaggregation_not_available) this.applyYouthSplit(actor);
    this.syncTotal(actor);
    this.onFieldChange();
  }

  /** Youth cannot be greater than the total of its group — same rule the pooled form enforces. */
  onYouthChange(actor: any, group: 'women' | 'men'): void {
    if (this.youthExceeds(actor, group)) actor[`${group}_youth`] = this.toCount(actor[group]);
    this.syncTotal(actor);
    this.onFieldChange();
  }

  /**
   * "Age disaggregation not available": the youth figures are split 50/50 by the system and stamped
   * `youth_split_applied_by_system`; unticking clears them, so an estimate never passes for a reported figure.
   */
  onAgeFallbackChange(actor: any): void {
    if (actor?.age_disaggregation_not_available) {
      this.applyYouthSplit(actor);
    } else {
      actor.women_youth = null;
      actor.men_youth = null;
      actor.youth_split_applied_by_system = null;
    }
    this.syncTotal(actor);
    this.onFieldChange();
  }

  private applyYouthSplit(actor: any): void {
    const half = (value: any) => {
      const n = this.toCount(value);
      return n !== null && n > 0 ? Math.round(n / 2) : 0;
    };
    actor.women_youth = half(actor.women);
    actor.men_youth = half(actor.men);
    actor.youth_split_applied_by_system = true;
  }

  /** `how_many` carries the Total while the breakdown applies, as in pooled (`calculateTotalField`). */
  private syncTotal(actor: any): void {
    if (!actor?.sex_and_age_disaggregation) actor.how_many = this.actorTotal(actor);
  }

  private toCount(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  addOrganization(): void {
    if (!this.body.organization) this.body.organization = [];
    this.body.organization.push({ institution_types_id: null, is_active: true });
    this.onFieldChange();
  }

  /** P2-3428 — the projection's "Add actor" / "Add organization" / "Add other" (W1/W2 labels). */
  addProjection2030Actor(): void {
    this.projection2030.actors.push({ actor_type_id: null, sex_and_age_disaggregation: false, is_active: true });
    this.onFieldChange();
  }

  addProjection2030Organization(): void {
    this.projection2030.organization.push({ institution_types_id: null, is_active: true });
    this.onFieldChange();
  }

  addProjection2030Measure(): void {
    this.projection2030.measures.push({ is_active: true });
    this.onFieldChange();
  }

  deleteOrganization(organization: any): void {
    organization.is_active = false;
    this.onFieldChange();
  }

  onOrganizationTypeChange(organization: any): void {
    organization.institution_sub_type_id = null;
    this.onFieldChange();
  }

  addMeasure(): void {
    if (!this.body.measures) this.body.measures = [];
    this.body.measures.push({ is_active: true });
    this.onFieldChange();
  }

  deleteMeasure(measure: any): void {
    measure.is_active = false;
    this.onFieldChange();
  }

  /** Study links are plain strings, exactly as the W1/W2 `app-studies-link` stores them. */
  addStudyLink(): void {
    if (!Array.isArray(this.body.scaling_studies_urls)) this.body.scaling_studies_urls = [];
    this.body.scaling_studies_urls.push('');
    this.onFieldChange();
  }

  deleteStudyLink(index: number): void {
    this.body.scaling_studies_urls?.splice(index, 1);
    this.onFieldChange();
  }

  /** P2-3424 — answering "No" drops the previously chosen result so the payload cannot keep a stale link. */
  onInnovationLinkChange(): void {
    if (this.body.has_innovation_link !== true) this.body.linked_result_id = null;
    this.onFieldChange();
  }

  /**
   * P2-3294 / P2-3428 AC13 — from use level 6 the scaling-studies question disappears, so the answer it
   * held is dropped: leaving it behind would keep persisting a "Yes" and its URLs behind a control the
   * user can no longer see or correct. Same reason `onInnovationLinkChange` drops the linked result.
   */
  onUseLevelChange(): void {
    if (this.useLevelNumber >= SCALING_STUDIES_MAX_USE_LEVEL) {
      this.body.has_scaling_studies = null;
      this.body.scaling_studies_urls = [];
    }
    this.onFieldChange();
  }

  onFieldChange(): void {
    this.updateMds();
    this.queueTypeSave();
  }

  onSave(): void {
    this.queueTypeSave(0);
  }

  private queueTypeSave(debounceMs = 800): void {
    // P2-3556 — the single choke point every write of this section goes through. `onFieldChange` and
    // `onSave` are its only callers, and every one of the eleven list/cascade handlers funnels into
    // `onFieldChange`; nothing else in this component calls `schedulePayload`, and
    // `BilateralApiService.PATCH_innovationUse` has no other caller in the client (the W1/W2 form uses
    // `ResultsApiService.PATCH_innovationUse`, a different method against a different URL), while
    // `patchByEndpoint`'s `typeSpecific` case throws (`bilateral-auto-save.service.ts:427`) so the
    // executor above is the only route to the endpoint.
    //
    // A section that does not know what the server holds cannot tell "empty because the user emptied
    // it" from "empty because it never loaded", so it writes nothing at all rather than nulling the
    // use level, the two to-be-determined answers, the readiness explanation and the innovation link,
    // and deleting every stored scaling-study URL.
    if (this.loaded() !== true) return;

    this.autoSave.schedulePayload('typeSpecific', this.buildPayload(), {
      debounceMs,
      statusKey: 'type-specific',
      executor: (resultId, body) => this.patchUnlessActorMissingType(resultId, body)
    });
  }

  /**
   * Night sweep 2026-09-23, BIL-1 — the refusal lives in the EXECUTOR, i.e. at the moment Save draft
   * (or leaving the section) actually sends the staged payload, not at staging time: the staged body
   * holds the same row objects the form edits, so a payload staged when the row was still blank would
   * otherwise leave with Women/Men typed in afterwards and no type — and the server skips it as blank
   * and answers 201 (`innovation_dev.service.ts` `isDiscardable`, 146d26112). Failing here reuses the
   * editor's own path: the section is marked in error, Save draft shows "Save failed" with this
   * reason, and Next/Back keep the person on the section. Blank rows never trip it.
   */
  private patchUnlessActorMissingType(resultId: number, body: Record<string, unknown>): Observable<unknown> {
    if (this.hasActorMissingType) {
      return throwError(() => ({ status: 400, error: { message: this.copy.actorTypeMissing } }));
    }
    return this.bilateralApi.PATCH_innovationUse(resultId, body);
  }

  /** Flattens a sub-type back into `institution_types_id`, without mutating `body` (which the UI's cascade still needs). */
  private buildOrganizationsForSave(organizations: any[] = this.body.organization): any[] {
    return (organizations ?? []).map((org: any) => {
      const { institution_sub_type_id, ...rest } = org;
      return institution_sub_type_id ? { ...rest, institution_types_id: institution_sub_type_id } : rest;
    });
  }

  private buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      innov_use_to_be_determined: this.body.innov_use_to_be_determined ?? null,
      innovation_use_level_id: this.body.innovation_use_level_id ?? null,
      innovatonUse: {
        actors: this.body.actors ?? [],
        organization: this.buildOrganizationsForSave(),
        measures: this.body.measures ?? []
      },
      // P2-3424: everything below now round-trips through the legacy summary endpoint — its DTO
      // (server `api/results/summary/dto/create-innovation-use.dto.ts`) declares these keys and
      // `SummaryService.saveInnovationUse` persists them, so they survive a reload.
      // P2-3390: the three investment tables. The server writes each one only when its key is present,
      // so they are sent as-is — one row per entity, exactly as they were read. `investment_bilateral`
      // carries `project_id` per row, which is what keys `non_pooled_projetct_budget` by
      // `result_project_id`; the legacy `*_expected_investment` keys are NEVER sent from here, because the
      // legacy writer resolves the `non_pooled_project` catalogue and would drop every bilateral row in
      // silence (server `api/results/summary/innovation_dev.service.ts`).
      investment_programs: this.body.investment_programs ?? [],
      investment_bilateral: this.body.investment_bilateral ?? [],
      investment_partners: this.body.investment_partners ?? [],
      has_scaling_studies: this.body.has_scaling_studies ?? null,
      scaling_studies_urls: this.body.scaling_studies_urls ?? [],
      innov_use_2030_to_be_determined: this.body.innov_use_2030_to_be_determined ?? null,
      // P2-3428 — the 2030 Use Projection lists. Sent whole every time, like `innovatonUse`; the server
      // writes them under `section_id = 2`, and retires them when the use is "yet to be determined".
      innovation_use_2030: {
        actors: this.body.innovation_use_2030?.actors ?? [],
        organization: this.buildOrganizationsForSave(this.body.innovation_use_2030?.organization),
        measures: this.body.innovation_use_2030?.measures ?? []
      },
      readiness_level_explanation: this.body.readiness_level_explanation ?? null,
      has_innovation_link: this.body.has_innovation_link ?? null,
      // `pr-select` hands back the catalog's raw `id`, which arrives as a numeric STRING — normalize it so
      // the contract always carries numbers, the way the W1/W2 section stores them.
      linked_results: this.body.linked_result_id == null ? [] : [Number(this.body.linked_result_id)]
    };
    // Omit null PK so the server can AUTO_INCREMENT on first create.
    if (this.body.result_innovation_use_id != null) {
      payload['result_innovation_use_id'] = this.body.result_innovation_use_id;
    }
    return payload;
  }

  /** A measure only counts once it carries BOTH halves — a unit with no quantity says nothing (AC6). */
  private hasCompleteMeasure(): boolean {
    return (this.body.measures ?? []).some(
      (m: any) =>
        m.is_active !== false &&
        String(m.unit_of_measure ?? '').trim() !== '' &&
        m.quantity !== null &&
        m.quantity !== undefined &&
        String(m.quantity).trim() !== ''
    );
  }

  /**
   * P2-3428 / P2-3331 — the bilateral Innovation Use MDS.
   *
   * P2-3785 AC1 (Nicoleta Trifa, #INC-163204 point 4a, 21-Sep-2026): **three** items now, not four —
   * "How would you assess the current use level of the innovation?" was withdrawn from the standard.
   * Dropping it from this list is what actually frees the section: `overallStatus` is computed from the
   * published items alone (`bilateral-mds-tracker.service.ts`), and the rail's Submit reads that. Leaving
   * it published with `optional: true` would have kept it on the aside's checklist without counting, but
   * that flag exists for fields the reporter is still ASKED for; this one stops being asked altogether.
   * The matching server-side gate was removed in the same change — a client-only relaxation would have
   * turned a blocked section into a section that passes locally and is refused on Submit.
   */
  updateMds(): void {
    const tbd = this.body.innov_use_to_be_determined;
    const tbdSet = tbd !== null && tbd !== undefined;
    const hasActors = (this.body.actors ?? []).some((a: any) => a.is_active !== false);
    // BIL-1 — while a row with figures and no actor type is on screen the save is being held (see
    // `queueTypeSave`), so "Actors" must not read complete.
    //
    // Review room NS-07 (Cami, 24-Sep-2026): "agregar en las alertas en que falta actor type y no
    // dejarlo como Section complete". The row IS answered, so it is reported the P2-3340 way —
    // `filled` with `invalid` + a reason — instead of reading as empty: the footer then says
    // "1 field to fix · Actors (a row has figures but no actor type…)" rather than the bare "Actors",
    // `getSectionMdsStatus` drops the section to `partial`, and `canSubmitFromRail` refuses and names
    // it. Scope = the same rows the save refuses on (`hasActorMissingType`): current use only while
    // the use is not "to be determined", plus the 2030 list while it is shown.
    const actorWithoutType = this.hasActorMissingType;
    this.mdsTracker.setSectionFields('type-specific', [
      {
        key: 'use-actors',
        label: 'Actors',
        // AC4: when the use is still to be determined no actor is requested, so the field is satisfied.
        filled: tbdSet && (tbd === true || hasActors),
        ...(actorWithoutType ? { invalid: true, invalidReason: this.copy.actorTypeMissingReason } : {})
      },
      {
        key: 'use-measures',
        label: 'Other quantitative measures of innovation use',
        filled: this.hasCompleteMeasure(),
        optional: true
      },
      {
        key: 'use-investment',
        label: 'Investment by CGIAR W3 or bilateral projects',
        filled:
          Array.isArray(this.body.investment_bilateral) &&
          this.body.investment_bilateral.length > 0 &&
          this.body.investment_bilateral.every((investment: any) => Number(investment?.kind_cash) > 0 !== (investment?.is_determined === true))
      }
    ]);
  }
}
