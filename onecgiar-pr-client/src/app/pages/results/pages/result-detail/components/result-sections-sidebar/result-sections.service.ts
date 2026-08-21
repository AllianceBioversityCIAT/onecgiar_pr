import { Injectable, computed, inject } from '@angular/core';
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

  /** Router link for a section (needs the open result's code). */
  sectionLink(section: RdSection): string {
    return `/result/result-detail/${this.dataControlSE.currentResult?.result_code}/${section.path}`;
  }

  sectionQueryParams(): { phase?: number | string } {
    const version = this.dataControlSE.currentResult?.version_id;
    return version != null ? { phase: version } : {};
  }

  // --- Result-level actions. Gating mirrors the previous panel-menu / nav-sidebar rules. ---
  get showAiReview(): boolean {
    const r = this.dataControlSE.currentResult;
    return !!(r && r.result_type_id != 6 && r.status_id == 1);
  }

  get aiReviewDisabled(): boolean {
    const r = this.dataControlSE.currentResult;
    return !this.greenChecksSE.submit || !!(r?.inQA && this.api.globalVariablesSE.get?.in_qa && r?.status_id == 1);
  }

  get aiReviewLabel(): string {
    if (this.aiReviewSE.aiReviewButtonState === 'loading') return 'Loading...';
    if (this.aiReviewSE.aiReviewButtonState === 'completed') return 'Ready!';
    return 'AI review';
  }

  get showSubmit(): boolean {
    const list = this.dataControlSE.myInitiativesList ?? [];
    return this.dataControlSE.currentResult?.status_id == 1 && (this.validateMember(list) !== 6 || this.rolesSE.isAdmin);
  }

  get submitDisabled(): boolean {
    const r = this.dataControlSE.currentResult;
    return !this.greenChecksSE.submit || !!(r?.inQA && this.api.globalVariablesSE.get?.in_qa);
  }

  get showUnsubmit(): boolean {
    return this.dataControlSE.currentResult?.status_id == 3;
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
    return !!(this.dataControlSE.currentResult?.inQA && this.api.globalVariablesSE.get?.in_qa);
  }

  runAiReview(): void {
    if (!this.aiReviewDisabled) this.aiReviewSE.onAIReviewClick();
  }

  openSubmit(): void {
    if (!this.submitDisabled) this.submissionModalSE.showModal = true;
  }

  openUnsubmit(): void {
    this.unsubmitModalSE.showModal = true;
  }

  private validateMember(myInitiativesList: any[]): number {
    const found = myInitiativesList.find(init => init?.initiative_id == this.dataControlSE?.currentResult?.initiative_id);
    if (!found) return 6;
    return found?.role === 'Member' ? 6 : 1;
  }
}
