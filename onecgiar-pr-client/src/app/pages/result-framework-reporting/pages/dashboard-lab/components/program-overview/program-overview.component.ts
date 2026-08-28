import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { PrVizChartComponent, EChartsOption, VizChartTableModel } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { resolveChartTokens } from '../../../../../../shared/utils/chart-tokens.util';
import {
  heatmapOption,
  heatmapTable,
  cellLinkFromClick,
  stackedBarOption,
  barLinkFromClick,
  donutOption,
  donutTable,
  sectorLinkFromClick
} from './program-overview.charts';
import type { ECElementEvent } from 'echarts/core';

/** A matrix card's view mode (`CVT-R-1`): default `'bars'` (`CVT-A-1`), session-local, per-card. */
export type ChartViewMode = 'heatmap' | 'bars';

/**
 * Typed navigation intent for the Results tab (`OVW-R-5` emission contract). Only the defined
 * keys are present — the parent maps each one through `PROGRAMME_RESULTS_QUERY_PARAM_MAP`
 * (`programme-results-query-params.ts`) rather than this component or its consumer inventing
 * URL param names.
 */
export interface OverviewLink {
  status?: string;
  category?: string;
  origin?: string;
  center?: string;
}

/** One segment of the Reporting-status meter. `fg` doubles as the legend dot colour. */
export interface StatusSegment {
  key: string;
  label: string;
  count: number;
  bg: string;
  fg: string;
  /** Real `status_name` from the wire (or the catalogue fallback) — never the slot `label`. */
  statusName: string;
  /** `{status: statusName}` when `count > 0`, else `null` (non-navigable). */
  link: OverviewLink | null;
}

export interface AowProgressRow {
  code: string;
  name: string;
  done: number;
  total: number;
}

/** One row of a "count by category" breakdown. Colour is per CARD, not per row, so it is not here. */
export interface CategoryBar {
  name: string;
  count: number;
  link: OverviewLink | null;
}

export interface OverviewCenterBar {
  name: string;
  count: number;
  link: OverviewLink | null;
}

/**
 * A matrix for `app-pr-viz-chart`'s heatmap mode (`OVW-R-2`/`OVW-R-3`, design §3). `cells` is
 * sparse-friendly but the parent always emits one cell per `rows × cols` pair; `link: null` marks
 * a non-navigable cell (`Other` column, `Not specified` row — `OVW-DD-3`). `shownOf` is present
 * only when the parent capped the rows (top-8 centers, `OVW-R-3` "Many centers").
 */
export interface HeatmapModel {
  rows: string[];
  cols: string[];
  cells: { r: number; c: number; value: number; link: OverviewLink | null }[];
  caption: string;
  subtitle?: string;
  shownOf?: { shown: number; total: number };
}

/**
 * OVERVIEW TAB — exact layout of the approved live design
 * (`.design-snapshots/PRMS-Reporting.dc.html`, `showOverview` block).
 *
 * Grid 12-col · gap 16px · pad 32px:
 *   About this program                                              12
 *   Results by indicator category  6  +  Bilateral results by indicator category         6
 *   W1/W2 results by category and status (heatmap) 6  +  W3/Bilateral by center and category (heatmap) 6
 *   Reporting status                                                12
 *   Centers with reported W3/bilateral results     6  +  Progress by area of work         6
 *
 * Reporting pace (P2-3298), Needs attention (P2-3300) and Impact so far (P2-3299) were removed
 * on end-user request — do not reinstate them without a new ticket.
 *
 * All figures come from parent inputs (real SP / AoW / ToC / bilateral data). Empty arrays render
 * empty states — we do not invent counts.
 *
 * ⚠️ px only — `html` is 12px (UI-RULES §1.3).
 */
@Component({
  selector: 'app-program-overview',
  standalone: true,
  imports: [PrVizChartComponent],
  templateUrl: './program-overview.component.html',
  styleUrls: ['./program-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgramOverviewComponent {
  readonly programName = input<string>('');
  /** Long About copy. Empty → short stand-in using the program name. */
  readonly programDescription = input<string>('');
  readonly statusSegments = input<StatusSegment[]>([]);
  /** AoW rows already sorted ascending by completion (least complete first). */
  readonly aowProgress = input<AowProgressRow[]>([]);
  /** Cross-cutting buckets (Intermediate / 2030) under the AoW list. */
  readonly xcutProgress = input<AowProgressRow[]>([]);
  /** Own (W1/W2) results by result category, already filtered to count > 0 and sorted desc. */
  readonly categories = input<CategoryBar[]>([]);
  /** W3/Bilateral results by category, primary-role only (P2-3302). */
  readonly bilateralCategories = input<CategoryBar[]>([]);
  /** Centers with reported W3/bilateral results. */
  readonly bilateralCenters = input<OverviewCenterBar[]>([]);
  /** W1/W2 category × status matrix (`OVW-R-2`). `null`/empty `rows` → card shows its empty state. */
  readonly w12Heatmap = input<HeatmapModel | null>(null);
  /** W3/Bilateral center × category matrix (`OVW-R-3`). Same empty-state contract as above. */
  readonly bilateralHeatmap = input<HeatmapModel | null>(null);
  /**
   * `OVW-R-6` (SHOULD): wrapper loading skeleton while the parent's source signal is still
   * loading. Bound only to `w12Heatmap` — the parent has no equivalent bilateral-loading signal
   * today (design §13 open gap), so `bilateralHeatmap`'s card has no loading input to bind.
   */
  readonly w12HeatmapLoading = input<boolean>(false);

  /**
   * Typed navigation intent (`OVW-R-5`). Rows, status meter segments, legend items and heatmap
   * cells call `emitLink()` on activation; the parent (`dashboard-lab`) performs the actual
   * navigation.
   */
  readonly openResults = output<OverviewLink>();

  /** `null` (no destination — `Other`/`Not specified`/zero-count) is swallowed, never emitted. */
  emitLink(link: OverviewLink | null): void {
    if (link) this.openResults.emit(link);
  }

  /**
   * Chart-ramp tokens, resolved once per render pass. Reversed so the visualMap runs
   * `chart-4 → chart-1` (light→dark, design §6.3) — `resolveChartTokens()`'s own order is
   * `chart-1 → chart-4`.
   */
  private readonly heatmapRamp = computed(() => [...resolveChartTokens().ramp].reverse());

  /**
   * Bar-end row-total label color (`CVT-A-2`) — the existing `--pr-text-secondary` token,
   * resolved once per render pass alongside `heatmapRamp`. Never a hex literal.
   */
  private readonly totalLabelColor = computed(() => resolveChartTokens().textSecondary);

  /**
   * Per-card view mode (`CVT-R-1`/`CVT-DD-1`): independent, session-local. **Amendment `CVT-A-1`**
   * (owner, CVT-T-3 HITL gate): default is now `'bars'` on both cards — supersedes the original
   * `'heatmap'` default; the toggle switches to heatmap. Owned here (not the parent) because it is
   * a pure view preference over data the parent already supplies — the parent owns data/links,
   * this component owns geometry.
   */
  readonly w12ViewMode = signal<ChartViewMode>('bars');
  readonly bilateralViewMode = signal<ChartViewMode>('bars');

  setW12ViewMode(mode: ChartViewMode): void {
    this.w12ViewMode.set(mode);
  }

  setBilateralViewMode(mode: ChartViewMode): void {
    this.bilateralViewMode.set(mode);
  }

  /** Mode-aware options (`CVT-DD-2`): one host per card, the computed swaps builders on toggle. */
  readonly w12ChartOption = computed<EChartsOption | null>(() => {
    const model = this.w12Heatmap();
    if (!model || !model.rows.length) return null;
    return this.w12ViewMode() === 'bars'
      ? stackedBarOption(model, this.heatmapRamp(), this.totalLabelColor())
      : heatmapOption(model, this.heatmapRamp());
  });

  readonly w12HeatmapTable = computed<VizChartTableModel | null>(() => {
    const model = this.w12Heatmap();
    return model && model.rows.length ? heatmapTable(model) : null;
  });

  readonly bilateralChartOption = computed<EChartsOption | null>(() => {
    const model = this.bilateralHeatmap();
    if (!model || !model.rows.length) return null;
    return this.bilateralViewMode() === 'bars'
      ? stackedBarOption(model, this.heatmapRamp(), this.totalLabelColor())
      : heatmapOption(model, this.heatmapRamp());
  });

  readonly bilateralHeatmapTable = computed<VizChartTableModel | null>(() => {
    const model = this.bilateralHeatmap();
    return model && model.rows.length ? heatmapTable(model) : null;
  });

  /**
   * Resolves the clicked cell/segment back to its `OverviewLink` and emits (or swallows a
   * `null`) — the mode decides which resolver reads the event (`CVT-R-3` parity).
   */
  onW12HeatmapClick(event: ECElementEvent): void {
    const model = this.w12Heatmap();
    if (!model) return;
    const link = this.w12ViewMode() === 'bars' ? barLinkFromClick(event, model) : cellLinkFromClick(event, model);
    this.emitLink(link);
  }

  onBilateralHeatmapClick(event: ECElementEvent): void {
    const model = this.bilateralHeatmap();
    if (!model) return;
    const link = this.bilateralViewMode() === 'bars' ? barLinkFromClick(event, model) : cellLinkFromClick(event, model);
    this.emitLink(link);
  }

  /**
   * Status tokens, resolved once per render pass (`OVW-R-4`/`OVW-DD-5`) — the donut's documented
   * exception to the "status colours are not chart colours" fence. jsdom resolves every entry to
   * `''`; real browsers resolve the `--pr-status-*-fg/bg` pairs.
   */
  /** Violet sector palette for the donut (quick/donut-violet-scale): ramp + the two extra
   * violets — six distinct steps for up to six sectors, all from approved chart tokens. */
  private readonly donutPalette = computed(() => {
    const tokens = resolveChartTokens();
    return [...tokens.ramp, tokens.bilateralMuted, tokens.primaryStrong];
  });

  readonly donutOption = computed<EChartsOption>(() => donutOption(this.statusSegments(), this.donutPalette()));

  readonly donutTable = computed<VizChartTableModel>(() => donutTable(this.statusSegments()));

  /** Resolves the clicked sector back to its `OverviewLink` and emits (or swallows a `null`). */
  onDonutClick(event: ECElementEvent): void {
    this.emitLink(sectorLinkFromClick(event, this.statusSegments()));
  }

  readonly description = computed(() => {
    const explicit = this.programDescription()?.trim();
    if (explicit) return explicit;
    const name = this.programName()?.trim() || 'This program';
    return (
      `${name} modernizes CGIAR and national breeding programs so that farmers get climate-resilient, ` +
      `market-preferred varieties faster. The program connects market intelligence, breeding pipelines, ` +
      `trait discovery, genetic innovation and seed systems into one delivery chain, and works with national ` +
      `agricultural research systems and private seed partners across South Asia, sub-Saharan Africa and ` +
      `Latin America. Reporting covers products delivered to partners, the outcomes those products enable, ` +
      `and progress toward the 2030 outcomes agreed with donors.`
    );
  });

  readonly statusTotal = computed(() => this.statusSegments().reduce((sum, s) => sum + s.count, 0));

  readonly bilateralCentersMax = computed(() => {
    const rows = this.bilateralCenters();
    return rows.length ? Math.max(...rows.map(r => r.count)) : 0;
  });

  segmentWidth(segment: StatusSegment): number {
    const total = this.statusTotal();
    return total ? (segment.count / total) * 100 : 0;
  }

  /**
   * The reference only prints the count inside segments wider than 8% (`showN` in the mockup).
   * Without this two narrow neighbours overlap and render their numbers on top of each other.
   */
  showsSegmentCount(segment: StatusSegment): boolean {
    return this.segmentWidth(segment) > 8;
  }

  percentOf(row: AowProgressRow): number {
    return row.total ? Math.round((row.done / row.total) * 100) : 0;
  }

  private readonly categoriesMax = computed(() => Math.max(...this.categories().map(c => c.count), 1));

  private readonly bilateralCategoriesMax = computed(() => Math.max(...this.bilateralCategories().map(c => c.count), 1));

  /**
   * Bar width as a share of the LARGEST bar in its own series, so the biggest category fills the
   * track and the ranking reads at a glance. Each card normalises against its own maximum — the
   * own-results and bilateral cards are two separate scales, not one shared one.
   *
   * The `Math.max(..., 1)` in the denominator is what keeps an all-zero (or empty) series at 0%
   * instead of `NaN`.
   */
  categoryWidth(bar: CategoryBar): number {
    return (bar.count / this.categoriesMax()) * 100;
  }

  bilateralCategoryWidth(bar: CategoryBar): number {
    return (bar.count / this.bilateralCategoriesMax()) * 100;
  }

  centerWidth(bar: OverviewCenterBar): number {
    const max = this.bilateralCentersMax();
    return max ? (bar.count / max) * 100 : 0;
  }
}
