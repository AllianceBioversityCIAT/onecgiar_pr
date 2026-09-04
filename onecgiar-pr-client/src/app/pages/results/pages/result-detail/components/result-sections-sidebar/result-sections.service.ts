import { Injectable, computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { PrRoute, resultDetailRouting } from '../../../../../../shared/routing/routing-data';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { GreenChecksService } from '../../../../../../shared/services/global/green-checks.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { AiReviewService } from '../../../../../../shared/services/api/ai-review.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { SubmissionModalService } from '../submission-modal/submission-modal.service';
import { UnsubmitModalService } from '../unsubmit-modal/unsubmit-modal.service';

export type RdSection = PrRoute & { validation?: number };

/** Tooltip shown on the disabled Submit / AI review buttons. Same copy the old panel-menu used. */
export const SECTIONS_INCOMPLETE_TOOLTIP = 'This button will become available once all sections are completed.';

/**
 * Sections of the open result, their completion progress, and the result-level actions
 * (AI review / Submit / Unsubmit) with their gating.
 *
 * Extracted from `reporting-nav-sidebar` when the sections moved out of the dark nav tree and
 * back into a dedicated white sidebar (`result-sections-sidebar`), so the filtering and the
 * role/status gating live in ONE place instead of being mirrored per host. The gating rules
 * themselves are unchanged — they still mirror what `panel-menu.component.html` shipped.
 */
@Injectable({ providedIn: 'root' })
export class ResultSectionsService {
  private readonly dataControlSE = inject(DataControlService);
  private readonly fieldsManagerSE = inject(FieldsManagerService);
  private readonly greenChecksSE = inject(GreenChecksService);
  private readonly rolesSE = inject(RolesService);
  private readonly aiReviewSE = inject(AiReviewService);
  private readonly api = inject(ApiService);
  private readonly submissionModalSE = inject(SubmissionModalService);
  private readonly unsubmitModalSE = inject(UnsubmitModalService);
  private readonly router = inject(Router);

  /** True until the portfolio resolves — the sidebar renders its skeleton meanwhile. */
  readonly isLoading = computed(() => !this.fieldsManagerSE.portfolioAcronym());

  /**
   * Sections filtered by portfolio (P22/P25) and result type, with the green-check state attached.
   *
   * Unlike the previous implementation this does NOT write `validation` back onto the shared
   * `resultDetailRouting` objects: that mutation leaked one result's checks into the next result
   * opened in the same session. Copies are returned instead.
   */
  readonly sections = computed<RdSection[]>(() => {
    this.dataControlSE.currentResultSignal(); // react to result load
    this.dataControlSE.greenChecksString(); // react to green-check changes
    const portfolio = this.fieldsManagerSE.portfolioAcronym();
    if (!portfolio) return [];

    const typeId = this.dataControlSE.currentResult?.result_type_id;
    const validationBySection = new Map<string, number>();
    (this.dataControlSE.green_checks ?? []).forEach((gc: { section_name?: string; validation?: number | string }) => {
      if (gc.section_name) validationBySection.set(gc.section_name, Number(gc.validation));
    });

    return (resultDetailRouting as RdSection[])
      .filter(o => {
        if (o.path === '**') return false;
        if (this.fieldsManagerSE.isP25() && o.portfolioAcronym === 'P22') return false;
        if (this.fieldsManagerSE.isP22() && o.portfolioAcronym === 'P25') return false;
        if (!Object.prototype.hasOwnProperty.call(o, 'prHide')) return true;
        return o.prHide == typeId;
      })
      .map(o => ({ ...o, validation: validationBySection.get(o.path ?? '') ?? o.validation }));
  });

  /**
   * Sections that count towards progress. `underConstruction` ones never get a green check, so
   * including them would pin the bar below 100% on results that are in fact complete.
   */
  private readonly countableSections = computed(() => this.sections().filter(s => s.underConstruction !== true));

  readonly totalCount = computed(() => this.countableSections().length);
  readonly doneCount = computed(() => this.countableSections().filter(s => !!s.validation).length);

  readonly progressWidth = computed(() => {
    const total = this.totalCount();
    return total ? `${Math.round((this.doneCount() / total) * 100)}%` : '0%';
  });

  readonly progressLabel = computed(() => `${this.doneCount()} of ${this.totalCount()} sections complete`);

  /**
   * Identity pinned at the top of the sections rail so the code and type stay visible while the
   * header identity strip scrolls away. Same fields the header used to show inline.
   */
  readonly resultCode = computed(() => {
    this.dataControlSE.currentResultSignal();
    const fromResult = this.dataControlSE.currentResult?.result_code;
    const code = fromResult != null && `${fromResult}`.trim() !== '' ? fromResult : this.api.resultsSE?.currentResultCode;
    return code != null && `${code}`.trim() !== '' ? String(code) : '';
  });

  readonly resultTypeName = computed(() => {
    this.dataControlSE.currentResultSignal();
    return this.dataControlSE.currentResult?.result_type_name ?? '';
  });

  /** Router link for a section (needs the open result's code). */
  sectionLink(section: RdSection): string {
    return `/result/result-detail/${this.dataControlSE.currentResult?.result_code}/${section.path}`;
  }

  sectionQueryParams(): { phase?: number | string } {
    const version = this.dataControlSE.currentResult?.version_id;
    return version != null ? { phase: version } : {};
  }

  // --- Which section is open. Lives here, not in a host, because BOTH the card heading and the
  // bottom bar need the same number: two independent counters would drift the moment the section
  // list is filtered differently (portfolio, result type). ---

  /** Last path segment of the current URL, without the query string. */
  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.pathFromUrl())
    ),
    { initialValue: this.pathFromUrl() }
  );

  /** Index of the open section, or -1 when the route is not one of the listed sections. */
  readonly currentIndex = computed(() => {
    const path = this.currentPath();
    return this.sections().findIndex(s => s.path === path);
  });

  /**
   * Cuántas secciones se pueden recorrer. Distinto de `totalCount`, que excluye las
   * under-construction porque nunca reciben green check: para "Section N of M" sí cuentan,
   * porque el usuario puede navegar a ellas.
   */
  readonly navigableCount = computed(() => this.sections().length);
  /** 1-based, for display. 0 when the route is not a listed section. */
  readonly currentPosition = computed(() => this.currentIndex() + 1);
  readonly currentSection = computed<RdSection | null>(() => this.sections()[this.currentIndex()] ?? null);
  readonly currentSectionName = computed(() => this.currentSection()?.prName ?? '');
  readonly currentSectionIsDone = computed(() => !!this.currentSection()?.validation);
  /** False on a route outside the list (result creator sub-routes, unknown paths). */
  readonly hasCurrentSection = computed(() => this.currentIndex() >= 0 && this.navigableCount() > 0);

  private pathFromUrl(): string {
    return this.router.url.split('?')[0].split('/').filter(Boolean).pop() ?? '';
  }

  // --- Result-level actions. Gating mirrors the previous panel-menu / nav-sidebar rules. ---
  /**
   * ⚠️ P2-3558 — the AI review is a WRITE action and used to ignore the write lock.
   *
   * Applying a proposal rewrites `title` / `description` / the innovation `short_title`
   * (`onecgiar-pr-server/src/api/ai/ai.service.ts` `saveChanges`), and validating an impact area
   * rewrites the DAC tag plus its `result_impact_area_score` rows (same file, `updateDacScore`).
   * `RolesService.readOnly` is the canonical write lock in this app: it HIDES the whole save bar
   * (`custom-fields/save-button/save-button.component.html:1` and `:27`) and this screen's bottom
   * bar (`components/section-bottom-bar/section-bottom-bar.component.ts:118`). Without it here, a
   * viewer who cannot type a single character into the form was still handed a button that rewrites
   * it for them. Every one of these lock states coexists with `status_id == 1`:
   *  - **CLOSED PHASE** — `current-result.service.ts:37-41`: `is_phase_open === 0` sets
   *    `readOnly = !isAdmin`.
   *  - **NOT A MEMBER** of the result's initiative — `roles.service.ts:129-131`.
   *  - **DISCONTINUED** result outside types 7 / 2 — `current-result.service.ts:48-51`.
   *  - **AVISA initiative** — `current-result.service.ts:56-63`.
   *  - **Platform closed**, or roles that failed to resolve — `roles.service.ts:92-93` and `:114-115`.
   *
   * 🛑 This is deliberately NOT a `phase_year` gate, and no such gate belongs here: the AI review
   * backend is phase-agnostic. `src/api/ai/**` holds zero phase / version / portfolio branches and
   * keys every read and write on `result_id` (the per-phase row) or `session_id`; its one
   * phase-aware dependency, `results.service.ts` `getTocMetadata(..., phaseYear)`, takes the year
   * from the viewed result's own version. So the feature works in EVERY phase, and what closes an
   * old phase to it is `is_phase_open` above — not the year.
   *
   * Hidden rather than greyed, to match the save bar. `readOnly` is signal-backed
   * (`roles.service.ts:22`, `:53-59`), so the async role resolution repaints this getter by itself;
   * it also defaults to `true`, which fails to the safe side while permissions are unknown.
   */
  get showAiReview(): boolean {
    const r = this.dataControlSE.currentResult;
    return !!(r && r.result_type_id != 6 && r.status_id == 1) && !this.rolesSE.readOnly;
  }

  /** Second line of defence for `runAiReview()`, so the TS guard holds even if the button renders. */
  get aiReviewDisabled(): boolean {
    const r = this.dataControlSE.currentResult;
    return (
      this.rolesSE.readOnly || !this.greenChecksSE.submit || !!(r?.inQA && this.api.globalVariablesSE.get?.in_qa && r?.status_id == 1)
    );
  }

  get aiReviewLabel(): string {
    if (this.aiReviewSE.aiReviewButtonState === 'loading') return 'Loading...';
    if (this.aiReviewSE.aiReviewButtonState === 'completed') return 'Ready!';
    return 'AI review';
  }

  /**
   * Role/membership gate the legacy `panel-menu.component.html` (lines 65-69) wrapped around BOTH
   * Submit and Unsubmit: a plain `Member` of the result's initiative — or anyone who does not
   * belong to it at all — cannot submit nor un-submit; a platform admin always can.
   *
   * ⚠️ P2-3434: the revamp kept this on Submit but dropped it on Unsubmit, regressing P2-328.
   * It lives here, once, so the two buttons can never drift apart again.
   */
  private get canChangeSubmission(): boolean {
    const list = this.dataControlSE.myInitiativesList ?? [];
    return this.validateMember(list) !== 6 || this.rolesSE.isAdmin;
  }

  /** True while the result is locked by a running QA process. Drives both the lock and its notice. */
  private get lockedByQa(): boolean {
    return !!(this.dataControlSE.currentResult?.inQA && this.api.globalVariablesSE.get?.in_qa);
  }

  get showSubmit(): boolean {
    return this.dataControlSE.currentResult?.status_id == 1 && this.canChangeSubmission;
  }

  get submitDisabled(): boolean {
    return !this.greenChecksSE.submit || this.lockedByQa;
  }

  get showUnsubmit(): boolean {
    return this.dataControlSE.currentResult?.status_id == 3 && this.canChangeSubmission;
  }

  /**
   * ⚠️ P2-3434 / P2-383: a result inside a QA process cannot be un-submitted, and the client is
   * the ONLY place that enforces it — `submissions.service.ts` never looks at `inQA`.
   */
  get unsubmitDisabled(): boolean {
    return this.lockedByQa;
  }

  /** Only the "sections still missing" case gets a tooltip — the QA lock has its own notice below. */
  get incompleteTooltip(): string {
    return this.dataControlSE.currentResult?.status_id == 1 && !this.greenChecksSE.submit ? SECTIONS_INCOMPLETE_TOOLTIP : '';
  }

  /** Quality Assessed results cannot be un-submitted. */
  get showQaAssessedNotice(): boolean {
    return this.dataControlSE.currentResult?.status_id == 2;
  }

  get showInQaNotice(): boolean {
    return this.lockedByQa;
  }

  runAiReview(): void {
    if (!this.aiReviewDisabled) this.aiReviewSE.onAIReviewClick();
  }

  openSubmit(): void {
    if (!this.submitDisabled) this.submissionModalSE.showModal = true;
  }

  openUnsubmit(): void {
    if (!this.unsubmitDisabled) this.unsubmitModalSE.showModal = true;
  }

  private validateMember(myInitiativesList: any[]): number {
    const found = myInitiativesList.find(init => init?.initiative_id == this.dataControlSE?.currentResult?.initiative_id);
    if (!found) return 6;
    return found?.role === 'Member' ? 6 : 1;
  }
}
