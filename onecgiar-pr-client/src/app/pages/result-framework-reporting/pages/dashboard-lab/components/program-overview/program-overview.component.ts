import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';
import { NgClass } from '@angular/common';
import { PrVizChartComponent, EChartsOption, VizChartTableModel } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { resolveChartTokens } from '../../../../../../shared/utils/chart-tokens.util';
import {
  heatmapOption,
  heatmapTable,
  cellLinkFromClick,
  stackedBarOption,
  stackedBarVerticalOption,
  barLinkFromClick,
  singleBarOption,
  singleBarTable,
  singleBarLinkFromClick,
  radarOption,
  radarTable,
  radarLinkFromClick,
  donutOption,
  donutTable,
  sectorLinkFromClick,
  tocMapOption,
  tocMapTable,
  tocMapAowFromClick,
  computeReportingTrendModel,
  reportingTrendOption,
  reportingTrendTable,
  ReportingTrendModel
} from './program-overview.charts';
import type { TocMapModel } from '../../dashboard-lab.toc-map';
// @akili-spec changes/overview-aow-progress-hero — the host exports this interface (design.md §3).
import type { OverviewAowProgressRowRich } from '../../dashboard-lab.component';
import type { ECElementEvent } from 'echarts/core';
// @akili-spec changes/reporting-entry-hub — reuse the hub's centralised copy for the Report button's tooltip text.
import { HUB_COPY } from '../reporting-entry-hub/hub-copy';

/** A matrix card's view mode: default 'vertical-bar', then 'horizontal-bar', then 'heatmap'. */
export type ChartViewMode = 'vertical-bar' | 'horizontal-bar' | 'heatmap';

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
  phase?: string;
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

export type OverviewSection = 'all' | 'w1w2' | 'bilateral' | 'aow';

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
import { PrTabIntroComponent } from '../../../../../../shared/components/pr-tab-intro/pr-tab-intro.component';

@Component({
  selector: 'app-program-overview',
  standalone: true,
  imports: [NgClass, PrVizChartComponent, PrTooltipDirectiveModule, PrTabIntroComponent],
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

  /**
   * Rich per-AoW rows for the promoted hero section (`changes/overview-aow-progress-hero`,
   * design.md §3/§6). Feeds the summary rail (`richStats` below — the rail's OWN sum of these
   * rows, OAH-R-1 "internal coherence") and, for now, the pre-existing row markup (the segmented-
   * bar row anatomy is OAH-T-4's rebuild — this task keeps the existing row fed from the rich
   * rows' `code`/`name`/`reported`/`total`). The thin `aowProgress`/`xcutProgress` inputs above
   * stay UNTOUCHED (design DD-4) — they keep feeding KPI card 4, the section-tab badge and
   * `aowStats`; their numbers do not move.
   * @akili-spec changes/overview-aow-progress-hero
   */
  readonly richRows = input<OverviewAowProgressRowRich[]>([]);
  /**
   * True while any AoW's ToC is still loading — bound by the host to its existing `loadingAows()`
   * (OAH-R-6 `!toc` reuse, design B-16: no new aggregate). Gates the rail figures and the row list
   * behind pulse skeletons so no partial sum is ever painted (OAH-R-1/R-6 BUT).
   * @akili-spec changes/overview-aow-progress-hero
   */
  readonly richLoading = input<boolean>(false);
  /**
   * OAH-R-1 "Continue reporting" CTA. This component only emits the intent — the actual
   * `setOnlyPending(true)` + router navigation lives in the HOST's `continueReporting()`
   * (design.md §3, C-1: Overview/Reporting are separate routes, so the navigation must survive
   * this component being destroyed).
   * @akili-spec changes/overview-aow-progress-hero
   */
  readonly continueReporting = output<void>();
  /** W3/Bilateral results by category, primary-role only (P2-3302). */
  readonly bilateralCategories = input<CategoryBar[]>([]);
  /** W3/Bilateral results reporting status segments. */
  readonly bilateralStatusSegments = input<StatusSegment[]>([]);
  /** Centers with reported W3/bilateral results. */
  readonly bilateralCenters = input<OverviewCenterBar[]>([]);
  /** W1/W2 category × status matrix (`OVW-R-2`). `null`/empty `rows` → card shows its empty state. */
  readonly w12Heatmap = input<HeatmapModel | null>(null);
  /** W3/Bilateral center × category matrix (`OVW-R-3`). Same empty-state contract as above. */
  readonly bilateralHeatmap = input<HeatmapModel | null>(null);
  /**
   * `OVW-R-6` (SHOULD): wrapper loading skeleton while the parent's source signal is still
   * loading.
   */
  readonly w12HeatmapLoading = input<boolean>(false);
  /**
   * `changes/overview-phase-filter` OPF-T-4 (Leader remediation, OPF-R-2 "AND IT MUST show a
   * loading state on each card"): wrapper loading skeleton for the "Reporting status" (W1/W2
   * meter) card, while an explicit phase selection's meter overlay fetch is in flight. Same shape
   * as `w12HeatmapLoading` above.
   */
  readonly meterLoading = input<boolean>(false);
  /**
   * Same contract as `meterLoading`, for the W3/Bilateral cards (reporting status donut,
   * categories radar, and center × category heatmap) — closes the gap `w12HeatmapLoading`'s
   * docstring used to record here ("the parent has no equivalent bilateral-loading signal today").
   */
  readonly bilateralLoading = input<boolean>(false);

  // @akili-spec changes/reporting-entry-hub
  /** REH-R-8: whether the current user can report W1/W2 results — gates the inline Report
   * button on each "Progress by area of work" row (disabled + tooltip when false). */
  readonly canReportW1W2 = input<boolean>(true);

  /** Reuses `ReportingEntryHubComponent`'s centralised copy for the Report button's tooltip. */
  // @akili-spec changes/reporting-entry-hub
  readonly copy = HUB_COPY;

  /**
   * Theory-of-Change map model (`changes/overview-toc-map`, TCM-T-3) — built by the parent's
   * `overviewTocMap` computed (`buildTocMapModel`, TCM-T-1) from the SAME `tocByKey`/units data the
   * rest of this Overview already renders. `null` → the card's empty state (no chart, no throw —
   * TCM-R-2's "Empty program" scenario) UNLESS `tocMapLoading` is true, in which case the wrapper's
   * loading state shows instead (TCM-R-1).
   */
  readonly tocMap = input<TocMapModel | null>(null);
  /** True while any ToC bucket the map needs is still in flight for the current SP (TCM-R-1). */
  readonly tocMapLoading = input<boolean>(false);

  /** Individual result rows for computing reporting trend / velocity */
  readonly programResults = input<any[]>([]);
  /** Active cycle year (e.g. 2026) */
  readonly cycleYear = input<number>(new Date().getFullYear());

  /**
   * Typed navigation intent (`OVW-R-5`). Rows, status meter segments, legend items and heatmap
   * cells call `emitLink()` on activation; the parent (`dashboard-lab`) performs the actual
   * navigation.
   */
  readonly openResults = output<OverviewLink>();

  /**
   * `TCM-R-5`: emits ONLY when the click resolves to an AoW node's code — `tocMapAowFromClick`
   * already returns `null` for the SP root, every leaf, and the program-level branches, so this
   * output is the single non-null gate the parent (`dashboard-lab`) can trust for navigation.
   */
  readonly openAow = output<string>();

  /**
   * `REH-R-7`: emitted with `'w3'` by KPI cards 2 ("W3 / Bilateral") and 3 ("Contributing
   * Centers"), in addition to their existing `setActiveSection('bilateral')` — the host
   * (`DashboardLabComponent`) scrolls the reporting-entry-hub's W3 lane into view and focuses it.
   */
  // @akili-spec changes/reporting-entry-hub
  readonly focusHub = output<'w3'>();

  /** `null` (no destination — `Other`/`Not specified`/zero-count) is swallowed, never emitted. */
  emitLink(link: OverviewLink | null): void {
    if (link) this.openResults.emit(link);
  }

  /** Active section filter: 'all' | 'w1w2' | 'bilateral' | 'aow' */
  readonly activeSection = signal<OverviewSection>('all');

  setActiveSection(section: OverviewSection): void {
    this.activeSection.set(this.activeSection() === section && section !== 'all' ? 'all' : section);
  }

  readonly aowStats = computed(() => {
    const rows = this.aowProgress();
    const totalPlanned = rows.reduce((sum, r) => sum + r.total, 0);
    const totalDone = rows.reduce((sum, r) => sum + r.done, 0);
    const pct = totalPlanned ? Math.round((totalDone / totalPlanned) * 100) : 0;
    return { totalPlanned, totalDone, pct, count: rows.length };
  });

  /**
   * Rail figures — the SUM of the hero's own `richRows` (OAH-R-1 "internal coherence" scenario:
   * same derivation site as the rows themselves, never a different source — the requirement's
   * single-home rule). `pct` rounds `reported/total` the same way `aowStats.pct` above does.
   * @akili-spec changes/overview-aow-progress-hero
   */
  readonly richStats = computed(() => {
    const rows = this.richRows();
    const complete = rows.reduce((sum, r) => sum + r.complete, 0);
    const inProgress = rows.reduce((sum, r) => sum + r.inProgress, 0);
    const notStarted = rows.reduce((sum, r) => sum + r.notStarted, 0);
    const zeroTarget = rows.reduce((sum, r) => sum + r.zeroTarget, 0);
    const total = rows.reduce((sum, r) => sum + r.total, 0);
    const reported = complete + inProgress;
    const pct = total ? Math.round((reported / total) * 100) : 0;
    return { complete, inProgress, notStarted, zeroTarget, total, reported, pct };
  });

  /** Rail `title` disclosure for the zero-target exclusion (OAH-R-1) — `null` omits the attribute. */
  readonly zeroTargetTitle = computed(() => {
    const n = this.richStats().zeroTarget;
    return n > 0 ? `excludes ${n} zero-target KPIs` : null;
  });

  /** SVG ring geometry — `r=40` circle (mockup's dasharray/dashoffset pair, design.md §6). */
  readonly ringCircumference = 2 * Math.PI * 40;
  readonly ringDashoffset = computed(() => this.ringCircumference * (1 - this.richStats().pct / 100));

  /** Stable placeholder arrays for the skeleton `@for` loops (fixed identity across renders). */
  readonly skeletonRowPlaceholders = [0, 1, 2];
  readonly skeletonSplitPlaceholders = [0, 1, 2];

  /**
   * Row percent from the rich counts (`reported/total`) — feeds the pre-existing row's bar/percent
   * badge until OAH-T-4 replaces them with the segmented-bar anatomy.
   * @akili-spec changes/overview-aow-progress-hero
   */
  percentOfRich(row: OverviewAowProgressRowRich): number {
    return row.total ? Math.round((row.reported / row.total) * 100) : 0;
  }

  readonly contributingCentersCount = computed(() => {
    const centers = this.bilateralCenters();
    return centers.filter(c => c.name !== 'Not specified').length || centers.length;
  });

  readonly w1w2SubmittedCount = computed(() =>
    this.statusSegments().find(s => s.key === 'submitted')?.count ?? 0
  );

  readonly bilateralApprovedCount = computed(() =>
    this.bilateralStatusSegments().find(s => s.key === 'approved')?.count ?? 0
  );

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
  readonly w12ViewMode = signal<ChartViewMode>('horizontal-bar');
  readonly bilateralViewMode = signal<ChartViewMode>('horizontal-bar');

  setW12ViewMode(mode: ChartViewMode): void {
    this.w12ViewMode.set(mode);
  }

  setBilateralViewMode(mode: ChartViewMode): void {
    this.bilateralViewMode.set(mode);
  }

  /** Mode-aware options: vertical bar (default), horizontal bar, or heatmap. */
  readonly w12ChartOption = computed<EChartsOption | null>(() => {
    const model = this.w12Heatmap();
    if (!model || !model.rows.length) return null;
    const mode = this.w12ViewMode();
    if (mode === 'vertical-bar') {
      return stackedBarVerticalOption(model, this.heatmapRamp(), this.totalLabelColor());
    } else if (mode === 'horizontal-bar') {
      return stackedBarOption(model, this.heatmapRamp(), this.totalLabelColor());
    } else {
      return heatmapOption(model, this.heatmapRamp());
    }
  });

  readonly w12HeatmapTable = computed<VizChartTableModel | null>(() => {
    const model = this.w12Heatmap();
    return model && model.rows.length ? heatmapTable(model) : null;
  });

  readonly bilateralChartOption = computed<EChartsOption | null>(() => {
    const model = this.bilateralHeatmap();
    if (!model || !model.rows.length) return null;
    const mode = this.bilateralViewMode();
    if (mode === 'vertical-bar') {
      return stackedBarVerticalOption(model, this.heatmapRamp(), this.totalLabelColor());
    } else if (mode === 'horizontal-bar') {
      return stackedBarOption(model, this.heatmapRamp(), this.totalLabelColor());
    } else {
      return heatmapOption(model, this.heatmapRamp());
    }
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
    const link = this.w12ViewMode() === 'heatmap' ? cellLinkFromClick(event, model) : barLinkFromClick(event, model);
    this.emitLink(link);
  }

  onBilateralHeatmapClick(event: ECElementEvent): void {
    const model = this.bilateralHeatmap();
    if (!model) return;
    const link = this.bilateralViewMode() === 'heatmap' ? cellLinkFromClick(event, model) : barLinkFromClick(event, model);
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

  readonly reportingTrendModel = computed<ReportingTrendModel>(() =>
    computeReportingTrendModel(this.programResults(), this.cycleYear(), this.statusTotal())
  );

  readonly reportingTrendChartOption = computed<EChartsOption>(() =>
    reportingTrendOption(this.reportingTrendModel(), this.totalLabelColor())
  );

  readonly reportingTrendTable = computed<VizChartTableModel>(() =>
    reportingTrendTable(this.reportingTrendModel())
  );

  segmentPercent(segment: StatusSegment): number {
    const total = this.statusTotal();
    return total ? Math.round((segment.count / total) * 100) : 0;
  }

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

  readonly bilateralDonutOption = computed<EChartsOption>(() =>
    donutOption(this.bilateralStatusSegments(), this.donutPalette())
  );

  readonly bilateralDonutTable = computed<VizChartTableModel>(() =>
    donutTable(this.bilateralStatusSegments())
  );

  onBilateralDonutClick(event: ECElementEvent): void {
    this.emitLink(sectorLinkFromClick(event, this.bilateralStatusSegments()));
  }

  readonly bilateralStatusTotal = computed(() =>
    this.bilateralStatusSegments().reduce((sum, s) => sum + s.count, 0)
  );

  bilateralSegmentWidth(segment: StatusSegment): number {
    const total = this.bilateralStatusTotal();
    return total ? (segment.count / total) * 100 : 0;
  }

  showsBilateralSegmentCount(segment: StatusSegment): boolean {
    return this.bilateralSegmentWidth(segment) > 8;
  }

  bilateralSegmentPercent(segment: StatusSegment): number {
    const total = this.bilateralStatusTotal();
    return total ? Math.round((segment.count / total) * 100) : 0;
  }

  readonly bilateralApprovedPercent = computed(() => {
    const total = this.bilateralStatusTotal();
    if (!total) return 0;
    const approved = this.bilateralStatusSegments().find(s => s.key === 'approved')?.count ?? 0;
    return Math.round((approved / total) * 100);
  });

  percentOf(row: AowProgressRow): number {
    return row.total ? Math.round((row.done / row.total) * 100) : 0;
  }

  /**
   * `REH-R-7`/`REH-AC-15`: the row's inline Report button. Stops propagation so the row's own
   * `(click)="openAow.emit(row.code)"` does not ALSO fire — otherwise every click emits twice.
   * Typed to the minimal shape both `AowProgressRow` and `OverviewAowProgressRowRich` satisfy
   * (`changes/overview-aow-progress-hero` OAH-T-3: the hero row now iterates `richRows`).
   */
  // @akili-spec changes/reporting-entry-hub
  onReportAowRow(row: { code: string }, event: Event): void {
    event.stopPropagation();
    if (!this.canReportW1W2()) return;
    if (row.code) this.openAow.emit(row.code);
  }

  /**
   * `--pr-chart-2-muted` resolved once per render pass — the "W3/Bilateral results by indicator
   * category" card's bar fill (`CVT-A-5`), the same token its old DOM bar used
   * (`bg-[var(--pr-chart-2-muted)]`) — meaning preserved, only the rendering technology changed.
   */
  private readonly bilateralCategoriesColor = computed(() => resolveChartTokens().bilateralMuted);

  /**
   * `--pr-chart-2` resolved once per render pass — the "Centers with reported W3/bilateral
   * results" card's bar fill (`CVT-A-5`), the same token its old DOM bar used
   * (`bg-[var(--pr-chart-2)]`). `resolveChartTokens().ramp` is `[chart-1, chart-2, chart-3,
   * chart-4]` (unreversed, unlike `heatmapRamp`), so index 1 is `--pr-chart-2`.
   */
  private readonly bilateralCentersColor = computed(() => resolveChartTokens().ramp[1] ?? '');

  /** Row-count-driven height (`CVT-DD-9`): a 160px floor, then ~36px/row (the old DOM row height). */
  private barCardHeight(rowCount: number): string {
    return `${Math.max(160, rowCount * 36)}px`;
  }

  readonly bilateralCategoriesOption = computed<EChartsOption | null>(() => {
    const bars = this.bilateralCategories();
    return bars.length ? radarOption(bars, this.bilateralCategoriesColor(), this.totalLabelColor()) : null;
  });

  readonly bilateralCategoriesTable = computed<VizChartTableModel | null>(() => {
    const bars = this.bilateralCategories();
    return bars.length ? radarTable('W3/Bilateral results by indicator category', bars) : null;
  });

  readonly bilateralCategoriesHeight = computed(() => '320px');

  /** Resolves the clicked row back to its `OverviewLink` and emits (or swallows a `null`). */
  onBilateralCategoriesClick(event: ECElementEvent): void {
    this.emitLink(radarLinkFromClick(event, this.bilateralCategories()));
  }

  readonly bilateralCentersOption = computed<EChartsOption | null>(() => {
    const bars = this.bilateralCenters();
    return bars.length ? singleBarOption(bars, this.bilateralCentersColor(), this.totalLabelColor()) : null;
  });

  readonly bilateralCentersTable = computed<VizChartTableModel | null>(() => {
    const bars = this.bilateralCenters();
    return bars.length ? singleBarTable('Centers with reported W3/bilateral results', bars) : null;
  });

  readonly bilateralCentersHeight = computed(() => this.barCardHeight(this.bilateralCenters().length));

  onBilateralCentersClick(event: ECElementEvent): void {
    this.emitLink(singleBarLinkFromClick(event, this.bilateralCenters()));
  }

  /**
   * `null`-safe by construction (TCM-T-2 Reviewer forward pointer): `tocMapOption`/`tocMapTable`
   * (the pure builders) take a non-nullable `TocMapModel` — `buildTocMapModel` returns
   * `TocMapModel | null`, so THESE computeds are the only guard between that `null` and the
   * builders. `resolveChartTokens()` is called here (the component), never from the pure
   * `program-overview.charts.ts` file — same fence every other card in this component follows.
   */
  readonly tocMapOption = computed<EChartsOption | null>(() => {
    const model = this.tocMap();
    return model ? tocMapOption(model, resolveChartTokens()) : null;
  });

  readonly tocMapTable = computed<VizChartTableModel | null>(() => {
    const model = this.tocMap();
    return model ? tocMapTable(model) : null;
  });

  /** Resolves the click to an AoW code and emits `openAow` ONLY on a non-null result (`TCM-R-5`). */
  onTocMapClick(event: ECElementEvent): void {
    const model = this.tocMap();
    if (!model) return;
    const code = tocMapAowFromClick(event, model);
    if (code) this.openAow.emit(code);
  }
}
