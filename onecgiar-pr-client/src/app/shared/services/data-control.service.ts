import { Injectable, WritableSignal, computed, signal } from '@angular/core';
import { ResultItem } from '../interfaces/result.interface';
import { environment } from '../../../environments/environment';
import { Title } from '@angular/platform-browser';
import { CurrentResult } from '../interfaces/current-result.interface';
import { ModuleTypeEnum, StatusPhaseEnum } from '../enum/api.enum';
import { ResultsApiService } from './api/results-api.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DataControlService {
  showPartnersRequest: boolean = false;
  showRetrieveRequest: boolean = false;
  myInitiativesList = [];
  myInitiativesListReportingByPortfolio = [];
  myInitiativesListIPSRByPortfolio = [];
  myInitiativesLoaded = false;
  resultsList: ResultItem[] = [];
  resultsListSignal: WritableSignal<ResultItem[]> = signal([]);
  /** Set when the results list API returns 404 (e.g. no rows for current filters); cleared on successful load */
  resultsListNoDataMessage = signal<string | null>(null);
  currentResult: CurrentResult = {};
  currentResultSignal: WritableSignal<CurrentResult> = signal({});
  showSectionSpinner = false;
  currentSectionName = '';
  /**
   * Mandatory-field feedback labels for the "X alerts" box (save-button).
   * Signal so the box re-renders reactively when the scan output changes,
   * instead of being recomputed on every change-detection cycle. (P2-2967/P2-2969)
   */
  readonly fieldFeedbackList = signal<string[]>([]);
  showShareRequest = false;
  chagePhaseModal = false;
  updateResultModal = false;
  changeResultTypeModal = false;
  isProductionSignal = signal(environment.production);
  inNotifications = false;
  currentNotification = null;
  currentResultSectionName = signal('');
  /**
   * Focus mode: a surface has asked the shell to shed its chrome and give the page
   * the whole viewport — the header/navigation bar is not rendered at all. Used by
   * the AOW detail view and the guided creation flow, both of which provide their
   * own way back. Surfaces that set it MUST reset it on destroy, or the user is
   * left with no navigation.
   */
  readonly focusMode = signal(false);
  /**
   * Lighter than focusMode: the navigation bar stays, but its wordmark and phase
   * chip are hidden because the surface already states where the user is (the
   * reporting dashboard's sidebar carries both). Reset on destroy.
   */
  readonly hideWordmark = signal(false);
  /**
   * Slim navigation: the bar stays, but only the reporting entries are listed.
   * The reporting dashboard already carries its own wayfinding (rail, sidebar,
   * breadcrumbs), so the full menu on top of it is noise. Reset on destroy.
   */
  readonly slimNav = signal(false);
  /** Paths kept while slimNav is on. */
  readonly SLIM_NAV_PATHS = ['result-framework-reporting', 'result'];
  /**
   * Hides the horizontal primary nav pill in the header. Turned on by surfaces that
   * host their own navigation (e.g. Results Center's Spartan sidebar), reset on destroy.
   */
  readonly hideMainNav = signal(false);
  /**
   * Backend section-completeness indicator. Signal-backed (transparent getter/setter
   * keeps existing call sites working) so `greenChecksString` can be a memoized
   * `computed` instead of a per-CD `JSON.stringify` in panel-menu. (P2-2967/P2-2970)
   */
  private readonly _greenChecks = signal<any>(null);
  get green_checks() {
    return this._greenChecks();
  }
  set green_checks(value: any) {
    this._greenChecks.set(value);
  }
  /** Memoized JSON snapshot of green_checks; recomputes only when green_checks changes. */
  readonly greenChecksString = computed(() => JSON.stringify(this._greenChecks()));
  show_qa_full_screen = false;
  showResultHistoryOfChangesModal = false;
  resultPhaseList = [];
  showMassivePhaseShiftModal = false;
  massivePhaseShiftIsRunning = false;
  tocUrl = environment?.tocUrl;
  reportingCurrentPhase = { phaseName: null, phaseYear: null, phaseId: null, portfolioAcronym: null, portfolioId: null };
  reportingStatusVersion = signal(0);
  // Bumped when getCurrentPhases() refreshes reportingCurrentPhase (plain object):
  // zoneless templates derive computeds from this to re-render the phase label.
  reportingPhaseVersion = signal(0);

  notifyReportingStatusChanged(): void {
    this.reportingStatusVersion.update(v => v + 1);
  }
  previousReportingPhase = { phaseName: null, phaseYear: null, phaseId: null };
  IPSRCurrentPhase = { phaseName: null, phaseYear: null, phaseId: null, portfolioAcronym: null };
  previousIPSRPhase = { phaseName: null, phaseYear: null };

  constructor(
    private readonly titleService: Title,
    public resultsSE: ResultsApiService
  ) {}

  getCurrentPhases(): Observable<any> {
    return this.resultsSE.GET_versioning(StatusPhaseEnum.OPEN, ModuleTypeEnum.REPORTING).pipe(
      tap(({ response }) => {
        this.reportingCurrentPhase.phaseYear = response[0]?.phase_year;
        this.reportingCurrentPhase.phaseName = response[0]?.phase_name;
        this.reportingCurrentPhase.phaseId = response[0]?.id;
        this.reportingCurrentPhase.portfolioAcronym = response[0]?.obj_portfolio?.acronym;
        this.reportingCurrentPhase.portfolioId = response[0]?.portfolio_id;

        // reportingCurrentPhase is a plain (non-signal) object: bump the dedicated
        // version signal so zoneless templates re-render once phases load
        // (NOT reportingStatusVersion — that one drives reporting-access effects)
        this.reportingPhaseVersion.update(v => v + 1);

        if (response[0]?.obj_previous_phase) {
          this.previousReportingPhase.phaseYear = response[0]?.obj_previous_phase.phase_year;
          this.previousReportingPhase.phaseName = response[0]?.obj_previous_phase.phase_name;
          this.previousReportingPhase.phaseId = response[0]?.obj_previous_phase.id;
        } else {
          this.previousReportingPhase.phaseYear = null;
          this.previousReportingPhase.phaseName = null;
          this.previousReportingPhase.phaseId = null;
        }
      })
    );
  }

  getCurrentIPSRPhase(): Observable<any> {
    return this.resultsSE.GET_versioning(StatusPhaseEnum.OPEN, ModuleTypeEnum.IPSR).pipe(
      tap(({ response }) => {
        this.IPSRCurrentPhase.phaseYear = response[0]?.phase_year;
        this.IPSRCurrentPhase.phaseName = response[0]?.phase_name;
        this.IPSRCurrentPhase.phaseId = response[0]?.id;
        this.IPSRCurrentPhase.portfolioAcronym = response[0]?.obj_portfolio?.acronym;

        if (response[0]?.obj_previous_phase) {
          this.previousIPSRPhase.phaseYear = response[0]?.obj_previous_phase.phase_year;
          this.previousIPSRPhase.phaseName = response[0]?.obj_previous_phase.phase_name;
        } else {
          this.previousIPSRPhase.phaseYear = null;
          this.previousIPSRPhase.phaseName = null;
        }
      })
    );
  }

  validateBody(body: any) {
    return Object.entries(body).every((item: any) => item[1]);
  }

  myInitiativesListText(initiatives: Array<{ official_code: string }> = []): string {
    if (!Array.isArray(initiatives) || initiatives.length === 0) return '';
    return initiatives
      .filter(item => !!item?.official_code)
      .map(item => item.official_code)
      .join(', ');
  }

  findClassTenSeconds(className) {
    let seconds = 0;
    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        seconds++;
        if (document.querySelector(`.${className}`)) {
          resolve(document.querySelector(`.${className}`));
          clearInterval(timer);
        }
        if (seconds == 10) {
          clearInterval(timer);
          resolve(false);
        }
      }, 1000);
    });
  }

  getLastWord(text) {
    if (!text) return '';
    const lastWord = text?.split(' ')[text?.split(' ').length - 1];
    return lastWord[0].toUpperCase() + lastWord.substring(1);
  }

  get isKnowledgeProduct() {
    return this.currentResult?.result_type_id == 6;
  }

  isKnowledgeProductSignal = computed(() => this.currentResultSignal()?.result_type_id == 6);

  get isInnoDev() {
    return this.currentResult?.result_type_id == 7;
  }

  get isInnoUse() {
    return this.currentResult?.result_type_id == 2;
  }

  someMandatoryFieldIncomplete(container) {
    const htmlContainer = document.querySelector(container);
    if (!htmlContainer) return true;
    let inputs;
    let selects;
    try {
      inputs = Array.prototype.slice.call(htmlContainer.querySelectorAll('.pr-input.mandatory input')).some(field => !field.value);
      selects = Array.prototype.slice
        .call(htmlContainer.querySelectorAll('.pr-select.mandatory'))
        .some((field: HTMLElement) => !field.classList.contains('complete'));
    } catch (error) {
      console.error(error);
    }
    return inputs || selects;
  }

  someMandatoryFieldIncompleteResultDetail(container) {
    const htmlContainer = document.querySelector(container);
    if (!htmlContainer) {
      if (this.fieldFeedbackList().length) this.fieldFeedbackList.set([]);
      return true;
    }
    const feedback: string[] = [];
    let inputs;
    let selects;
    try {
      inputs = Array.prototype.slice.call(htmlContainer.querySelectorAll('.pr-input.mandatory .input-validation')).filter(field => {
        const tagValue = field?.parentElement?.parentElement?.parentElement?.querySelector('.pr_label')?.innerText;
        const isEmpty = !field?.innerText;

        if (tagValue && isEmpty) feedback.push(tagValue);

        return isEmpty;
      });
      selects = Array.prototype.slice.call(htmlContainer.querySelectorAll('.pr-field.mandatory')).filter((field: HTMLElement) => {
        let tagValue: any = field?.parentElement?.querySelector('.pr_label');
        tagValue = tagValue?.innerText;
        const isIncomplete = !field.classList.contains('complete');

        if (tagValue && isIncomplete) feedback.push(tagValue);
        return isIncomplete;
      });
    } catch (error) {
      console.error(error);
    }
    // Update the signal only when the list actually changed: avoids needless
    // notifications/renders and lets callers compare by reference to know if it changed.
    if (!this.sameFeedback(this.fieldFeedbackList(), feedback)) {
      this.fieldFeedbackList.set(feedback);
    }
    return Boolean(inputs) || Boolean(selects);
  }

  private sameFeedback(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  detailSectionTitle(sectionName, title?) {
    this.titleService.setTitle(title || sectionName);
    this.currentSectionName = title || sectionName;
  }
}
