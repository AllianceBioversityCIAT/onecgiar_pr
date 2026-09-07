// @akili-spec changes/sp-bilateral-review-tab (BRT-T-3, BRT-T-5, BRT-R-4, R-6, R-7, R-8, R-9, R-13, R-15, R-20, R-21, R-31, R-32, design.md §6.2, §6.4)
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronsDownUp, lucideChevronsUpDown, lucideSearch } from '@ng-icons/lucide';

import { ApiService } from '../../../../shared/services/api/api.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { SmartNavigationService } from '../../../../shared/services/smart-navigation.service';
import { PrFilterMultiselectModule } from '../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.module';
import { isAvisaInitiative } from '../../../../shared/utils/avisa-initiative.util';
import { ReportingProgramBandComponent } from '../dashboard-lab/components/reporting-program-band/reporting-program-band.component';
import { WhereToReportModalComponent } from '../dashboard-lab/components/where-to-report-modal/where-to-report-modal.component';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';

import { BilateralResultsService, REVIEW_RESULT_ID_QUERY_PARAM, REVIEW_RESULT_QUERY_PARAM } from './services/bilateral-results.service';
import { BilateralReviewCountService } from './services/bilateral-review-count.service';
import { BilateralReviewAccessService } from './services/bilateral-review-access.service';
import { ResultReviewDrawerComponent } from './components/result-review-drawer/result-review-drawer.component';
import { GroupedResult, ResultToReview } from './components/result-review-drawer/result-review-drawer.interfaces';
import { BilateralReviewKpis, BilateralReviewKpisComponent } from './components/bilateral-review-kpis/bilateral-review-kpis.component';
import { BilateralReviewTableComponent } from './components/bilateral-review-table/bilateral-review-table.component';
import { BILATERAL_REVIEW_COPY } from './bilateral-review.copy';
import {
  BILATERAL_REVIEW_QUERY_PARAM_MAP,
  BilateralReviewStatusFilter,
  BilateralReviewViewMode,
  joinBilateralReviewListParam,
  parseBilateralReviewListParam,
  parseBilateralReviewStatus,
  parseBilateralReviewView,
  sameBilateralReviewList
} from './bilateral-review.query-params';

/** One entry of the Center / Bilateral project / Indicator category popover filters. */
interface BilateralReviewFilterOption {
  value: string;
  label: string;
}

/** Fields BRT-R-9 searches, case-insensitively. */
function matchesSearch(row: ResultToReview, needle: string): boolean {
  const haystacks = [row.result_code, row.result_title, row.project_name, row.lead_center, row.indicator_category, row.toc_title, row.indicator];
  return haystacks.some(value => (value ?? '').toString().toLowerCase().includes(needle));
}

/** Distinct, non-blank values of one row dimension, alphabetical. */
function optionsOf(rows: ResultToReview[], pick: (row: ResultToReview) => string | undefined): string[] {
  const unique = new Set(rows.map(pick).filter((value): value is string => !!value));
  return [...unique].sort((a, b) => a.localeCompare(b));
}

@Component({
  selector: 'app-bilateral-review',
  standalone: true,
  templateUrl: './bilateral-review.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIcon,
    FormsModule,
    ReportingProgramBandComponent,
    WhereToReportModalComponent,
    PrFilterMultiselectModule,
    BilateralReviewKpisComponent,
    BilateralReviewTableComponent,
    ResultReviewDrawerComponent
  ],
  viewProviders: [provideIcons({ lucideSearch, lucideChevronsUpDown, lucideChevronsDownUp })]
})
export class BilateralReviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly centersSE = inject(CentersService);
  private readonly smartNav = inject(SmartNavigationService);
  private readonly homeSE = inject(ResultFrameworkReportingHomeService);

  readonly results = inject(BilateralResultsService);
  private readonly countService = inject(BilateralReviewCountService);
  private readonly accessService = inject(BilateralReviewAccessService);

  readonly copy = BILATERAL_REVIEW_COPY;

  // ── Deep-linked drawer open (BRT-R-21, ported from results-review-table.component.ts:134-160) ──
  /** Result code deep-linked through the URL, consumed once the results are loaded; `null` once
   *  consumed so the effect below fires at most once even if `tableResults` changes again later. */
  private pendingReviewResultCode: string | null = this.route.snapshot.queryParamMap.get(REVIEW_RESULT_QUERY_PARAM);
  /** Id of that same result, used when it is not part of the review list (e.g. drafts). */
  private readonly pendingReviewResultId: string | null = this.route.snapshot.queryParamMap.get(REVIEW_RESULT_ID_QUERY_PARAM);

  /** Viewport lock: the work area is the only scroller the band needs to know about. */
  readonly workArea = viewChild<ElementRef<HTMLElement>>('workArea');
  readonly workAreaEl = computed(() => this.workArea()?.nativeElement ?? null);

  readonly programmeCode = toSignal(this.route.paramMap.pipe(map(params => params.get('entityId') ?? '')), { initialValue: '' });
  readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  private readonly programme = computed(() => {
    const wanted = this.programmeCode().toUpperCase();
    const all = [...this.homeSE.mySPsList(), ...this.homeSE.otherSPsList(), ...this.homeSE.otherProjectsList()];
    return all.find(programme => String(programme?.initiativeCode ?? '').toUpperCase() === wanted) ?? null;
  });

  readonly programmeName = computed(() => this.programme()?.initiativeShortName || this.programme()?.initiativeName || '');
  readonly cycleYear = computed(() => this.api.dataControlSE.reportingCurrentPhase?.phaseYear ?? null);
  readonly cyclePhase = computed(() => this.api.dataControlSE.reportingCurrentPhase?.portfolioAcronym ?? '');

  /** Fail-closed gate for the band emerging CTA, same rule every sibling tab applies. */
  readonly canReportEmerging = computed(() => {
    const code = this.programmeCode();
    const programme = this.programme();
    return !!code && !isAvisaInitiative({ official_code: code, initiativeCode: code, initiativeId: programme?.initiativeId });
  });

  readonly showWhereToReportModal = signal(false);
  openWhereToReport(): void {
    this.showWhereToReportModal.set(true);
  }

  /** Hop to dashboard-lab host; T-6 wires `returnTab=bilateral-review` back to this tab. */
  openEmergingReport(): void {
    if (!this.canReportEmerging()) return;
    this.smartNav.rememberResultDetailOrigin();
    this.router.navigate(['/result-framework-reporting', 'entity-details', this.programmeCode()], {
      queryParams: { reportEmerging: 'true', returnTab: 'bilateral-review' }
    });
  }

  // ── List state ──────────────────────────────────────────────────────────────────────────────
  /** Starts `true` so a cold page paints the skeleton, never the empty state, before the first
   *  response (Reliability fix, BRT-T-3 rework). */
  readonly loading = signal(true);
  readonly error = signal(false);
  /** BRT-T-5 / KZ-REH-2: true only for the re-fetch a drawer decision triggers — guards the row
   *  action (`aria-disabled` + title + handler early-return, never native `disabled`) so a second
   *  click can't race the refresh. Reset by `loadResults` in both its `next` and `error` paths. */
  readonly decisionInFlight = signal(false);

  // ── Toolbar / filter state (design.md §6.2) ────────────────────────────────────────────────
  readonly search = signal('');
  readonly status = signal<BilateralReviewStatusFilter>('all');
  /** CLARISA center CODES (csv on the URL, BRT-R-16). */
  readonly centers = signal<string[]>([]);
  readonly projects = signal<string[]>([]);
  readonly categories = signal<string[]>([]);
  readonly view = signal<BilateralReviewViewMode>('grouped');
  readonly expandAllNonce = signal(0);
  /** State the table applies to every group on the NEXT `expandAllNonce` bump (BRT-T-4). Starts
   *  `true` so the table's initial render honors "groups are expanded by default" (BRT-R-10). */
  readonly allExpanded = signal(true);
  readonly filterPopoverOpen = signal(false);

  readonly onlyPending = computed(() => this.status() === 'pending');

  /** "Can this user review THIS program" (BRT-R-14) — gates the row action label (BRT-AC-8).
   *  A plain method, NOT a `computed()`: `isProgramMember` reads non-reactive state
   *  (`rolesSE.isAdmin`, `dataControlSE.myInitiativesList` — a plain array) that can resolve
   *  AFTER this page's first render (hard load / deep link). A `computed()` here would memoize
   *  whatever answer it saw on that first read — its only SIGNAL dependency is `programmeCode()`
   *  — locking a genuine program member out of Review forever. A plain method is re-evaluated on
   *  every change-detection pass instead (Reviewer fix, BRT-T-4 rework attempt 2). */
  canReview(): boolean {
    return this.accessService.isProgramMember(this.programmeCode());
  }

  /** Toolbar label/icon for the Expand all ⇄ Collapse all control — describes the action the next
   *  click performs, so a page that opens already fully expanded reads "Collapse all" first. */
  readonly expandAllLabel = computed(() => (this.allExpanded() ? this.copy.toolbar.collapseAll : this.copy.toolbar.expandAll));
  readonly expandAllIcon = computed(() => (this.allExpanded() ? 'lucideChevronsDownUp' : 'lucideChevronsUpDown'));

  // ── Center code ↔ acronym (design.md §6.2 — rows carry the acronym in `lead_center`) ───────
  private readonly codeToAcronym = computed(() => {
    const map = new Map<string, string>();
    for (const center of this.centersSE.centers()) map.set(center.code, center.acronym);
    return map;
  });
  private readonly acronymToCode = computed(() => {
    const map = new Map<string, string>();
    for (const center of this.centersSE.centers()) map.set(center.acronym, center.code);
    return map;
  });
  private readonly selectedCenterAcronyms = computed(() => {
    const map = this.codeToAcronym();
    return this.centers().map(code => map.get(code) ?? code);
  });

  // ── Computed pipeline (design.md §6.2): searchFiltered → chipCounts/kpis → visibleRows → groups ──
  readonly searchFiltered = computed<ResultToReview[]>(() => {
    const needle = this.search().trim().toLowerCase();
    const rows = this.results.tableResults();
    return needle ? rows.filter(row => matchesSearch(row, needle)) : rows;
  });

  readonly matchCount = computed<number | null>(() => (this.search().trim() ? this.searchFiltered().length : null));

  private isPending(row: ResultToReview): boolean {
    return row.status_id == 5; // eslint-disable-line eqeqeq -- wire may send "5"
  }
  private isApproved(row: ResultToReview): boolean {
    return row.status_id == 6; // eslint-disable-line eqeqeq -- wire may send "6"
  }
  private isRejected(row: ResultToReview): boolean {
    return row.status_id == 7; // eslint-disable-line eqeqeq -- wire may send "7"
  }

  /** Chip counts, computed over `searchFiltered` — BEFORE status/popover filters, so the counts
   *  explain the chips rather than describe an already-narrowed list. */
  readonly chipCounts = computed(() => {
    const rows = this.searchFiltered();
    return {
      all: rows.length,
      pending: rows.filter(row => this.isPending(row)).length,
      approved: rows.filter(row => this.isApproved(row)).length,
      rejected: rows.filter(row => this.isRejected(row)).length
    };
  });

  /** KPI values, also over `searchFiltered` (design.md §6.2), so the strip and the chips never
   *  disagree about what "the list" means. */
  readonly kpis = computed<BilateralReviewKpis>(() => {
    const rows = this.searchFiltered();
    const counts = this.chipCounts();
    return {
      projects: new Set(rows.map(row => row.project_name).filter(Boolean)).size,
      centers: new Set(rows.map(row => row.lead_center).filter(Boolean)).size,
      pending: counts.pending,
      approved: counts.approved,
      rejected: counts.rejected
    };
  });

  /** Status + popover filters applied on top of `searchFiltered`. */
  readonly visibleRows = computed<ResultToReview[]>(() => {
    const status = this.status();
    const projects = this.projects();
    const categories = this.categories();
    const centerAcronyms = this.selectedCenterAcronyms();

    return this.searchFiltered().filter(row => {
      if (status === 'pending' && !this.isPending(row)) return false;
      if (status === 'approved' && !this.isApproved(row)) return false;
      if (status === 'rejected' && !this.isRejected(row)) return false;
      if (centerAcronyms.length && !centerAcronyms.includes(row.lead_center ?? '')) return false;
      if (projects.length && !projects.includes(row.project_name ?? '')) return false;
      if (categories.length && !categories.includes(row.indicator_category ?? '')) return false;
      return true;
    });
  });

  /** Rebuilds `GroupedResult[]` from `visibleRows`, dropping groups left empty by filtering. */
  readonly groups = computed<GroupedResult[]>(() => {
    const byProject = new Map<string, GroupedResult>();
    for (const row of this.visibleRows()) {
      const key = row.project_name ?? '';
      if (!byProject.has(key)) byProject.set(key, { project_id: row.project_id, project_name: row.project_name, results: [] });
      byProject.get(key)!.results.push(row);
    }
    return [...byProject.values()];
  });

  /** Flat view rows (BRT-R-30), sorted desc by `submission_date`. */
  readonly flatRows = computed<ResultToReview[]>(() =>
    [...this.visibleRows()].sort((a, b) => this.toSubmissionTime(b.submission_date) - this.toSubmissionTime(a.submission_date))
  );

  private toSubmissionTime(value: string | null | undefined): number {
    const time = value ? new Date(value).getTime() : NaN;
    return Number.isNaN(time) ? 0 : time;
  }

  // ── Filter popover option lists — derived from the LOADED rows (`tableResults`) ────────────
  readonly centerFilterOptions = computed<BilateralReviewFilterOption[]>(() => {
    const acronymToCode = this.acronymToCode();
    return optionsOf(this.results.tableResults(), row => row.lead_center).map(acronym => ({
      value: acronymToCode.get(acronym) ?? acronym,
      label: acronym
    }));
  });
  readonly projectFilterOptions = computed<BilateralReviewFilterOption[]>(() =>
    optionsOf(this.results.tableResults(), row => row.project_name).map(value => ({ value, label: value }))
  );
  readonly categoryFilterOptions = computed<BilateralReviewFilterOption[]>(() =>
    optionsOf(this.results.tableResults(), row => row.indicator_category).map(value => ({ value, label: value }))
  );

  readonly activeFilterCount = computed(() => this.centers().length + this.projects().length + this.categories().length);
  readonly filtersActive = computed(() => this.activeFilterCount() > 0);

  // ── View states (BRT-R-31) — mutually exclusive ────────────────────────────────────────────
  readonly showSkeleton = computed(() => this.loading() && this.results.tableResults().length === 0);
  readonly showError = computed(() => this.error() && !this.loading());
  readonly showWholeEmpty = computed(
    () => !this.loading() && !this.error() && this.results.tableResults().length === 0
  );
  readonly showFilteredEmpty = computed(
    () => !this.loading() && !this.error() && this.results.tableResults().length > 0 && this.visibleRows().length === 0
  );
  readonly showContent = computed(() => !this.showSkeleton() && !this.showError() && !this.showWholeEmpty() && !this.showFilteredEmpty());

  constructor() {
    // ── Load: entity details + review list, one GET_ResultToReview(code) per programme code ──
    effect(() => {
      const code = this.programmeCode();
      untracked(() => {
        if (!code) return;
        this.results.entityId.set(code);
        // Clear the previous programme's rows before issuing the new fetch (Reliability fix,
        // BRT-T-3 rework) — mirrors the legacy results-review-table.component.ts effect, so a
        // program switch never renders the old programme's rows under the new hero.
        this.results.tableData.set([]);
        this.results.tableResults.set([]);
        this.results.getEntityDetails();
        this.loadResults(code);
      });
    });

    if (!this.centersSE.centers().length) void this.centersSE.getData();

    // ── URL → state (guarded, `untracked`, same bridge as `my-work-board`) ────────────────────
    effect(() => {
      const params = this.queryParams();
      untracked(() => {
        const search = params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.search) ?? '';
        if (search !== this.search()) this.search.set(search);

        const status = parseBilateralReviewStatus(params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.status));
        if (status !== this.status()) this.status.set(status);

        const view = parseBilateralReviewView(params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.view));
        if (view !== this.view()) this.view.set(view);

        const centers = parseBilateralReviewListParam(params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.center));
        if (!sameBilateralReviewList(centers, this.centers())) this.centers.set(centers);

        const projects = parseBilateralReviewListParam(params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.project));
        if (!sameBilateralReviewList(projects, this.projects())) this.projects.set(projects);

        const categories = parseBilateralReviewListParam(params.get(BILATERAL_REVIEW_QUERY_PARAM_MAP.category));
        if (!sameBilateralReviewList(categories, this.categories())) this.categories.set(categories);
      });
    });

    // ── State → URL (`replaceUrl`, `merge`) ────────────────────────────────────────────────────
    effect(() => {
      const search = this.search();
      const status = this.status();
      const view = this.view();
      const center = joinBilateralReviewListParam(this.centers());
      const project = joinBilateralReviewListParam(this.projects());
      const category = joinBilateralReviewListParam(this.categories());

      untracked(() => {
        const current = this.route.snapshot.queryParamMap;
        const next: Record<string, string | null> = {
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.search]: search || null,
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.status]: status === 'all' ? null : status,
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.view]: view === 'grouped' ? null : view,
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.center]: center,
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.project]: project,
          [BILATERAL_REVIEW_QUERY_PARAM_MAP.category]: category
        };
        const changed = Object.entries(next).some(([key, value]) => (current.get(key) ?? null) !== (value ?? null));
        if (!changed) return;

        this.router.navigate([], { relativeTo: this.route, queryParams: next, queryParamsHandling: 'merge', replaceUrl: true });
      });
    });

    // ── Deep-linked drawer open (BRT-R-21) — fires once, as soon as the list is non-empty ──────
    effect(() => {
      const rows = this.results.tableResults();
      if (!this.pendingReviewResultCode || rows.length === 0) return;
      untracked(() => {
        const code = this.pendingReviewResultCode;
        this.pendingReviewResultCode = null;
        // Prefer the object from the list (it is complete). A result that is not part of the
        // review list (e.g. a draft still being edited) falls back to a minimal object built
        // from the id, which is all the drawer needs to load its detail.
        const match = rows.find(row => String(row.result_code) === String(code));
        const target = match ?? (this.pendingReviewResultId ? ({ id: this.pendingReviewResultId, result_code: code } as ResultToReview) : null);
        if (target) this.onOpenResult(target);
        // `merge` preserves the six filter keys (search/status/center/project/category/view)
        // written by the state → URL effect above — only reviewResult/reviewResultId are cleared.
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { [REVIEW_RESULT_QUERY_PARAM]: null, [REVIEW_RESULT_ID_QUERY_PARAM]: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      });
    });
  }

  private loadResults(code: string): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.resultsSE.GET_ResultToReview(code).subscribe({
      next: (res: { response?: GroupedResult[] }) => {
        const groups = Array.isArray(res?.response) ? res.response : [];
        this.results.tableData.set(groups);
        const rows = groups.flatMap(group => group.results ?? []);
        this.results.tableResults.set(rows);
        this.countService.setFromRows(code, rows);
        this.loading.set(false);
        this.decisionInFlight.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
        this.decisionInFlight.set(false);
      }
    });
  }

  retry(): void {
    const code = this.programmeCode();
    if (code) this.loadResults(code);
  }

  /** BRT-R-13: after the drawer emits a decision, re-fetch with the SAME `loadResults` the
   *  initial load uses — one request refreshes rows, chip counts, KPI cards AND (via
   *  `countService.setFromRows`) the tab badge, with no second request and no navigation. The
   *  drawer closes itself (its own `visible` model), search/status/filters/view are untouched. */
  onDecisionMade(): void {
    const code = this.programmeCode();
    if (!code) return;
    this.decisionInFlight.set(true);
    this.loadResults(code);
  }

  // ── Search / status / view / expand ────────────────────────────────────────────────────────
  onSearchInput(value: string): void {
    this.search.set(value);
  }

  setStatus(status: BilateralReviewStatusFilter): void {
    this.status.set(status);
  }

  toggleOnlyPending(): void {
    this.status.set(this.onlyPending() ? 'all' : 'pending');
  }

  setView(view: BilateralReviewViewMode): void {
    this.view.set(view);
  }

  toggleExpandAll(): void {
    this.allExpanded.update(expanded => !expanded);
    this.expandAllNonce.update(nonce => nonce + 1);
  }

  /** Row action (BRT-R-12): opens the existing review drawer via the relocated service's models. */
  onOpenResult(row: ResultToReview): void {
    this.results.currentResultToReview.set(row);
    this.results.showReviewDrawer.set(true);
  }

  // ── Filter popover ──────────────────────────────────────────────────────────────────────────
  toggleFilterPopover(event: Event): void {
    event.stopPropagation();
    this.filterPopoverOpen.update(open => !open);
  }

  closeFilterPopover(): void {
    this.filterPopoverOpen.set(false);
  }

  /** Clears the Center / Bilateral project / Indicator category popover filters only — the
   *  toolbar and popover's "Clear filters" both call this (BRT-R-8); search and the status chip
   *  are independent dimensions with their own controls. */
  clearFilters(): void {
    this.centers.set([]);
    this.projects.set([]);
    this.categories.set([]);
  }

  /** The filtered-empty state's "Clear filters" (BRT-R-31): whatever combination of search,
   *  status and popover filters emptied the list, this restores it in one click. */
  clearAllFilters(): void {
    this.search.set('');
    this.status.set('all');
    this.clearFilters();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event?: Event): void {
    const target = event?.target as HTMLElement | null;
    if (typeof target?.closest === 'function' && target.closest('.brt-filter-container')) return;
    if (target && typeof document !== 'undefined' && document.contains && !document.contains(target)) return;
    if (this.filterPopoverOpen()) this.filterPopoverOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.filterPopoverOpen()) this.filterPopoverOpen.set(false);
  }
}
