import { Component, computed, effect, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, from, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { InnovationDevInfoBody } from './model/innovationDevInfoBody';
import { InnovationControlListService } from '../../../../../../../shared/services/global/innovation-control-list.service';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InnovationDevelopmentQuestions } from './model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from './services/innovation-dev-info-utils.service';
import { InnovationDevelopmentLinks } from './model/InnovationDevelopmentLinks.model';
import { EvidencesBody } from '../../../../result-detail/pages/rd-evidences/model/evidencesBody.model';
import { FieldsManagerService } from '../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import { SharePointUploadService } from '../../../../../../../shared/services/sharepoint-upload/sharepoint-upload.service';
import { CanComponentDeactivate } from '../../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';

/**
 * Guidance printed under "Innovation Developer" up to the 2025 phase. Kept verbatim — P2-3272 Part 4
 * drops it from 2026 on, and epic P2-3243 requires earlier phases to render exactly as they did.
 * `app-field-card` paints no description block at all when it receives an empty string.
 */
const LEGACY_INNOVATION_DEVELOPER_DESCRIPTION = `Provide the full name(s), email address and organizational affiliation(s) of the innovation developer/ contact person
        Innovation developer will be first author of the Innovation Profile document and the prime contact for the innovation.<br>
        Please provide information such as first name, family name, email address and organizational affiliations.`;

@Component({
  selector: 'app-innovation-dev-info',
  templateUrl: './innovation-dev-info.component.html',
  styleUrls: ['./innovation-dev-info.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class InnovationDevInfoComponent implements CanComponentDeactivate {
  innovationDevInfoBody = new InnovationDevInfoBody();
  range = 5;
  savingSection = false;
  innovationDevelopmentQuestions: InnovationDevelopmentQuestions = new InnovationDevelopmentQuestions();
  innovationDevelopmentLinks: InnovationDevelopmentLinks = new InnovationDevelopmentLinks();

  evidencesBody: EvidencesBody = new EvidencesBody();

  /**
   * P2-3220 — the SharePoint upload sequence is NOT owned here any more. This section used to keep
   * its own copy (its own session loop, its own progress interval, its own `sp_*` assignments) and
   * it was the only one of the three that called `POST_createUploadSessionP25`, so "every upload
   * goes through the shared flow" was not something the code could enforce.
   */
  private readonly sharePointUploadSE = inject(SharePointUploadService);

  /**
   * `UCA-T-11` — component-scoped dirty-diff tracker (`providers: [SectionDirtyTrackerService]`
   * on this component, same pattern as every other `CanComponentDeactivate` section in
   * `docs/specs/changes/unsaved-changes-alert/`). The tracked value is a COMPOSITE of the three
   * bound objects this section actually saves — `innovationDevInfoBody` (+questionnaire merged in
   * by `buildSectionPayload()`), `innovationDevelopmentQuestions` (the questionnaire itself, loaded
   * via a SEPARATE concurrent GET from the body) and `evidencesBody` (P25 only, its own POST) — an
   * edit to any of the three must count as "unsaved changes" (`UCA-DD-1`).
   *
   * Snapshotted once at the end of EACH of the section's independent, concurrently-firing load
   * GETs (`getSectionInformation()`'s own `next` AND `GET_questionsInnovationDevelopment()`'s
   * `next`; `getSectionInformationp25()`'s own `next`, `GET_questionsInnovationDevelopmentP25()`'s
   * `next` AND `getEvidenceDemandP25()`'s `next`) — NOT chained. Since none of these GETs is
   * ordered relative to the others, whichever resolves LAST establishes the correct composite
   * baseline (each snapshot call reads `this.*`'s CURRENT value for all three tracked objects, so a
   * later call always captures whatever the earlier one(s) already set). Investigated and ruled
   * out as a single "true end of load" call site: `forkJoin`-ing the GETs was out of scope
   * (behavior-preserving refactor only, `UCA-DD-3`-style — not requested by this task).
   *
   * `estimates`/`assumptions-examination` (this task's named risk) were traced and found to write
   * NOTHING into `body`/`options` — both are read-only renderers reacting solely to user clicks
   * (`handleSelectionChange`), never to `ngOnInit`/`ngOnChanges`/an `effect()`. TWO real
   * child-mutation risks were found in this section's subtree: `IntellectualPropertyRightsComponent`
   * (the LEGACY, ≤2025-phase IPR renderer — see `normalizeQuestionsForDiff()` below) and
   * `StudiesLinkComponent` (see `normalizeInnovationDevInfoBodyForDiff()` below).
   */
  private readonly dirtyTracker = inject(SectionDirtyTrackerService);

  /**
   * Drives `[appSectionSkeleton]`. TRUE from construction and NOT from "a request is in flight":
   * this section loads from an `effect()` gated on `currentResultSignal()?.portfolio`, so between
   * first paint and the GET there is no request at all and the empty body would paint as a
   * mandatory-but-empty form. Released on `next` AND `error`.
   */
  readonly sectionLoading = signal(true);

  constructor(
    private readonly api: ApiService,
    public innovationControlListSE: InnovationControlListService,
    private readonly innovationDevInfoUtilsSE: InnovationDevInfoUtilsService,
    public fieldsManagerSE: FieldsManagerService,
    public dataControlSE: DataControlService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Innovation Development information');
  }

  OnChangePortfolio = effect(() => {
    if (this.dataControlSE.currentResultSignal()?.portfolio !== undefined) {
      this.fieldsManagerSE.isP25() ? this.getSectionInformationp25() : this.getSectionInformation();
    }
  });

  /**
   * P2-3272 Part 4 — from the 2026 phase on the field is pre-filled from the Lead contact person,
   * so its long guidance note is dropped. Phases <= 2025 keep the note verbatim.
   */
  innovationDeveloperDescription = computed(() =>
    this.fieldsManagerSE.isInnovationDeveloperAutoFilled2026() ? '' : LEGACY_INNOVATION_DEVELOPER_DESCRIPTION
  );

  /**
   * P2-3643 — explains the 2026+ auto-fill from Lead Contact Person (see applyInnovationDeveloperAutoFill()
   * below) so users know why the field arrives pre-populated and how to override it.
   */
  innovationDeveloperTooltip = computed(() =>
    this.fieldsManagerSE.isInnovationDeveloperAutoFilled2026()
      ? "This field is prepopulated with the Lead Contact person's information. If you wish to change it, remove the existing entry and replace it with the Innovation Developer's email or full name."
      : ''
  );

  collaboratorsDescription = computed(() => {
    return `Provide the full name(s), email address and organizational affiliation(s)  of other CGIAR and/or partner colleagues that contribute to this innovation
        Names of key contributors will feature as co-authors on the Innovation Profile document in the same order as provided below. <br>
        <br>
        <b>Standard format for entering collaborators:</b> <br>
        Please enter each collaborator using the following format: Collaborator Name (email address).
        If you register more than one collaborator, separate them using a semicolon (;).<br><br>
        <b>Example:</b> Michael Thompson (m.thompson@innovationlab.org); Aisha Rahman (a.rahman@globalresearch.net)`;
  });

  getSectionInformationp25(): void {
    this.api.resultsSE.GET_innovationDevP25().subscribe({
      next: ({ response }) => {
        this.innovationDevInfoBody = response;
        this.convertOrganizations(response?.innovatonUse?.organization);
        this.normalizeInnovationDevBooleans();
        this.applyInnovationDeveloperAutoFill();
        this.savingSection = false;
        this.sectionLoading.set(false);
        // `UCA-T-11` — one of 3 concurrent load GETs feeding the composite snapshot; see the
        // `dirtyTracker` docstring above for why each of the 3 snapshots independently.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
      },
      error: err => {
        console.error(err);
        this.savingSection = false;
        this.sectionLoading.set(false);
      }
    });
    this.api.resultsSE.GET_questionsInnovationDevelopmentP25().subscribe(({ response }) => {
      this.innovationDevelopmentQuestions = response;
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q3);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q4);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.innovation_team_diversity);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q3);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q4);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.megatrends);
      // `UCA-T-11` — see above; this is the 2nd of 3 concurrent load GETs.
      this.dirtyTracker.snapshot(this.dirtySnapshotValue());
    });

    this.getEvidenceDemandP25();
  }

  GET_questionsInnovationDevelopment() {
    this.api.resultsSE.GET_questionsInnovationDevelopment().subscribe(({ response }) => {
      this.innovationDevelopmentQuestions = response;
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.responsible_innovation_and_scaling.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.innovation_team_diversity);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q1);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q2);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.intellectual_property_rights.q3);
      this.innovationDevInfoUtilsSE.mapRadioButtonBooleans(this.innovationDevelopmentQuestions.megatrends);
      // `UCA-T-11` — one of 2 concurrent load GETs (legacy path) feeding the composite snapshot;
      // see the `dirtyTracker` docstring on this class for why each snapshots independently.
      this.dirtyTracker.snapshot(this.dirtySnapshotValue());
    });
  }

  getSectionInformation() {
    this.savingSection = true;
    this.GET_questionsInnovationDevelopment();
    this.api.resultsSE.GET_innovationDev().subscribe({
      next: ({ response }) => {
        this.convertOrganizations(response?.innovatonUse?.organization);
        this.innovationDevInfoBody = response;
        this.normalizeInnovationDevBooleans();
        this.applyInnovationDeveloperAutoFill();
        this.savingSection = false;
        this.sectionLoading.set(false);
        // `UCA-T-11` — the 2nd of 2 concurrent load GETs (legacy path); see above.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
      },
      error: err => {
        console.error(err);
        this.savingSection = false;
        this.sectionLoading.set(false);
      }
    });
  }

  private getEvidenceDemandP25() {
    this.api.resultsSE.GET_evidenceDemandP25().subscribe(({ response }) => {
      this.evidencesBody = response ?? new EvidencesBody();
      // `UCA-T-11` — the 3rd of 3 concurrent load GETs (P25 path); see the `dirtyTracker`
      // docstring on this class for why each snapshots independently.
      this.dirtyTracker.snapshot(this.dirtySnapshotValue());
    });
  }

  /** `UCA-T-11` — `CanComponentDeactivate.hasUnsavedChanges()`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtySnapshotValue());
  }

  /**
   * `UCA-T-11` — `CanComponentDeactivate.saveSection()`. Wraps the exact same save pipeline
   * `onSaveSection()` drives (`performSave()`, below) so there is no duplicated save logic
   * (`UCA-DD-3`); resolves `true`/`false` per `performSave()`'s own contract.
   */
  saveSection(): Observable<boolean> {
    return this.performSave();
  }

  /**
   * `UCA-T-11` — the composite value the dirty tracker snapshots/diffs. See the `dirtyTracker`
   * docstring above for why all three bound objects are tracked together.
   */
  private dirtySnapshotValue(): { innovationDevInfoBody: unknown; innovationDevelopmentQuestions: unknown; evidencesBody: unknown } {
    return {
      innovationDevInfoBody: this.normalizeInnovationDevInfoBodyForDiff(this.innovationDevInfoBody),
      innovationDevelopmentQuestions: this.normalizeQuestionsForDiff(this.innovationDevelopmentQuestions),
      evidencesBody: this.normalizeEvidencesForDiff(this.evidencesBody)
    };
  }

  /**
   * `UCA-T-11` rework attempt 2 — a FOURTH child writer, missed by attempt 1: `StudiesLinkComponent`
   * (`shared/components/innovation-use-form/components/studies-link/studies-link.component.ts:21-28`)
   * seeds `scaling_studies_urls` with a placeholder `['']` in its own `ngOnInit()` whenever the array
   * loads empty and the section is editable (`[disabled]` is not bound from this template, so it
   * defaults `false`). Rendered whenever `isP25() && innovationDevInfoBody.has_scaling_studies &&
   * showScalingStudiesQuestion()` (P25, readiness level >= 6, pre-2026 phase) — a real,
   * server-confirmed empty-array case (a reporter who already answered "yes" but has not typed a
   * study link yet), strictly AFTER this component's own load-flow snapshot(s) already ran.
   *
   * Same bug class as `IntellectualPropertyRightsComponent` above, and — same child component, same
   * fix shape — as the sibling `innovation-use-info` section's `normalizeScalingStudiesUrlsForDiff()`:
   * filters ALL blank/whitespace-only entries, not just a single trailing one, since
   * `StudiesLinkComponent.addStudiesLink()` always collapses existing blank rows before pushing a new
   * one, so this stays symmetric without needing to special-case position. A real typed URL is never
   * blank, so this never hides a genuine edit; deleting every real URL still reports dirty (`[]`
   * after normalization differs from a non-empty snapshot). Applied identically on both the snapshot
   * side and the live side (`hasUnsavedChanges()` → `dirtySnapshotValue()`).
   */
  private normalizeInnovationDevInfoBodyForDiff(body: InnovationDevInfoBody | undefined | null): unknown {
    if (!body) return body;
    const urls = (body as any).scaling_studies_urls;
    return {
      ...body,
      scaling_studies_urls: (Array.isArray(urls) ? urls : []).filter((u: unknown) => typeof u === 'string' && u.trim() !== '')
    };
  }

  /**
   * `UCA-T-11` — normalizes `innovationDevelopmentQuestions` for the dirty diff.
   *
   * `IntellectualPropertyRightsComponent` (the LEGACY, ≤2025-phase IPR renderer — rendered whenever
   * `!isInnovationDevFormReduced2026()`) mutates the SAME `intellectual_property_rights.q1..q4`
   * objects this component already snapshotted, in its own `ngOnInit()` AND its `@Input() set
   * options()` — both fire during Angular's render pass, strictly AFTER the GET callback above
   * that assigns `innovationDevelopmentQuestions` and calls `snapshot()`:
   *   1. `ngOnInit()` unconditionally sets `q1..q4['value'] = null` — a field nothing else in the
   *      app ever reads (`grep` confirmed: no template, service, or PATCH payload consumer reads
   *      it) — so a freshly loaded, unedited section would report dirty on this alone.
   *   2. The `@Input() set options()` back-fills a MISSING `qN` slot with `new Q12()`/`new Q3()`
   *      (`ipr.q4 ??= new Q3()`) — reachable in production, not theoretical: the component's own
   *      docstring documents a real result (id 51) whose payload omits `q4` for exactly this
   *      legacy path.
   * Both are the same "child mutates the tracked object after the parent's snapshot" bug class as
   * `rd-geographic-location`/`rd-theory-of-change`'s `normalizeCountriesForDiff()`/
   * `normalizeTocResultsForDiff()`. Re-snapshotting after the child "settles" was rejected the same
   * way those precedents rejected it: `IntellectualPropertyRightsComponent` exposes no output that
   * fires after its own load-time mutation (its only listener-facing method,
   * `clearIntellectualPropertyRights()`, is user-triggered).
   *
   * Fix: project each `qN` slot down to only the fields the diff should actually care about
   * (`radioButtonValue`, `options[].{result_question_id,answer_boolean,answer_text}`) — dropping
   * the unused `value` key AND making a missing slot (`undefined`, before the child's `??=` fill)
   * serialize IDENTICALLY to a present-but-untouched slot (`{ radioButtonValue: null, options: [] }`,
   * after the fill). This is timing-independent: it does not matter whether `snapshot()`/`isDirty()`
   * runs before or after the child's mutation, because both inputs project to the same output.
   * Applied identically on both the snapshot side and the live side (`hasUnsavedChanges()` →
   * `dirtySnapshotValue()`), so the diff stays symmetric.
   *
   * The whole group is projected UNCONDITIONALLY (not `ipr ? {...} : ipr`) so a payload that omits
   * `intellectual_property_rights` entirely still normalizes to the same shape as one with all four
   * slots present-but-empty — `projectQNode` already tolerates `undefined` via its own `q?.[...]`
   * reads, so this closes that edge for free (Reviewer ADVISORY, attempt 1).
   *
   * The other three groups (`responsible_innovation_and_scaling`, `innovation_team_diversity`,
   * `megatrends`) are NOT normalized: none of their child renderers (`stage-assessment`,
   * `gesi-innovation-assessment`, `scale-impact-analysis`, `megatrends`, `innovation-team-diversity`,
   * `assumptions-examination`, `partners-policies-safeguards`, `intellectual-property-considerations`)
   * has an `ngOnInit`/`ngOnChanges`/`effect()` — all mutation in those groups happens exclusively
   * inside a user-triggered `handleSelectionChange()`-style handler, verified by reading every one.
   */
  private normalizeQuestionsForDiff(questions: InnovationDevelopmentQuestions | undefined | null): unknown {
    if (!questions) return questions;
    const projectQNode = (q: any) => ({
      radioButtonValue: q?.['radioButtonValue'] ?? null,
      options: (q?.options ?? []).map((opt: any) => ({
        result_question_id: opt?.result_question_id,
        answer_boolean: opt?.answer_boolean ?? null,
        answer_text: opt?.answer_text ?? null
      }))
    });
    const ipr = questions.intellectual_property_rights;
    return {
      ...questions,
      intellectual_property_rights: {
        q1: projectQNode(ipr?.q1),
        q2: projectQNode(ipr?.q2),
        q3: projectQNode(ipr?.q3),
        q4: projectQNode(ipr?.q4)
      }
    };
  }

  /**
   * `UCA-T-11` — File/Blob exclusion for the dirty-diff, same shape as `rd-evidences`'s
   * `dirtySnapshotTarget()` (`UCA-OQ-2`, `UCA-T-8`). `EvidencesCreateInterface.file` is a raw
   * `File`/`Blob`, whose own enumerable properties are empty (`size`/`type`/`name` are prototype
   * getters), so `JSON.stringify` always serializes it to `"{}"` regardless of which file is
   * attached — excluded explicitly rather than relying on that accident. Narrow, accepted gap:
   * swapping ONLY the attached file (same metadata) is not reported as dirty.
   */
  private normalizeEvidencesForDiff(evidencesBody: EvidencesBody | undefined | null): unknown {
    if (!evidencesBody) return evidencesBody;
    return {
      ...evidencesBody,
      evidences: (evidencesBody.evidences ?? []).map(({ file, ...rest }) => rest)
    };
  }

  convertOrganizations(organizations) {
    organizations.forEach((item: any) => {
      if (item.parent_institution_type_id) {
        item.institution_sub_type_id = item?.institution_types_id;
        item.institution_types_id = item?.parent_institution_type_id;
      }
    });
  }

  /**
   * P2-3272 Part 4 — pre-fill "Innovation Developer" with the Lead contact person captured in
   * General Information, from the 2026 phase on.
   *
   * Only when the field is still empty: overwriting would silently discard a name the reporter
   * typed themselves, and the requirement asks for a starting point, not a locked value. The field
   * stays editable, and it is not part of the green check (`validation_innovation_dev_P25` does not
   * read `innovation_developers`), so pre-filling can never block a submission.
   *
   * ⚠️ The value is only persisted when the section is saved. A reporter who clears the field and
   * reloads without saving sees it pre-filled again — that is the cost of "pre-fill when empty",
   * and the alternative (a stored "was cleared on purpose" flag) needs a column nobody asked for.
   */
  private applyInnovationDeveloperAutoFill(): void {
    if (!this.fieldsManagerSE.isInnovationDeveloperAutoFilled2026()) return;
    if (this.innovationDevInfoBody?.innovation_developers?.trim()) return;
    const leadContactPerson = `${this.dataControlSE.currentResultSignal()?.lead_contact_person ?? ''}`.trim();
    if (!leadContactPerson) return;
    this.innovationDevInfoBody.innovation_developers = leadContactPerson;
  }

  private normalizeInnovationDevBooleans(): void {
    this.innovationDevInfoBody.innovation_user_to_be_determined = Boolean(
      this.innovationDevInfoBody.innovation_user_to_be_determined,
    );
    this.innovationDevInfoBody.is_new_variety =
      this.innovationDevInfoBody.is_new_variety == null
        ? null
        : Boolean(this.innovationDevInfoBody.is_new_variety);
    if (this.innovationDevInfoBody.innovation_nature_id != null) {
      this.innovationDevInfoBody.innovation_nature_id = Number(
        this.innovationDevInfoBody.innovation_nature_id,
      );
    }
  }

  convertOrganizationsTosave() {
    this.innovationDevInfoBody.innovatonUse.organization.forEach((item: any) => {
      if (item.institution_sub_type_id) {
        item.institution_types_id = item.institution_sub_type_id;
      }
    });
  }

  /**
   * P2-3218 — a save failure has to reach the user, not just the console.
   *
   * Same shape as the fix applied to the other two evidence surfaces in e014ee987, so the three
   * upload points now react to failure identically instead of three different ways.
   */
  private showSaveError(title: string, description: string): void {
    this.api.alertsFe.show({
      id: 'innovation-dev-save-failed',
      title,
      description,
      status: 'error'
    });
  }

  /**
   * P2-3550 AC4 — "Stored reference materials are not deleted, cleared or migrated".
   *
   * Hiding the block is not enough, and doing only that would DELETE data. The server's
   * `InnovationDevService.saveEvidence` returns early **only** when the array is `null`/`undefined`
   * (`onecgiar-pr-server/src/api/results/summary/innovation_dev.service.ts:99-101`); with any other
   * value it walks every stored evidence of type 4 and sets `is_active = 0` on the ones whose link
   * is not in the payload (`:110-125`). Since `InnovationDevInfoBody` seeds `reference_materials`
   * with `[{ link: '' }]`, a hidden-but-still-sent field would wipe the references of every 2026
   * result on the next save (real case in prtest: result 11082, phase 2026, `is_replicated` 0,
   * evidence 12818 = `link.com`).
   *
   * So the key is **omitted**, never sent empty — the same undefined-vs-value contract as the
   * MELIA-study fix. Destructuring (instead of `delete`) is what guarantees the key is absent from
   * the JSON rather than present with `undefined`.
   */
  private buildSectionPayload(): Record<string, any> {
    const { reference_materials, ...rest } = { ...this.innovationDevInfoBody, ...this.innovationDevelopmentQuestions } as Record<string, any>;
    const payload = this.fieldsManagerSE.isInnovationReferenceMaterialsRemoved2026() ? rest : { ...rest, reference_materials };
    return this.fieldsManagerSE.isInnovationDevFormReduced2026() ? this.withoutRetiredAssumptionsQuestion(payload) : payload;
  }

  /**
   * P2-3642 AC2 — "Removal does not affect existing saved data from prior reporting cycles".
   *
   * Question 136 is not a field of the summary: it is a questionnaire slot, and the client echoes
   * the whole GET response back on save. Measured, key by key, what a 2026 save carries once the
   * block stops rendering: `innovationDevelopmentQuestions` IS the GET payload, `q3` is still served
   * for 2026 (`resolveScalingSlotsForPhase` pins `['q3', 136]` for the reduced form,
   * `onecgiar-pr-server/.../result-questions.service.ts:529-533`), and nothing mutates it while the
   * component is unrendered — `handleSelectionChange()` is the only writer and it lives inside
   * `assumptions-examination`. So the key travelled back with its stored answer intact: no data was
   * being lost today.
   *
   * It was still a WRITE to a question the form no longer shows, and one that only stayed harmless
   * because the GET keeps repopulating it — the same load-bearing coincidence P2-3641 documented.
   * The server gives a stronger guarantee for free: `_saveNestedQuestionGroup` iterates the `qN`
   * keys PRESENT in the payload and leaves an absent slot completely alone
   * (`.../innovation_dev/innovation_dev.service.ts:_presentQuestionSlots` / `_saveSingleQuestion`),
   * which is exactly the contract q4 has relied on since P2-3467. So from 2026 `q3` is **omitted**,
   * never sent empty: `saveOptionsAndSubOptions` — which would force `answer_boolean = false` on
   * every non-selected option and null the `answer_text` of a "Why?" it was handed empty — is never
   * called for 136 again.
   *
   * Destructuring, not `delete`: the key must be ABSENT from the JSON, not present as `undefined`.
   * A new group object is built so `innovationDevelopmentQuestions` itself is never mutated — the
   * 2025 path and a re-save after the GET must keep seeing q3.
   */
  private withoutRetiredAssumptionsQuestion(payload: Record<string, any>): Record<string, any> {
    const group = payload['responsible_innovation_and_scaling'];
    if (!group) return payload;

    const { q3, ...groupWithoutQ3 } = group as Record<string, any>;
    return { ...payload, responsible_innovation_and_scaling: groupWithoutQ3 };
  }

  /**
   * `UCA-T-11`: still fire-and-forget for the section's own Save button — `performSave()` never
   * throws (`catchError` resolves `false` on every failure branch), so this stays safe for a
   * caller that does not await it.
   */
  async onSaveSection() {
    // `defaultValue: false` is defensive-only: `performSave()` always emits via `map(() => true)`
    // or `catchError(() => of(false))`, so it can never complete without emitting under real
    // `HttpClient` — this only removes the theoretical `EmptyError` case at zero behavioural cost.
    await firstValueFrom(this.performSave(), { defaultValue: false });
  }

  /**
   * `UCA-T-11` — the single save pipeline behind both the section's own Save action
   * (`onSaveSection`, above) and `saveSection()` (`CanComponentDeactivate`, `UCA-DD-3`: no
   * duplicated save logic). Exact same branching, requests and error handling as the previous
   * `onSaveSection()`/`savePhaseP25SectionFields()` pair — only the wiring changed, from
   * self-subscribing `void`/`async` to a single `Observable<boolean>` both callers share.
   */
  private performSave(): Observable<boolean> {
    this.savingSection = true;
    this.convertOrganizationsTosave();
    if (this.innovationDevInfoBody.innovation_nature_id != 12) {
      this.innovationDevInfoBody.number_of_varieties = null;
      this.innovationDevInfoBody.is_new_variety = null;
    }

    if (this.fieldsManagerSE.isP25()) {
      const resultId = (this.api.dataControlSE?.currentResult as any)?.result_id ?? (this.api.dataControlSE?.currentResult as any)?.id;
      (this.evidencesBody as any).result_id = resultId;

      // P2-3641 AC — "Removal does not affect existing saved data from prior reporting cycles".
      // The evidence endpoint takes the WHOLE array and treats it as the new truth: an empty one
      // deactivates every stored evidence of this type for the result. So from 2026 the request is
      // OMITTED entirely, never sent empty.
      if (this.fieldsManagerSE.isInnovationDevFormReduced2026()) {
        return this.patchInnovationDevP25(false);
      }

      // P2-3218 / P2-3220: an upload failure does not abandon the save — the file also travels in
      // the evidence-registration POST's own payload, so the section is still stored; the user is
      // just told, by file name, which ones did not reach SharePoint.
      return from(this.uploadPendingFiles()).pipe(
        switchMap(failedUploads => {
          if (failedUploads.length) {
            this.showSaveError(
              `${failedUploads.length} file(s) could not be stored: ${failedUploads.join(', ')}`,
              'The rest of the section is being saved, but those files are not in SharePoint. Please re-attach them and save again.'
            );
          }
          return this.api.resultsSE.POST_createEvidenceDemandP25(this.evidencesBody);
        }),
        switchMap(() => this.patchInnovationDevP25(true)),
        catchError(err => {
          console.error('[innovation-dev-info] registering the evidence failed', err);
          this.showSaveError(
            'Your evidence was not saved',
            'The files were uploaded but could not be registered against this result, so this section was not saved. Please try saving again.'
          );
          this.savingSection = false;
          return of(false);
        })
      );
    }

    return this.api.resultsSE.PATCH_innovationDev(this.buildSectionPayload()).pipe(
      tap(() => {
        // `UCA-T-11` — snapshot HERE, synchronously, the instant the PATCH resolves: the local
        // bodies at this exact moment are precisely what the server just persisted, correct even
        // before the reload below completes. Closes the same race `rd-general-information`'s
        // rework was FAILed for: without this, `saveSection()`'s `map(() => true)` could reach
        // `UnsavedChangesGuard` before the reload's own re-snapshot lands, or — if the reload
        // fails — the section would stay dirty forever despite a genuinely successful save.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.getSectionInformation();
        this.savingSection = false;
      }),
      map(() => true),
      catchError(err => {
        console.error(err);
        this.savingSection = false;
        return of(false);
      })
    );
  }

  /**
   * The P25 half of the section save. Extracted from `performSave()` so P2-3641 can reach it
   * WITHOUT the evidence request (see the comment at that call site).
   *
   * @param evidenceWasSaved whether the evidence request ran and succeeded. It only changes the
   * wording of the failure notice — telling a 2026 user "your evidence was stored" when no evidence
   * request was ever made would send them looking for something that does not exist.
   */
  private patchInnovationDevP25(evidenceWasSaved: boolean): Observable<boolean> {
    return this.api.resultsSE.PATCH_innovationDevP25(this.buildSectionPayload()).pipe(
      tap(() => {
        // `UCA-T-11` — same direct-snapshot-on-success reasoning as the legacy PATCH branch above.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.getSectionInformationp25();
        this.savingSection = false;
      }),
      map(() => true),
      catchError(err => {
        console.error('[innovation-dev-info] saving the section failed', err);
        this.showSaveError(
          'This section was not saved',
          evidenceWasSaved
            ? 'Your evidence was stored, but the rest of the section could not be saved. Please try saving again.'
            : 'The section could not be saved. Please try saving again.'
        );
        this.savingSection = false;
        return of(false);
      })
    );
  }

  /**
   * P2-3220 — delegates to the single shared upload flow and returns the names of the files that
   * did not reach SharePoint (empty when all went up). Never throws.
   *
   * Why each option is what it is:
   * - `flow: 'innovation-development'` → the v2 `evidence_demand/createUploadSession` door, the one
   *   this section has always used. The caller no longer names an endpoint.
   * - `skipAlreadyUploaded: true` → reproduces the old `if (evidence.file && !evidence.link)`.
   * - `trackProgress: true` → MEASURED, not assumed: `components/user-evidence/` renders both the
   *   percentage and the animated bar (`user-evidence.component.html:68-77`).
   * - `fallbackToLocalName: true` → the old copy did `response?.name || evidence.file.name`, and
   *   that fallback is load-bearing HERE: the same template gates the whole uploaded-file row on
   *   `sp_file_name`, so a nameless response would drop the just-attached file back to the
   *   drag-and-drop box. The two surfaces migrated before this one never had the fallback, hence
   *   an explicit option rather than a new default for all three.
   */
  private async uploadPendingFiles(): Promise<string[]> {
    const resultId = (this.api.dataControlSE?.currentResult as any)?.result_id ?? (this.api.dataControlSE?.currentResult as any)?.id;

    return this.sharePointUploadSE.uploadPending(this.evidencesBody.evidences, {
      resultId,
      flow: 'innovation-development',
      skipAlreadyUploaded: true,
      trackProgress: true,
      fallbackToLocalName: true,
      logLabel: 'innovation-dev-info'
    });
  }

  pdfOptions = [
    { name: 'Yes', value: true },
    { name: 'No, not necessary at this stage', value: false }
  ];

  pdfDescription() {
    return `Examples of IPSR Innovation Profiles can be found  <a class="open_route" target="_blank" href="https://cgspace.cgiar.org/handle/10568/121923">here</a>.`;
  }

  acknowledgementDescription() {
    return `Are there any specific investors or donors – other than the <a class="open_route" target="_blank" href="https://www.cgiar.org/funders/">CGIAR Fund Donors</a> – who provide core/pooled funding – that you wish to acknowledge for their critical contribution to the continued development, testing, and scaling of this innovation? <br> - Please separate donor/investor names by a semicolon. <br> - Donors/investors will be included in the acknowledgment section in the Innovation Profile.`;
  }

  alertInfoText() {
    return `Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale. Innovations may be at early stages of readiness (ideation and upstream research) or at more mature stages of readiness (delivery and scaling)<br><br>The specific number of new or improved lines/ varieties can be specified elsewhere.`;
  }

  alertInfoText2() {
    return `Please make sure you provide evidence/documentation that support the current innovation readiness level.<br>
    * Evidence are inputted in the "Evidence" section <a class="open_route" target="_blank" href="/result/result-detail/${this.api.resultsSE?.currentResultCode}/evidences?phase=${this.api.resultsSE?.currentResultPhase}">(click here to go there)</a><br>
    <br><br>
    Documentation may include idea-notes, concept-notes, technical report, pilot testing report, experimental data paper, newsletter, etc. It may be project reports, scientific publications, book chapters, communication materials that provide evidence of the current development/ maturity stage of the innovation.
    <br><br>
    Examples of evidence documentation for different CGIAR innovations and readiness levels can be found <a target="_blank" href="https://drive.google.com/file/d/1rWGC0VfxazlzdZ1htcfBSw1jO7GmVQbq/view" class='open_route alert-event'>here</a>`;
  }

  shortTitleDescription() {
    return `<ul>
    <li>Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale.</li>
    <li>Innovations may be at early stages of readiness (ideation or basic research) or at more mature stages of readiness (delivery and scaling).</li>
    <li>Enter a short name that facilitates clear communication about the innovation.</li>
    <li>Avoid abbreviations or (technical) jargon.</li>
    <li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>
    <li>You do not need to specify the number of new or improved lines/varieties – this can be specified under Innovation Typology.</li>
    <li>If not essential, avoid making reference to specific countries or regions (this is captured through geotagging)</li>
    <li>Avoid the use of CGIAR Center, Initiative or organization names in the short title</li>
    </ul>`;
  }

  readiness_of_this_innovation_description() {
    return `<ul>
    <li>In case the innovation readiness level differs across countries or regions, we advise to assign the highest current innovation readiness level that can be supported by the evidence provided.</li>
    <li>Be realistic in assessing the readiness level of the innovation and keep in mind that the claimed readiness level needs to be supported by evidence documentation.</li>
    <li>The innovation readiness level will be quality assessed.</li>
    <li><strong>YOUR READINESS LEVEL IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">INNOVATION READINESS CALCULATOR</a></strong></li>
    </ul>`;
  }

  hasReadinessLevelDiminished() {
    const currentLevel = this.innovationControlListSE?.readinessLevelsList.find(
      irl => irl.id === this.innovationDevInfoBody?.innovation_readiness_level_id
    );
    const oldLevel = this.innovationControlListSE?.readinessLevelsList.find(irl => irl.id === this.innovationDevInfoBody?.previous_irl);

    return Number(currentLevel?.level) < Number(oldLevel?.level);
  }

  alertDiminishedReadinessLevel() {
    return `It appears that the readiness level has decreased since the previous report. Please provide a justification in the text box below.`;
  }

  // Métodos para manejar evidencias
  addEvidence() {
    this.evidencesBody.evidences.push({ is_sharepoint: false } as any);
  }

  deleteEvidence(index: number) {
    this.evidencesBody.evidences.splice(index, 1);
  }

  getReadinessLevelIndex(): number {
    if (!this.innovationDevInfoBody.innovation_readiness_level_id || !this.innovationControlListSE.readinessLevelsList) {
      return -1;
    }

    const selectedId = this.innovationDevInfoBody.innovation_readiness_level_id;
    const index = this.innovationControlListSE.readinessLevelsList.findIndex(level => level.id === selectedId);
    return index >= 0 ? index : -1;
  }

  /**
   * The catalogue's numeric `level` (0-9) for the currently selected readiness level, or `null`
   * when nothing is selected / the catalogue has not loaded yet.
   *
   * P2-3265 / P2-3359: read the catalogue row's `level` field, never the row `id` (auto-increment,
   * unrelated to the level number) nor its array position. `getReadinessLevelIndex()` above happens
   * to line up with `level` only because CLARISA currently returns the rows pre-sorted 0..9 with no
   * gaps — that is an accident of today's data, not a guarantee.
   */
  private getSelectedReadinessLevelValue(): number | null {
    const selectedId = this.innovationDevInfoBody?.innovation_readiness_level_id;
    if (selectedId === null || selectedId === undefined || !this.innovationControlListSE?.readinessLevelsList) {
      return null;
    }
    const selected = this.innovationControlListSE.readinessLevelsList.find((level: any) => level.id === selectedId);
    if (!selected) {
      return null;
    }
    const levelValue = Number(selected.level);
    return Number.isNaN(levelValue) ? null : levelValue;
  }

  /**
   * P2-3265 (epic P2-3243): whether the "Have any studies been conducted to inform the innovation
   * scaling strategy design..." question (and its follow-up studies-link list) should render.
   *
   * Ticket's own Conditional Logic table: "< 6: Not applicable (question was not shown at these
   * levels)" + "= 6 [confirmed >= 6 by the PO, Ángel Jarrín, Jira P2-3265, 26-Aug-2026 16:14]:
   * Remove — question must no longer appear". The union of both rows covers every level (0-9): the
   * question is dropped entirely for the 2026 phase onward, regardless of the selected readiness
   * level — there is no level at which it should newly appear. (An earlier pass of this gate showed
   * it for levels 1-5, misreading a follow-up paraphrase as reversing the "< 6: not applicable" row;
   * corrected 26-Aug-2026 after re-reading the ticket's literal table against this same file's
   * pre-existing `>= 6` condition, which the table's "< 6" row was describing all along.)
   *
   * Phases up to and including 2025 must keep rendering exactly as before this change (Ángel Jarrín,
   * Jira P2-3243 epic note, 23-Aug-2026): visible only from level 6 up. Gated on the reporting PHASE
   * YEAR via `isInnovationDevFormReduced2026()` (already 2026-thresholded for this same epic), never
   * on `isP25()`/portfolio — prtest holds 2025-phase results inside the P25 portfolio.
   */
  showScalingStudiesQuestion(): boolean {
    if (this.fieldsManagerSE.isInnovationDevFormReduced2026()) {
      return false;
    }
    const levelValue = this.getSelectedReadinessLevelValue();
    if (levelValue === null) {
      return false;
    }
    return levelValue >= 6;
  }
}
