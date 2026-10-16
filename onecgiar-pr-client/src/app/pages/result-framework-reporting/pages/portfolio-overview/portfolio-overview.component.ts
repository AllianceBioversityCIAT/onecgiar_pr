import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink } from '@ng-icons/lucide';

import { PrVizChartComponent } from '../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { HlmButton } from '@spartan/button';
import { HlmSeparatorImports } from '@spartan/separator';
import { HlmTooltip } from '@spartan/tooltip';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../internationalization/portfolio-overview.copy';
import { STATUS_GUIDE_URL } from '../../../../shared/constants/portfolio-links.constants';
import { PortfolioCentersBlockComponent } from './components/centers-block/centers-block.component';
import { FilterBarComponent } from './components/filter-bar/filter-bar.component';
import { PortfolioProjectsBlockComponent } from './components/projects-block/projects-block.component';
import { PortfolioTocKpiBlockComponent } from './components/toc-kpi-block/toc-kpi-block.component';
import { PortfolioTypologyBlockComponent } from './components/typology-block/typology-block.component';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { ResultsListFilterService } from '../../../results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { resolveChartTokens } from '../../../../shared/utils/chart-tokens.util';
import {
  categoryOriginBarOption,
  categoryOriginBarTable,
  centerBilateralOption,
  centerBilateralTable,
  portfolioStatusDonutOption,
  portfolioStatusDonutTable,
  statusPipelineOption
} from './portfolio-overview.charts';
import {
  FILTER_DIMENSIONS,
  type FilterDimension,
  isActive,
  notAffectedBy,
  parseQueryParams,
  resultsCenterLinkable,
  toQueryParams
} from './services/portfolio-filters';
import {
  PortfolioBar,
  PortfolioOverviewService,
  PortfolioStatusSegment
} from './services/portfolio-overview.service';

/** How many bilateral programmes the card shows before `View all` appears. Design: 4. */
export const BILATERAL_PREVIEW = 4;

export const CATEGORY_SHORT_NAMES: Record<string, string> = {
  'Innovation development': 'Inno-Dev',
  'Knowledge product': 'KP',
  'Policy change': 'Policy',
  'Capacity sharing for development': 'Cap-Dev',
  'Capacity change': 'Cap-Change',
  'Innovation use': 'Inno-Use',
  'Other output': 'Other-Out',
  'Other outcome': 'Other-Outc',
  'Impact contribution': 'Impact'
};

export const STATUS_KEY_TO_ID: Record<string, number> = {
  editing: 1,
  'in-qa': 2,
  in_qa: 2,
  quality_assessed: 2,
  'quality-assessed': 2,
  submitted: 3,
  discontinued: 4,
  approved: 6,
  rejected: 7
};

export function getCategoryShortName(category: string): string {
  return CATEGORY_SHORT_NAMES[category] || category;
}

/**
 * Portfolio overview — reporting figures across every science program, admin only.
 *
 * Built from the live Claude Design (`PRMS Reporting.dc.html`, block `showPortfolio`, read 2026-08-24).
 * The results-per-type matrix was removed by spec changes/portfolio-overview-revamp/toc-kpi-progress
 * (TKP-R-9); the section after Typology is now the ToC KPI block, which owns its own data path.
 */
@Component({
  selector: 'app-portfolio-overview',
  standalone: true,
  templateUrl: './portfolio-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIcon,
    NgTemplateOutlet,
    FilterBarComponent,
    HlmButton,
    PrVizChartComponent,
    PortfolioCentersBlockComponent,
    PortfolioProjectsBlockComponent,
    PortfolioTocKpiBlockComponent,
    PortfolioTypologyBlockComponent,
    HlmSeparatorImports,
    HlmTooltip
  ],
  providers: [PortfolioOverviewService, provideIcons({ lucideExternalLink })],
  styles: [
    `
      :host {
        display: block;
      }

      /* The design's entrance, shared with the other redesign surfaces. At-rules are one of the
         sanctioned SCSS exceptions to Tailwind-first (client CLAUDE.md §5). */
      @keyframes prmsFade {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }

      .po-card {
        animation: prmsFade 0.16s ease-out;
      }

      @media (prefers-reduced-motion: reduce) {
        .po-card {
          animation: none;
        }
      }
    `
  ]
})
export class PortfolioOverviewComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly dataControlSE = inject(DataControlService);
  private readonly resultsListFilterSE = inject(ResultsListFilterService, { optional: true });
  readonly data = inject(PortfolioOverviewService);

  /** Whether the bilateral card is showing every programme or just the preview. */
  readonly bilateralExpanded = signal<boolean>(false);

  /** The query params as they were on arrival, parsed once (DD-11). Applied through `sanitize` when the rows exist. */
  private readonly pendingSelection = parseQueryParams(
    Object.fromEntries(FILTER_DIMENSIONS.map(d => [d, this.route?.snapshot?.queryParamMap?.getAll(d) ?? []]))
  );
  /** True once the arrival params were applied: from then on the selection is mirrored to the URL (DD-11). */
  private readonly urlReady = signal<boolean>(false);

  constructor() {
    this.data.load();

    // Read the URL once, when there is something to filter. Program / Typology / Status are sanitized by the service
    // right away; Project and Center when the map arrives (or dropped if it fails).
    effect(() => {
      if (this.urlReady() || !this.hasFigures()) return;
      untracked(() => {
        if (isActive(this.pendingSelection)) this.data.setSelection(this.pendingSelection);
        this.urlReady.set(true);
      });
    });

    // Mirror the selection to the URL: replaceUrl (no history entry), other query params kept by `merge`,
    // an emptied dimension removed with `null`.
    effect(() => {
      if (!this.urlReady()) return;
      const params = toQueryParams(this.data.selection());
      const queryParams: Record<string, string | null> = {};
      for (const dimension of FILTER_DIMENSIONS) queryParams[dimension] = params[dimension] ?? null;
      untracked(() => {
        void this.router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
      });
    });
  }

  /**
   * Year of the phase these figures describe: the page rows' phase name first, the current reporting phase
   * as fallback. The eyebrow and the ToC KPI block subtitle read the same value.
   */
  readonly phaseYear = computed(() => {
    const phaseName = this.data.phaseName();
    return phaseName ? (/\d{4}/.exec(phaseName)?.[0] ?? '') : String(this.dataControlSE?.reportingCurrentPhase?.phaseYear ?? '');
  });

  /** `PORTFOLIO · REPORTING CYCLE 2026 · P25` — the phase these figures actually describe. */
  readonly eyebrow = computed(() => {
    const phase = this.dataControlSE?.reportingCurrentPhase;
    const year = this.phaseYear();
    const acronym = this.data.portfolioAcronym() || phase?.portfolioAcronym || '';
    return ['PORTFOLIO', year ? `REPORTING CYCLE ${year}` : '', acronym].filter(Boolean).join(' · ');
  });

  readonly copy = PORTFOLIO_OVERVIEW_COPY;
  /** Status guide URL; the link renders only when non-empty (OQ-1). A plain field so a spec can assign it. */
  statusGuideUrl: string = STATUS_GUIDE_URL;
  /** Per-status accessible hint, keyed by segment key (kept out of the service definitions, DD-4). */
  readonly statusHints: Record<string, string> = { rejected: PORTFOLIO_OVERVIEW_COPY.rejectedHint };

  readonly kpis = computed(() => this.data.kpiTotals());
  readonly statusSegments = computed(() => this.data.statusSegments());
  readonly statusTotal = computed(() => this.statusSegments().reduce((sum, s) => sum + s.count, 0));

  private readonly donutPalette = computed(() => {
    const tokens = resolveChartTokens();
    return [...tokens.ramp, tokens.bilateralMuted, tokens.primaryStrong];
  });

  readonly statusDonutOption = computed(() =>
    portfolioStatusDonutOption(this.statusSegments(), this.donutPalette())
  );
  readonly statusDonutTable = computed(() => portfolioStatusDonutTable(this.statusSegments(), this.copy.statusTableCaption));

  readonly statusPipelineOption = computed(() =>
    statusPipelineOption(this.statusSegments(), this.donutPalette())
  );

  // ---- Global filters (spec global-filters, GLF-T-5, DD-7) ----------------------------------------
  // The status tiles and the donut write the GLOBAL Status selection; there is no local highlight state.

  readonly selectedStatuses = computed(() => this.data.selection().status);
  readonly filtersActive = computed(() => isActive(this.data.selection()));
  /** The "View in Results Center" link shows only when the Results Center can apply the selection (R-5). */
  readonly resultsCenterLinkable = computed(() => resultsCenterLinkable(this.data.selection()));
  readonly tocNotAffected = computed(() => notAffectedBy('toc', this.data.selection()));
  readonly projectsNotAffected = computed(() => notAffectedBy('projects', this.data.selection()));
  /** The Centers block honours Project only once the map is ready (DD-5): until then it says "Not affected by: Project". */
  readonly centersDimensionsVersionId = computed(() => (this.data.dimensionIndex() ? this.data.versionId() : null));

  /** One entry per active dimension: its label and the labels of the chosen values (the strip's text). */
  readonly activeSummary = computed(() => {
    const selection = this.data.selection();
    const options = this.data.options();
    const labelOf = (dimension: FilterDimension, value: string): string => {
      if (dimension === 'typology') {
        for (const group of options.typology) {
          if (group.value === value) return group.label;
          const type = group.types.find(t => t.value === value);
          if (type) return type.label;
        }
        return value;
      }
      return options[dimension].find(o => o.value === value)?.label ?? value;
    };
    return FILTER_DIMENSIONS.filter(d => selection[d].size > 0).map(d => ({
      dimension: d,
      label: this.copy.filters.dimensions[d],
      values: [...selection[d]].map(v => labelOf(d, v)).join(', ')
    }));
  });

  toggleStatus(statusKey: string): void {
    this.data.toggleValue('status', statusKey);
  }

  clearFilters(): void {
    this.data.clearAll();
  }

  /** The strip's link: the single Status and Program of the selection (the link only shows when each has at most one). */
  viewActiveInResultsCenter(): void {
    const selection = this.data.selection();
    const status = [...selection.status][0];
    const program = [...selection.program][0];
    this.navigateToResultsCenter('all', { ...(status ? { status } : {}), ...(program ? { program } : {}) });
  }

  readonly categoryOriginOption = computed(() =>
    categoryOriginBarOption(this.data.categoryOriginRows(), resolveChartTokens())
  );
  readonly categoryOriginTable = computed(() => categoryOriginBarTable(this.data.categoryOriginRows()));

  readonly centerBilateralOption = computed(() =>
    centerBilateralOption(this.data.centerDistributionRows(), resolveChartTokens())
  );
  readonly centerBilateralTable = computed(() => centerBilateralTable(this.data.centerDistributionRows()));

  segmentWidth(segment: PortfolioStatusSegment): number {
    const total = this.statusTotal();
    return total ? (segment.count / total) * 100 : 0;
  }

  showsSegmentCount(segment: PortfolioStatusSegment): boolean {
    return this.segmentWidth(segment) > 8;
  }

  /** The bilateral rows actually rendered — the preview, or all of them once expanded. */
  readonly bilateralRows = computed<PortfolioBar[]>(() =>
    this.bilateralExpanded() ? this.data.bilateralBars() : this.data.bilateralBars().slice(0, BILATERAL_PREVIEW)
  );

  readonly bilateralHasMore = computed(() => this.data.bilateralBars().length > BILATERAL_PREVIEW);

  /** Mutually exclusive view states — the design draws three independent blocks, this does not. */
  readonly isLoading = computed(() => this.data.loading());
  readonly hasError = computed(() => !this.data.loading() && !!this.data.error());
  readonly isEmpty = computed(() => !this.data.loading() && !this.data.error() && this.data.total() === 0);
  readonly hasFigures = computed(() => !this.data.loading() && !this.data.error() && this.data.total() > 0);

  toggleBilateral(): void {
    this.bilateralExpanded.update(open => !open);
  }

  /**
   * A programme row opens that programme's Results tab — the one surface that lists exactly the
   * results this row counts. Same destination for the bilateral card: the tab carries an Origin
   * filter, but it takes no query param to preselect it, so preselecting is not invented here.
   */
  openProgramme(code: string): void {
    if (!code) return;
    this.router.navigate(['/result-framework-reporting', 'entity-details', code, 'results']);
  }

  navigateToResultsCenter(
    filter?: 'all' | 'w1w2' | 'bilateral',
    extra?: { status?: number | string; search?: string; category?: string; program?: string }
  ): void {
    if (filter === 'bilateral') {
      this.router.navigate(['/result-framework-reporting/bilateral-results']);
      return;
    }

    if (this.resultsListFilterSE) {
      if (filter === 'w1w2') {
        this.resultsListFilterSE.selectedFundingSource.set([{ id: 1, name: 'W1/W2' }]);
      } else {
        this.resultsListFilterSE.selectedFundingSource.set([]);
      }

      if (extra?.status) {
        const sId =
          typeof extra.status === 'number'
            ? extra.status
            : STATUS_KEY_TO_ID[extra.status] ?? Number(extra.status);
        if (!isNaN(sId)) {
          this.resultsListFilterSE.selectedStatus.set([{ status_id: sId }]);
        }
      } else {
        this.resultsListFilterSE.selectedStatus.set([]);
      }

      if (extra?.category) {
        this.resultsListFilterSE.text_to_search.set(extra.category);
      } else if (extra?.program) {
        this.resultsListFilterSE.text_to_search.set(extra.program);
      } else if (extra?.search) {
        this.resultsListFilterSE.text_to_search.set(extra.search);
      } else {
        this.resultsListFilterSE.text_to_search.set('');
      }
    }

    const queryParams: Record<string, string | number> = {};
    if (filter === 'w1w2') queryParams['funding'] = 'w1w2';
    if (extra?.status) {
      const sId =
        typeof extra.status === 'number'
          ? extra.status
          : STATUS_KEY_TO_ID[extra.status] ?? Number(extra.status);
      if (!isNaN(sId)) queryParams['status'] = sId;
    }
    if (extra?.category) queryParams['category'] = extra.category;
    if (extra?.program) queryParams['program'] = extra.program;
    if (extra?.search) queryParams['search'] = extra.search;

    this.router.navigate(['/result/results-outlet/results-list'], { queryParams });
  }

  onStatusChartClick(event: any): void {
    if (event?.name) {
      const name = String(event.name).toLowerCase();
      const match = this.statusSegments().find(
        s => s.label.toLowerCase() === name || s.key.toLowerCase() === name
      );
      if (match) {
        this.toggleStatus(match.key);
      }
    }
  }

  onCategoryOriginChartClick(event: any): void {
    if (event?.name) {
      const catName = String(event.name);
      const match = this.data.categories().find(
        c =>
          c.toLowerCase() === catName.toLowerCase() ||
          CATEGORY_SHORT_NAMES[c]?.toLowerCase() === catName.toLowerCase()
      );
      this.navigateToResultsCenter('all', { category: match || catName });
    }
  }

  onBilateralChartClick(): void {
    this.router.navigate(['/result-framework-reporting/bilateral-results']);
  }
}
