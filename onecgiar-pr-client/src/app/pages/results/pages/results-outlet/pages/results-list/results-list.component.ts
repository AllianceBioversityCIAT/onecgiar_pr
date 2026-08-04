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
  combine = true;

  /**
   * Default columns match CURRENT Results Center (PRMS-Shell.dc.html):
   * Code · Title · Program · Center · Phase · Indicator category · Funding · Status · Created
   * PDF / Created by are not default chrome — PDF lives in the row action menu.
   */
  columnOrder = [
    { title: 'Code', attr: 'result_code', center: false, width: '88px' },
    { title: 'Title', attr: 'title', class: 'notCenter', width: '280px' },
    { title: 'Program', attr: 'submitter', center: false, width: '88px' },
    { title: 'Center', attr: 'lead_center', center: false, width: '110px' },
    { title: 'Phase', attr: 'phase_name', center: false, width: '100px' },
    { title: 'Indicator category', attr: 'result_type', center: false, width: '140px' },
    { title: 'Funding', attr: 'source_name', center: false, width: '100px' },
    { title: 'Status', attr: 'full_status_name_html', center: false, width: '110px' },
    { title: 'Created', attr: 'created_date', center: false, width: '100px' }
  ];

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
          commands: ['/result-framework-reporting', 'entity-details', result?.submitter, 'results-review'],
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
