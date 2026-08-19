import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, effect, inject, computed, untracked, signal, HostListener } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CurrentResult } from '../../../../../../shared/interfaces/current-result.interface';
import { ResultsListService } from './services/results-list.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { PrTableComponent } from '../../../../../../shared/components/pr-table';
import { ResultsNotificationsService } from '../results-notifications/results-notifications.service';
import { ResultsListFilterService } from './services/results-list-filter.service';
import { Router } from '@angular/router';
import {
  BilateralResultsService,
  REVIEW_RESULT_ID_QUERY_PARAM,
  REVIEW_RESULT_QUERY_PARAM
} from '../../../../../result-framework-reporting/pages/bilateral-results/bilateral-results.service';
import { ResultsListFiltersComponent } from './components/results-list-filters/results-list-filters.component';

interface ResultRoute {
  commands: unknown[];
  queryParams: Record<string, unknown>;
}

interface ItemMenu {
  label: string;
  icon: string;
  visible?: boolean;
  command: () => void;
  tooltipText?: string;
  tooltipShow?: boolean;
  disabled?: boolean;
  inlineStyle?: string;
}

/** Column catalog — matches CURRENT RC_COLUMNS (PRMS-Shell.dc.html). */
export interface RcColumnDef {
  key: string;
  title: string;
  attr: string;
  width: string;
  /** Default visibility when no localStorage preference exists. */
  defaultOn: boolean;
  class?: string;
}

const RC_COLUMN_STORAGE_KEY = 'pr.resultsCenter.visibleColumns';

/** Full CURRENT column set (order = picker + table order). */
export const RC_COLUMNS: readonly RcColumnDef[] = [
  { key: 'code', title: 'Code', attr: 'result_code', width: '88px', defaultOn: true },
  { key: 'title', title: 'Title', attr: 'title', width: '280px', defaultOn: true, class: 'notCenter' },
  { key: 'program', title: 'Program', attr: 'submitter', width: '88px', defaultOn: true },
  { key: 'center', title: 'Center', attr: 'lead_center', width: '110px', defaultOn: true },
  { key: 'phase', title: 'Phase', attr: 'phase_name', width: '100px', defaultOn: true },
  { key: 'category', title: 'Indicator category', attr: 'result_type', width: '140px', defaultOn: true },
  { key: 'funding', title: 'Funding', attr: 'source_name', width: '100px', defaultOn: true },
  { key: 'status', title: 'Status', attr: 'full_status_name_html', width: '110px', defaultOn: true },
  { key: 'createdBy', title: 'Created by', attr: 'full_name', width: '130px', defaultOn: false },
  { key: 'created', title: 'Created', attr: 'created_date', width: '100px', defaultOn: true },
  { key: 'updated', title: 'Updated', attr: 'last_updated_date', width: '100px', defaultOn: false }
];

function readStoredColumnVisibility(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(RC_COLUMN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function defaultColumnVisibility(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const col of RC_COLUMNS) map[col.key] = col.defaultOn;
  return map;
}

@Component({
  selector: 'app-results-list',
  templateUrl: './results-list.component.html',
  styleUrls: ['./results-list.component.scss', './results-list.responsive.scss'],
  standalone: false
})
export class ResultsListComponent implements OnInit, AfterViewInit, OnDestroy {
  router = inject(Router);
  bilateralResultsService = inject(BilateralResultsService);

  private readonly resultRouteCache = new Map<string, ResultRoute>();

  private readonly selectedPhaseIds = computed(() =>
    this.resultsListFilterSE
      .selectedPhases()
      .map(phase => phase.id)
      .join(',')
  );

  gettingReport = false;
  // P2-3322 (2026): signal-backed flag. `validateOrder()` is called from the column headers
  // (`(click)` / `(keydown.enter)`) but writes the flag 100 ms later inside a `setTimeout`, once the
  // table has applied `aria-sort`. The template reads it at `@let filteredResults = ... |
  // resultsListFilter : ... : this.combine : ...`, where it decides whether phases of the same
  // `result_code` are merged into one row or listed separately. As a plain field the delayed write
  // notified nothing, so under zoneless change detection sorting by any column other than the code
  // left the rows merged. The public API stays a plain boolean, so the template, the pipe and the
  // existing specs are untouched.
  private readonly _combine = signal<boolean>(true);
  get combine(): boolean {
    return this._combine();
  }
  set combine(value: boolean) {
    this._combine.set(value);
  }

  /** Full catalog for the Columns picker (CURRENT). */
  readonly allColumns = RC_COLUMNS;

  /** Visibility map keyed by RC_COLUMNS.key — persisted. */
  readonly columnVisibility = signal<Record<string, boolean>>({
    ...defaultColumnVisibility(),
    ...readStoredColumnVisibility()
  });

  columnsOpen = signal(false);

  /** Table columns currently visible (CURRENT order, filtered). */
  readonly visibleColumns = computed(() => {
    const vis = this.columnVisibility();
    return RC_COLUMNS.filter(c => vis[c.key] !== false).map(c => ({
      key: c.key,
      title: c.title,
      attr: c.attr,
      width: c.width,
      class: c.class,
      center: false
    }));
  });

  /**
   * @deprecated Prefer `visibleColumns()` — kept for tests that read columnOrder shape.
   * Mirrors default-on columns only.
   */
  get columnOrder() {
    return this.visibleColumns();
  }

  /** Same deterministic palette as the sidebar program dots. */
  private readonly programDotPalette: readonly string[] = [
    'var(--pr-chart-3)',
    'var(--pr-color-green-500)',
    'var(--pr-color-blue-500)',
    'var(--pr-sidebar-accent)',
    'var(--pr-color-yellow-300)',
    'var(--pr-chart-4)',
    'var(--pr-color-orange-500)',
    'var(--pr-color-red-100)'
  ];
  items: ItemMenu[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-sitemap',
      visible: true,
      inlineStyle: 'color: var(--pr-color-primary-300);',
      command: () => {
        this.api.dataControlSE.showShareRequest = true;
      }
    },
    {
      label: 'Update result',
      icon: 'pi pi-clone',
      visible: true,
      inlineStyle: 'color: var(--pr-color-primary-300);',
      command: () => {
        this.api.dataControlSE.chagePhaseModal = true;
      }
    },
    {
      label: 'Review result',
      icon: 'pi pi-eye',
      inlineStyle: 'color: var(--pr-color-primary-300);',
      visible: false,
      command: () => {
        this.navigateToResult(this.api.dataControlSE.currentResult);
      }
    }
  ];
  itemsWithDelete: ItemMenu[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-sitemap',
      visible: true,
      inlineStyle: 'color: var(--pr-color-primary-300);',
      command: () => {
        this.api.dataControlSE.showShareRequest = true;
      }
    },
    {
      label: 'Update result',
      icon: 'pi pi-clone',
      visible: true,
      inlineStyle: 'color: var(--pr-color-primary-300);',
      command: () => {
        this.api.dataControlSE.chagePhaseModal = true;
      }
    },
    {
      label: 'Review result',
      icon: 'pi pi-pencil',
      visible: false,
      inlineStyle: 'color: var(--pr-color-primary-300);',
      command: () => {
        this.navigateToResult(this.api.dataControlSE.currentResult);
      }
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      inlineStyle: 'color: var(--pr-color-red-300);',
      command: () => {
        this.onDeleteREsult();
      }
    }
  ];

  @ViewChild('table') table: PrTableComponent;
  @ViewChild('filters') filters: ResultsListFiltersComponent;

  // Action menu overlay state (replaces PrimeNG p-popover)
  menuOpen = signal(false);
  menuTop = 0;
  menuLeft = 0;

  constructor(
    public resultsNotificationsSE: ResultsNotificationsService,
    public api: ApiService,
    public resultsListService: ResultsListService,
    private ResultLevelSE: ResultLevelService,
    private shareRequestModalSE: ShareRequestModalService,
    private retrieveModalSE: RetrieveModalService,
    public phasesService: PhasesService,
    public resultsListFilterSE: ResultsListFilterService
  ) {
    effect(() => {
      this.resultsListFilterSE.text_to_search();
      this.resultsListFilterSE.selectedSubmittersAdmin();
      this.resultsListFilterSE.selectedIndicatorCategories();

      if (this.table) {
        this.resetTable();
        this.applyDefaultSort();
      }
    });

    effect(() => {
      this.selectedPhaseIds();
      this.resultsListFilterSE.filterCreatedByMe();
      this.resultsListFilterSE.filterSubmittedByMe();
      const phasesLoaded = this.resultsListFilterSE.phasesOptions().length > 0;

      untracked(() => {
        if (!phasesLoaded) return;
        this.api.updateResultsList(this.api.buildResultsListSearchParams());
        if (this.table) {
          this.resetTable();
          this.applyDefaultSort();
        }
      });
    });
  }

  toggleMenu(event: Event, result?: CurrentResult) {
    if (result) this.onPressAction(result);
    event.stopPropagation();

    if (this.menuOpen()) {
      this.menuOpen.set(false);
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuTop = rect.bottom + 6;
    this.menuLeft = rect.right;
    this.menuOpen.set(true);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.menuOpen()) this.menuOpen.set(false);
    if (this.columnsOpen()) this.columnsOpen.set(false);
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.menuOpen()) this.menuOpen.set(false);
  }

  validateOrder(columnAttr) {
    setTimeout(() => {
      if (columnAttr == 'result_code') {
        this.combine = true;
        return;
      }

      const resultListTableHTML = document.getElementById('resultListTable');
      this.combine =
        !resultListTableHTML.querySelectorAll('th[aria-sort="descending"]').length &&
        !resultListTableHTML.querySelectorAll('th[aria-sort="ascending"]').length;
      return null;
    }, 100);
  }

  ngOnInit(): void {
    if (this.api.rolesSE.isAdmin) {
      this.unSelectInits();
    } else {
      this.api.updateUserData(() => {});
    }
    this.shareRequestModalSE.inNotifications = false;
    this.api.dataControlSE.getCurrentPhases();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.resetTable();
      this.applyDefaultSort();
    }, 500);
  }

  private resetTable(): void {
    if (this.table) {
      this.table.reset();
    }
  }

  public resetTableManually(): void {
    this.resetTable();
  }

  private applyDefaultSort(): void {
    if (!this.table) return;

    // app-pr-table has no sortSingle/sort({field,order}); the bound [sortField]="result_code"
    // + [sortOrder]="-1" inputs define the default, and reset() re-asserts that default sort
    // (and jumps to page 0). See wrapper PrTableComponent.reset().
    this.table.reset();
  }

  unSelectInits() {
    this.api.dataControlSE.myInitiativesList.forEach(item => (item.selected = false));
  }

  private isW3BilateralsAvisa(result: CurrentResult): boolean {
    if (result?.source_name !== 'W3/Bilaterals') return false;
    const code = result?.submitter ?? result?.initiative_official_code ?? '';
    return code === 'SGP-02' || code === 'SGP02';
  }

  /**
   * A W3/Bilaterals result (non-AVISA, not yet Approved) does NOT open Result Detail
   * — it routes to the reporting framework's bilateral review drawer. Mirrors the
   * branching in navigateToResult() so the list can flag these rows at the code.
   */
  opensInFramework(result: CurrentResult): boolean {
    return result?.source_name === 'W3/Bilaterals' && !this.isW3BilateralsAvisa(result) && result?.status_name !== 'Approved';
  }

  /** True when this result comes from a W3/bilateral funding source. */
  isBilateral(result: CurrentResult): boolean {
    return result?.source_name === 'W3/Bilaterals';
  }

  /** Program / submitter official code for the Program column. */
  programCode(result: CurrentResult): string {
    return String(result?.submitter ?? result?.initiative_official_code ?? '').trim();
  }

  programDotColor(code: string | null | undefined): string {
    if (!code) return this.programDotPalette[0];
    const digits = code.match(/\d+/)?.[0];
    const index = digits ? Number(digits) : [...code].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0);
    return this.programDotPalette[index % this.programDotPalette.length];
  }

  /** CURRENT short phase: `2026 · P25` from longer phase_name / year + acronym. */
  phaseShort(result: CurrentResult): string {
    const year = result?.phase_year ?? result?.reported_year;
    const portfolio = result?.acronym ?? result?.portfolio;
    if (year && portfolio) return `${year} · ${portfolio}`;
    const name = String(result?.phase_name ?? '').trim();
    if (!name) return '—';
    // "Reporting 2026 - P25" / "Reporting 2026 (Open)" → "2026 · P25" when possible
    const yearMatch = name.match(/(20\d{2})/);
    const portMatch = name.match(/\b(P\d{2})\b/i);
    if (yearMatch && portMatch) return `${yearMatch[1]} · ${portMatch[1].toUpperCase()}`;
    if (yearMatch) return yearMatch[1];
    return name;
  }

  /** Compact funding label (CURRENT: W1/W2 · Bilateral · W3). */
  fundingLabel(result: CurrentResult): string {
    const raw = String(result?.source_name ?? '').trim();
    if (!raw) return '—';
    if (/w3\s*\/?\s*bilateral/i.test(raw) || /bilateral/i.test(raw)) return 'Bilateral';
    return raw;
  }

  /** Recent = last 7 days (CURRENT purple code dot). */
  isRecentResult(result: CurrentResult): boolean {
    if (!result?.created_date) return false;
    const t = new Date(result.created_date).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
  }

  statusClass(result: CurrentResult): string {
    return `status_tag status_${result?.status_id ?? ''}`;
  }

  pdfHref(result: CurrentResult): string {
    return `/reports/result-details/${result?.result_code}?phase=${result?.version_id}`;
  }

  isColumnVisible(key: string): boolean {
    return this.columnVisibility()[key] !== false;
  }

  toggleColumn(key: string, event?: Event): void {
    event?.stopPropagation();
    // Keep at least one column visible so the table never collapses to empty.
    const next = { ...this.columnVisibility() };
    const turningOff = next[key] !== false;
    if (turningOff) {
      const remaining = RC_COLUMNS.filter(c => c.key !== key && next[c.key] !== false).length;
      if (remaining === 0) return;
    }
    next[key] = !turningOff ? true : false;
    this.columnVisibility.set(next);
    try {
      localStorage.setItem(RC_COLUMN_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // private mode — visibility still works for the session
    }
  }

  toggleColumnsPanel(event?: Event): void {
    event?.stopPropagation();
    this.columnsOpen.update(v => !v);
  }

  closeColumnsPanel(): void {
    if (this.columnsOpen()) this.columnsOpen.set(false);
  }

  onExportCsv(): void {
    this.filters?.onClickFullMetadataExport();
  }

  // These three feed the toolbar's export button. They read the FILTER SERVICE, never the
  // `filters` ViewChild: Angular checks this parent before the child, so reading child state
  // here raised NG0100 on `disabled` / `title` every time the page loaded.
  /** `shown` comes from the template's `@let shown` so there is one source of truth for it. */
  exportDisabled(shown: number): boolean {
    return shown <= 0 || !!this.resultsListFilterSE.fullMetadataExportBlockedReason() || this.exportBusy();
  }

  exportBusy(): boolean {
    return this.resultsListFilterSE.requestingFullExport();
  }

  exportTitle(): string {
    return (
      this.resultsListFilterSE.fullMetadataExportBlockedReason() ||
      'Queue a full metadata export. You will receive an email with a download link.'
    );
  }

  onPressAction(result: CurrentResult): void {
    this.retrieveModalSE.title = result?.title ?? '';
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;

    const canUpdate = this.api.shouldShowUpdate(result, this.api.dataControlSE.reportingCurrentPhase);
    const useBilateralFlow = result?.source_name == 'W3/Bilaterals' && !this.isW3BilateralsAvisa(result);

    if (useBilateralFlow) {
      this.itemsWithDelete[0].visible = false;
      this.itemsWithDelete[1].visible = false;
      this.items[0].visible = false;
      this.items[1].visible = false;

      this.itemsWithDelete[2].visible = true;
      this.itemsWithDelete[2].label = result?.status_name == 'Pending Review' ? 'Review result' : 'See result';
      this.itemsWithDelete[2].icon = result?.status_name == 'Pending Review' ? 'pi pi-pencil' : 'pi pi-eye';

      this.items[2].visible = true;
      this.items[2].label = result?.status_name == 'Pending Review' ? 'Review result' : 'See result';
      this.items[2].icon = result?.status_name == 'Pending Review' ? 'pi pi-pencil' : 'pi pi-eye';
    } else {
      this.itemsWithDelete[0].visible = true;
      this.itemsWithDelete[2].visible = false;
      this.items[0].visible = true;
      this.items[1].visible = canUpdate;
      this.items[2].visible = false;
      this.itemsWithDelete[1].visible =
        this.api.dataControlSE.reportingCurrentPhase.portfolioAcronym === 'P25'
          ? canUpdate
          : this.api.dataControlSE.currentResult?.phase_year < this.api.dataControlSE.reportingCurrentPhase.phaseYear &&
            this.api.dataControlSE.currentResult?.phase_year !== this.api.dataControlSE.reportingCurrentPhase.phaseYear;
    }

    if (this.api.rolesSE.isAdmin) {
      this.itemsWithDelete[3] = {
        ...this.itemsWithDelete[3],
        disabled: this.api.dataControlSE.currentResult?.status_id == '2',
        tooltipShow: this.api.dataControlSE.currentResult?.status_id == '2',
        tooltipText: 'You are not allowed to perform this action because the result is in the status "QAed".'
      };
    } else {
      this.itemsWithDelete[3] = {
        ...this.itemsWithDelete[3],
        disabled:
          (this.api.dataControlSE.currentResult?.role_id !== 3 &&
            this.api.dataControlSE.currentResult?.role_id !== 4 &&
            this.api.dataControlSE.currentResult?.role_id !== 5) ||
          this.api.dataControlSE.currentResult?.status_id == '2',
        tooltipShow:
          (this.api.dataControlSE.currentResult?.role_id !== 3 &&
            this.api.dataControlSE.currentResult?.role_id !== 4 &&
            this.api.dataControlSE.currentResult?.role_id !== 5) ||
          this.api.dataControlSE.currentResult?.status_id == '2',
        tooltipText: this.getDeleteTooltipText()
      };
    }

    if (this.api.dataControlSE.reportingCurrentPhase.portfolioAcronym == this.api.dataControlSE.currentResult?.acronym) {
      this.itemsWithDelete[3].visible = true;
    } else {
      this.itemsWithDelete[3].visible = false;
    }

    this.api.dataControlSE.currentResultSignal.set({
      ...this.api.dataControlSE.currentResult,
      portfolio: this.api.dataControlSE.currentResult?.acronym,
      result_level_id: this.api.dataControlSE.currentResult?.result_level_id
    });
    this.ResultLevelSE.currentResultLevelIdSignal.set(this.api.dataControlSE.currentResult?.result_level_id);
  }

  private getDeleteTooltipText(): string {
    if (this.api.dataControlSE.currentResult?.status_id == '2') {
      return 'You are not allowed to perform this action because the result is in the status "QAed".';
    }

    if (
      this.api.dataControlSE.currentResult?.role_id !== 3 &&
      this.api.dataControlSE.currentResult?.role_id !== 4 &&
      this.api.dataControlSE.currentResult?.role_id !== 5
    ) {
      return 'You are not allowed to perform this action. Please contact your leader or co-leader.';
    }

    return '';
  }

  onDeleteREsult() {
    this.api.alertsFe.show(
      {
        id: 'confirm-delete-result',
        title: `Are you sure you want to delete the result "${this.api.dataControlSE?.currentResult?.title}"?`,
        description: `If you delete this result it will no longer be displayed in the list of results.`,
        status: 'success',
        confirmText: 'Yes, delete'
      },
      () => {
        this.resultsListService.showDeletingResultSpinner = true;
        setTimeout(() => {
          document.getElementById('custom-spinner').scrollIntoView({ behavior: 'smooth' });
        }, 100);
        this.api.resultsSE.PATCH_DeleteResult(this.api.dataControlSE.currentResult.id).subscribe({
          next: resp => {
            this.api.alertsFe.show({
              id: 'confirm-delete-result-su',
              title: `The result "${this.api.dataControlSE?.currentResult?.title}" was deleted`,
              description: ``,
              status: 'success'
            });
            this.api.updateResultsList();
            this.resultsListService.showDeletingResultSpinner = false;
          },
          error: err => {
            const backendMessage = err?.error?.message ?? '';
            if (err?.status === 409) {
              this.api.alertsFe.show({
                id: 'delete-error',
                title: 'Unable to delete result',
                description: backendMessage,
                status: 'warning'
              });
            } else {
              this.api.alertsFe.show({
                id: 'delete-error',
                title: 'Error when delete result',
                description: backendMessage,
                status: 'error'
              });
            }
            this.resultsListService.showDeletingResultSpinner = false;
          }
        });
      }
    );
  }

  /**
   * True when the result must be opened in the bilateral review drawer
   * instead of the regular result detail page.
   */
  private usesBilateralReviewFlow(result: CurrentResult): boolean {
    if (this.isW3BilateralsAvisa(result) || result?.status_name === 'Approved') return false;
    return result?.source_name === 'W3/Bilaterals';
  }

  /**
   * Router commands and query params for a result, cached per result so the
   * template keeps handing routerLink the same object identity on each change
   * detection run.
   */
  private getResultRoute(result: CurrentResult): ResultRoute {
    const key = [result?.result_code, result?.version_id, result?.status_name, result?.source_name, result?.submitter].join('|');
    const cached = this.resultRouteCache.get(key);
    if (cached) return cached;

    const route: ResultRoute = this.usesBilateralReviewFlow(result)
      ? {
          // Same fallback chain as programCode(): a raw `submitter` can be undefined and
          // would build `/entity-details/undefined/results-review`.
          commands: ['/result-framework-reporting', 'entity-details', this.programCode(result), 'results-review'],
          queryParams: { [REVIEW_RESULT_QUERY_PARAM]: result?.result_code, [REVIEW_RESULT_ID_QUERY_PARAM]: result?.id }
        }
      : {
          commands: ['/result', 'result-detail', result?.result_code, 'general-information'],
          queryParams: { phase: result?.version_id }
        };

    this.resultRouteCache.set(key, route);
    return route;
  }

  /** Router commands for the result row link (renders a real href). */
  getResultLink(result: CurrentResult): unknown[] {
    return this.getResultRoute(result).commands;
  }

  /** Query params for the result row link. */
  getResultQueryParams(result: CurrentResult): Record<string, unknown> {
    return this.getResultRoute(result).queryParams;
  }

  /**
   * Plain left click on a row link: routerLink handles the navigation, this only
   * preloads the review drawer state, exactly as the previous (click) handler did.
   * Modified clicks (ctrl/cmd/shift/alt) open a new tab, so they must not touch state.
   */
  onResultLinkClick(event: MouseEvent, result: CurrentResult): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (!this.usesBilateralReviewFlow(result)) return;

    this.bilateralResultsService.currentResultToReview.set(result);
    this.bilateralResultsService.showReviewDrawer.set(true);
  }

  navigateToResult(result: CurrentResult) {
    const { commands, queryParams } = this.getResultRoute(result);

    if (this.usesBilateralReviewFlow(result)) {
      this.bilateralResultsService.currentResultToReview.set(result);

      this.router.navigate(commands, { queryParams }).then(() => {
        this.bilateralResultsService.showReviewDrawer.set(true);
      });
      return;
    }

    this.router.navigate(commands, { queryParams });
  }

  ngOnDestroy(): void {
    this.api.dataControlSE?.myInitiativesList.map(item => (item.selected = true));
  }
}
