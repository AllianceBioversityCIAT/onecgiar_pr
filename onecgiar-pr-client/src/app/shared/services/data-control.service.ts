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
  /** Cuántos campos obligatorios tiene la sección abierta — el denominador de su progreso. */
  readonly mandatoryFieldsTotal = signal<number>(0);
  showShareRequest = false;
  chagePhaseModal = false;
  updateResultModal = false;
  changeResultTypeModal = false;
  isProductionSignal = signal(environment.production);
  inNotifications = false;
  currentNotification = null;
  currentResultSectionName = signal('');
  /**
   * P2-3262: HTML guidance published by the open section so the result-detail shell can render a
   * single ⓘ trigger next to the section heading ("4 Evidence ⓘ"). Empty string = no trigger, which
   * is every section that has not opted in, so the heading is unchanged for all of them.
   *
   * The publisher owns the reset: a section that sets it MUST clear it on destroy, or its guidance
   * leaks into the next section's heading.
   */
  readonly currentResultSectionGuidance = signal<string>('');
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
   * Hides the entire top header chrome (logo, actions, user menu). Turned on by surfaces
   * where the Spartan sidebar carries ALL navigation + actions, reset on destroy.
   */
  readonly hideHeaderChrome = signal(false);
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

  /**
   * Collects the elements matching `selector` inside EVERY container matching `container`, deduplicated.
   *
   * 🛑 P2-3552: this used to be `document.querySelector(container)` — singular. `.section_container` is a
   * GLOBAL class (`result-detail.component.scss:74` says so), and on the result-detail route between two and
   * four elements carry it, in this document order:
   *   1. the global announcement banner (`results-outlet.component.html:5`), which holds one `app-alert-status`
   *      and therefore ZERO mandatory fields — rendered only when `globalVariablesSE.get.alert_global_info`;
   *   2. the wrapper around the `<router-outlet>` (`results-outlet.component.html:7-10`), i.e. the whole screen;
   *   3. `result-detail.component.html:22`;
   *   4. `multiple-wps.component.html:5`, when the ToC tabs render.
   * `querySelector` returns the FIRST, so whenever that banner is up the scan looked inside it, found nothing,
   * and reported "0 fields missing" for the entire form — an empty alert panel on a form full of empty
   * mandatory fields. Containers 2-4 nest, so the union has to be deduplicated by element or a field inside
   * the ToC tabs would be counted (and listed) up to three times.
   */
  private mandatoryFieldsIn(container: string, selector: string): HTMLElement[] {
    const found = new Set<HTMLElement>();
    document.querySelectorAll(container).forEach(host => host.querySelectorAll(selector).forEach(el => found.add(el as HTMLElement)));
    return [...found];
  }

  someMandatoryFieldIncompleteResultDetail(container) {
    if (!document.querySelector(container)) {
      if (this.fieldFeedbackList().length) this.fieldFeedbackList.set([]);
      return true;
    }
    const feedback: string[] = [];
    let incompleteInputs = 0;
    let incompleteSelects = 0;
    let mandatoryTotal = 0;
    try {
      const mandatoryInputs = this.mandatoryFieldsIn(container, '.pr-input.mandatory .input-validation');
      const mandatorySelects = this.mandatoryFieldsIn(container, '.pr-field.mandatory');
      mandatoryTotal = mandatoryInputs.length + mandatorySelects.length;

      incompleteInputs = this.mandatoryFieldsIn(container, '.pr-input.mandatory .input-validation')
        .filter((field: HTMLElement) => {
          const isEmpty = !field?.innerText;
          const label = this.mandatoryFieldLabel(field);

          if (label && isEmpty) {
            feedback.push(label);
            this.tagFeedbackTarget(field, label);
          }

          return isEmpty;
        }).length;

      incompleteSelects = this.mandatoryFieldsIn(container, '.pr-field.mandatory')
        .filter((field: HTMLElement) => {
          const isIncomplete = !field.classList.contains('complete');
          const label = this.mandatoryFieldLabel(field);

          if (label && isIncomplete) {
            feedback.push(label);
            this.tagFeedbackTarget(field, label);
          }

          return isIncomplete;
        }).length;
    } catch (error) {
      console.error(error);
    }
    // Update the signal only when the list actually changed: avoids needless
    // notifications/renders and lets callers compare by reference to know if it changed.
    if (!this.sameFeedback(this.fieldFeedbackList(), feedback)) {
      this.fieldFeedbackList.set(feedback);
    }
    // El TOTAL de obligatorios de la sección, no solo los que faltan. `fieldFeedbackList` responde
    // "¿qué falta?" y con eso solo se puede escribir "6 fields missing" — un número sin escala, que
    // no dice si son 6 de 7 o 6 de 30. El progreso de la sección necesita el denominador.
    if (this.mandatoryFieldsTotal() !== mandatoryTotal) {
      this.mandatoryFieldsTotal.set(mandatoryTotal);
    }
    // Counts, not the arrays: `Boolean([])` is `true`, so the previous version answered
    // "something is incomplete" on every call, even with every field filled in.
    return incompleteInputs > 0 || incompleteSelects > 0;
  }

  /**
   * Field hosts that own a label. Used to find the label of a mandatory field by walking UP
   * to its component, instead of assuming a fixed DOM depth.
   */
  private static readonly LABELLED_FIELD_HOSTS = [
    'app-pr-input',
    'app-pr-textarea',
    'app-pr-select',
    'app-pr-multi-select',
    'app-pr-checkbox',
    'app-pr-radio-button',
    'app-pr-yes-or-not',
    'app-pr-range-level',
    'app-field-card'
  ].join(',');

  /**
   * Human label of a mandatory field, for the "X alerts / <name> is missing" list.
   *
   * The old code hard-coded the hop count (`parentElement` ×3 for inputs, ×1 for selects) and
   * queried `.pr_label`. Wrapping fields in `app-field-card` added a level and moved the label
   * to `.fch_title`, so the lookup silently returned undefined and the field was dropped from
   * the list — the user saw "0 alerts" while a required field sat empty. Walk up through the
   * field hosts instead and accept either label element.
   */
  /**
   * Key a missing field by its own label, so "Go" in the bottom bar's list can find it again.
   *
   * Written on the WHOLE field (its labelled host when it has one), not on the inner validation
   * node: scrolling to a bare `.input-validation` would land on a 1px helper with the label
   * already off-screen above it.
   */
  static feedbackKey(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** A target taller than this is a section, not a field — highlighting it says nothing. */
  private static readonly MAX_TARGET_HEIGHT = 420;

  /**
   * Hosts to RING, which is a wider set than the hosts that carry a LABEL.
   * `app-lead-contact-person-field` declares its requiredness through `appFeedbackValidation`, a
   * hidden 0×0 div with no labelled host above it — so without naming it here the climb ran past
   * every wrapper up to `.detail_container` and the field got no "Go" at all.
   */
  private static readonly HIGHLIGHT_HOSTS = `${DataControlService.LABELLED_FIELD_HOSTS},app-lead-contact-person-field`;

  private tagFeedbackTarget(field: Element, label: string): void {
    const host = field.closest(DataControlService.HIGHLIGHT_HOSTS) as HTMLElement | null;
    const target = (host && this.highlightTarget(host)) ?? this.targetByLabelText(label);
    if (target) target.dataset['prFeedback'] = DataControlService.feedbackKey(label);
  }

  /**
   * Last resort: find the field through the LABEL the user can see.
   *
   * An `appFeedbackValidation` marker is a 0×0 div declared at the END of a section's template —
   * measured, its parent chain goes straight to `.detail_container`, so it shares no ancestor
   * with the control it speaks for and climbing can never reach it. The rendered label is the
   * only link between the two, and it is the very string the list is already showing.
   */
  private targetByLabelText(label: string): HTMLElement | null {
    const labels = document.querySelectorAll<HTMLElement>('.section_container .pr_label, .section_container .fch_title');
    for (const node of Array.from(labels)) {
      const text = (node.innerText ?? node.textContent ?? '').trim();
      if (text !== label) continue;
      const host = node.closest(DataControlService.HIGHLIGHT_HOSTS) as HTMLElement | null;
      const target = host ? this.highlightTarget(host) : this.highlightTarget(node);
      if (target) return target;
    }
    return null;
  }

  /**
   * The element "Go" should scroll to and ring.
   *
   * `appFeedbackValidation` fields (Lead contact person among them) are declared as a HIDDEN 0×0
   * div, so the field itself has nothing to highlight. Walking up to the first ancestor with a
   * box overshot in the other direction — it landed on `.detail_container` and ringed the whole
   * section. So: climb only until something is both VISIBLE and small enough to still read as
   * one field, and give up rather than point at a section.
   */
  private highlightTarget(el: HTMLElement): HTMLElement | null {
    let node: HTMLElement | null = el;
    for (let hops = 0; node && hops < 5; hops++) {
      const wide = node.offsetWidth > 0;
      const tall = node.offsetHeight > 0;
      if (wide && tall) {
        return node.offsetHeight <= DataControlService.MAX_TARGET_HEIGHT ? node : null;
      }
      node = node.parentElement;
    }
    return null;
  }

  private mandatoryFieldLabel(field: Element): string {
    // 1. Nearest field component that carries a label, widening outwards. This is the precise
    //    path and it is what makes an `app-field-card` wrapper work.
    let host: Element | null = field.closest(DataControlService.LABELLED_FIELD_HOSTS);
    while (host) {
      const text = this.labelTextIn(host);
      if (text) return text;
      host = host.parentElement?.closest(DataControlService.LABELLED_FIELD_HOSTS) ?? null;
    }

    // 2. No field component in the chain — `appFeedbackValidation` builds the label as a plain
    //    SIBLING of the `.pr-field.mandatory` div inside an ordinary page element. Walk up a
    //    bounded number of ancestors so a far-away label can never be mis-attributed.
    let node: Element | null = field.parentElement;
    for (let hops = 0; node && hops < 4; hops++) {
      const text = this.labelTextIn(node);
      if (text) return text;
      node = node.parentElement;
    }

    return '';
  }

  private labelTextIn(scope: Element): string {
    const label = scope.querySelector('.pr_label, .fch_title');
    if (!label) return '';
    // `innerText` respects rendered text but is not implemented in jsdom; `textContent`
    // is the correct fallback rather than crashing the whole scan.
    const raw = (label as HTMLElement).innerText ?? label.textContent ?? '';
    return raw.trim();
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
