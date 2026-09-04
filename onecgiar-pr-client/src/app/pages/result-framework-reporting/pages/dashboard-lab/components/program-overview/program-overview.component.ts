import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, model, output, signal, viewChild } from '@angular/core';
import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';
import { NgClass } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideInfo } from '@ng-icons/lucide';
import { HlmPopover, HlmPopoverContent, HlmPopoverPortal } from '@spartan/popover';
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
// @akili-spec changes/overview-aow-cross-filter — `OverviewScopeOption`, the scope control's option
// shape; `OverviewScopeBreakdown`, the unfiltered per-scope breakdown (`OSF-T-7`).
import type { OverviewAowProgressRowRich, OverviewScopeOption, OverviewScopeBreakdown } from '../../dashboard-lab.component';
import type { ECElementEvent } from 'echarts/core';
// @akili-spec changes/reporting-entry-hub — reuse the hub's centralised copy for the Report button's tooltip text.
import { HUB_COPY } from '../reporting-entry-hub/hub-copy';
import { SCIENCE_PROGRAM_DESCRIPTIONS } from '../reporting-program-band/reporting-program-band.component';

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
  /**
   * How many KPIs the zero-target rule (MRF-R-7) excluded from `total` on this row — the number the
   * `excludes N zero-target KPIs` disclosure states (KCR-R-2.1). Optional: a caller that has no
   * figure to disclose simply omits it, and `0`/absent means the denominator hid nothing.
   * @akili-spec bugfix/kpi-count-reconciliation
   */
  zeroTarget?: number;
  /**
   * P2-3296 AC3 — the ToC achievement of this Area of Work, computed server-side.
   *
   * Distinct from `done` / `total`, which count how many KPIs have SOMETHING reported. Both are
   * shown: "how much of the plan has been touched" and "how far it got against the targets" are
   * different questions and one is not a substitute for the other.
   *
   * Absent until the roll-up call lands, and `progress_percentage` is null when nothing was
   * measurable — render a dash, never 0%.
   */
  achievement?: TocAchievement | null;
}

/** P2-3296 — the roll-up contract, identical at indicator, HLO, AoW and Science Program level. */
export interface TocAchievement {
  progress_percentage: string | null;
  preliminary_progress_percentage: string | null;
  progress_value: number | null;
  preliminary_value: number | null;
  counted: number;
  total: number;
  indicators_counted: number;
  indicators_total: number;
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
 * Short, user-facing scope codes (`OSF-T-14`, mockup `Main.dc.html`'s own `data()`) for the two
 * outcome buckets and the untagged bucket — their raw keys (`INTERMEDIATE`/`EOI_2030`/`UNTAGGED`)
 * are internal enum values, not codes a user recognises (`OSF-T-11`'s finding). AoW keys ARE
 * already user-facing codes (`AOW01`…) and pass through unchanged.
 */
const SCOPE_DISPLAY_CODE: Readonly<Record<string, string>> = {
  INTERMEDIATE: 'INT',
  EOI_2030: '2030',
  UNTAGGED: '—'
};

/**
 * Single-homed short-code mapping (`OSF-DD-6` discipline, applied here per `OSF-T-14`) — the
 * breakdown row's code cell AND `scopeTriggerCode()` both call this, so the row and the trigger
 * chip can never drift apart the way `execution.md` §17 recorded (`scopeTriggerCode()` used to
 * return the raw key, painting `INTERMEDIATE` at 900–1099px).
 *
 * DISPLAY ONLY: `row.key` / `selectScope(row.key)` / `PROGRAMME_RESULTS_QUERY_PARAM_MAP` / the
 * `?scope=` value all keep using the RAW key — nothing here ever substitutes for it.
 * @akili-spec changes/overview-aow-cross-filter
 */
export function overviewScopeDisplayCode(option: Pick<OverviewScopeOption, 'key' | 'kind'>): string {
  return option.kind === 'aow' ? option.key : (SCOPE_DISPLAY_CODE[option.key] ?? option.key);
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
  imports: [
    NgClass,
    PrVizChartComponent,
    PrTooltipDirectiveModule,
    NgIcon,
    HlmPopover,
    HlmPopoverContent,
    HlmPopoverPortal
  ],
  providers: [provideIcons({ lucideChevronDown, lucideInfo })],
  templateUrl: './program-overview.component.html',
  styleUrls: ['./program-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgramOverviewComponent {
  readonly programCode = input<string>('');
  readonly programName = input<string>('');
  /** Long About copy. Empty → short stand-in using the program name. */
  readonly programDescription = input<string>('');
  readonly statusSegments = input<StatusSegment[]>([]);
  /** AoW rows already sorted ascending by completion (least complete first). */
  readonly aowProgress = input<AowProgressRow[]>([]);

  /**
   * P2-3296 AC4 — the Science Program's own ToC achievement, averaged over its Areas of Work.
   * Null until the roll-up call lands, or when nothing in the program was measurable.
   */
  readonly programAchievement = input<TocAchievement | null>(null);
  /** Cross-cutting buckets (Intermediate / 2030) under the AoW list. */
  readonly xcutProgress = input<AowProgressRow[]>([]);

  /**
   * Rich per-AoW rows for the promoted hero section (`changes/overview-aow-progress-hero`,
   * design.md §3/§6). Feeds the summary rail (`richStats` below — the rail's OWN sum of these
   * rows, OAH-R-1 "internal coherence") and, for now, the pre-existing row markup (the segmented-
   * bar row anatomy is OAH-T-4's rebuild — this task keeps the existing row fed from the rich
   * rows' `code`/`name`/`reported`/`total`).
   *
   * ⚠️ OAH DD-4's "the thin `aowProgress`/`xcutProgress` inputs stay UNTOUCHED — their numbers do
   * not move" is SUPERSEDED by `bugfix/kpi-count-reconciliation` (KCR-DD-2, KCR-R-2/R-5). The host
   * now builds all three inputs from one `programKpiPartition()`: the thin rows carry the same
   * AoW-own basis and the same zero-target rule as `richRows`, so KPI card 4, the section-tab badge
   * (`aowStats`) and the chips agree with the rail instead of standing at a disclosed divergence.
   * The rail is still Σ `richRows` and still sums AoW rows ONLY — program-level KPIs are the chips
   * beneath it (KCR-R-3) — so `band = rail + chips`, not `band = rail`.
   * @akili-spec changes/overview-aow-progress-hero
   * @akili-spec bugfix/kpi-count-reconciliation
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

  /** When true, the inline filter bar is omitted because filters are handled in the top bar. */
  readonly hideInlineFilters = input<boolean>(false);

  /** Active section filter: 'all' | 'w1w2' | 'bilateral' | 'aow' */
  readonly activeSection = model<OverviewSection>('all');

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
   * Row percent from the rich counts (`reported/total`) — feeds the mono `reported/total · N%`
   * figure (design.md §6 "Mono figures"). Rounded ONLY for that display; the segmented-bar
   * SEGMENT WIDTHS below are never derived from this rounded value (OAH-R-3 "never
   * percent-of-percent").
   * @akili-spec changes/overview-aow-progress-hero
   */
  percentOfRich(row: OverviewAowProgressRowRich): number {
    return row.total ? Math.round((row.reported / row.total) * 100) : 0;
  }

  /**
   * Segmented-bar segment widths (OAH-T-4, design.md §6 "Segmented bar") — each is `count/total*100`
   * computed HERE from the raw KPI counts, never from a rounded percent (OAH-R-3 "honest at 1%":
   * a `target=137, complete=1` fixture must paint ≈0.73%, not the rounded 1% `percentOfRich` would
   * give). Bound directly via `[style.width.%]` — never re-derived in the template.
   * @akili-spec changes/overview-aow-progress-hero
   */
  completeSegmentWidth(row: OverviewAowProgressRowRich): number {
    return row.total ? (row.complete / row.total) * 100 : 0;
  }

  inProgressSegmentWidth(row: OverviewAowProgressRowRich): number {
    return row.total ? (row.inProgress / row.total) * 100 : 0;
  }

  /**
   * Text alternative for the segmented bar (OAH-N-1) and its `title` disclosure (OAH-R-3): the
   * three glossary counts, plus the zero-target exclusion note when any KPI was excluded.
   * @akili-spec changes/overview-aow-progress-hero
   */
  rowBarTitle(row: OverviewAowProgressRowRich): string {
    const base = `${row.complete} Complete, ${row.inProgress} In progress, ${row.notStarted} Not started`;
    return row.zeroTarget > 0 ? `${base}, excludes ${row.zeroTarget} zero-target KPIs` : base;
  }

  /** `true` once a row has reported every counted KPI (OAH-R-4 complete swap). */
  isRowComplete(row: OverviewAowProgressRowRich): boolean {
    return row.total > 0 && row.remaining === 0;
  }

  /**
   * The row's `N KPIs remaining` subline (OAH-R-3), or the quiet complete copy (OAH-R-4,
   * `RowStates.dc.html` "Complete" block) once nothing remains.
   * @akili-spec changes/overview-aow-progress-hero
   */
  rowSubline(row: OverviewAowProgressRowRich): string {
    return this.isRowComplete(row) ? 'All planned KPIs reported' : `${row.remaining} KPIs remaining`;
  }

  /**
   * Accessible-name PREFIX for the AoW identity button (`RGS-R-3`, `RGS-T-1`), rendered as a
   * `.sr-only` span that COMPOSES with the button's own visible content (code + name + subline) —
   * deliberately NOT `[attr.aria-label]`, which would REPLACE that content and silently drop the
   * "N KPIs remaining" subline from the accessible name (WCAG 2.5.3 name-in-name; Reviewer finding,
   * rework attempt 2). Same house pattern already established at `:291` for the scope trigger.
   * Describes FILTERING — deliberately never "open", which is what the separate `→` action already
   * announces (`aria-label="Open this Area of Work"` a few lines down). The click→`selectScope`
   * wiring lives in `onSelectAowRow` below (`RGS-T-2`); this constant is structural/a11y only.
   * @akili-spec changes/aow-row-gesture-split
   */
  readonly aowFilterVerb = 'Filter by Area of Work';

  /**
   * `RGS-T-2` (`RGS-DD-1`, `RGS-DD-2`, `RGS-R-1`): the identity button's own gesture — the SAME
   * `selectScope`/`scopeChange` path the row-level mouse convenience below it also calls, so the
   * filter is reachable identically by mouse or keyboard (`RGS-R-3`). Stops propagation so a click
   * here does not ALSO bubble into the row's own `(click)` and double-fire `selectScope` —
   * harmless either way per `RGS-DD-2` (re-emitting the same key is idempotent, and `selectScope`
   * is never a toggle, so this is also how `RGS-DD-6`'s "already-selected row does nothing" holds),
   * but there is no reason to rely on that. Never touches `PROGRAMME_RESULTS_QUERY_PARAM_MAP` /
   * `OverviewLink` / the `?scope=` value shape — `selectScope` already owns that contract,
   * untouched by this task.
   * @akili-spec changes/aow-row-gesture-split
   */
  onSelectAowRow(row: { code: string }, event: Event): void {
    event.stopPropagation();
    if (row.code) this.selectScope(row.code);
  }

  /**
   * The row's open icon + (once complete) "View results" button: same single navigation path as
   * `onReportAowRow` (`openAow`, OAH-R-4/DD-6) but with NO permission gate — `canReportW1W2` only
   * fences the reporting action, never plain navigation. Stops propagation so the row's own
   * `(click)="selectScope(row.code)"` (`RGS-T-2`) does not ALSO fire — this action must navigate,
   * and ONLY navigate (`RGS-R-2`).
   * @akili-spec changes/overview-aow-progress-hero
   */
  onOpenAowRowAction(row: { code: string }, event: Event): void {
    event.stopPropagation();
    if (row.code) this.openAow.emit(row.code);
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
    const code = this.programCode()?.trim().toUpperCase();
    if (code && SCIENCE_PROGRAM_DESCRIPTIONS[code]) {
      return SCIENCE_PROGRAM_DESCRIPTIONS[code];
    }
    const name = this.programName()?.trim();
    if (name) {
      const normalized = name.toLowerCase();
      for (const [, desc] of Object.entries(SCIENCE_PROGRAM_DESCRIPTIONS)) {
        if (desc.toLowerCase().startsWith(normalized)) {
          return desc;
        }
      }
      return `${name} is a CGIAR research program delivering science, innovations, and partnerships to advance food, land, and water systems transformation and contribute to CGIAR 2030 targets.`;
    }
    return (
      'This program works with partners across the CGIAR portfolio to deliver research, innovations, ' +
      'and outcomes contributing to the 2030 targets.'
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

  /**
   * `REH-R-7`/`REH-AC-15`: the row's inline Report button. Stops propagation so the row's own
   * `(click)="selectScope(row.code)"` (`RGS-T-2`) does not ALSO fire — otherwise every click would
   * both navigate AND change the scope, violating `RGS-R-2`.
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
   * P2-3296 — the achievement figures, for an AoW row or for the program band.
   *
   * A dash, never 0%: zero claims the work made no progress, when the truth is there was nothing
   * to measure it against. An indicator with no target (or a target of zero) is excluded from
   * every average — Nicoleta's ruling is that anything reported against a zero target is
   * "overachieved", which is a verdict, not a quantity.
   */
  achievementLabel(achievement: TocAchievement | null | undefined): string {
    return achievement?.progress_percentage ?? '—';
  }

  preliminaryLabel(achievement: TocAchievement | null | undefined): string {
    return achievement?.preliminary_progress_percentage ?? '—';
  }

  /**
   * The denominator, always rendered beside the number and never hidden in a tooltip: a figure
   * averaged over 2 of 10 indicators must not read like one averaged over all 10, and the visible
   * fraction is what points the team at the indicators still missing a target.
   */
  achievementCoverage(achievement: TocAchievement | null | undefined): string {
    const counted = achievement?.indicators_counted;
    const total = achievement?.indicators_total;

    if (!Number.isFinite(counted) || !Number.isFinite(total) || !total) return '';

    return counted === total ? `${total} indicators` : `${counted} of ${total} indicators`;
  }

  achievementTooltip(achievement: TocAchievement | null | undefined, childNoun = 'Intermediate Outcomes'): string {
    if (!achievement || !achievement.total) return 'Nothing has been planned here yet.';

    const { counted, total, indicators_counted: withTarget, indicators_total: allIndicators } = achievement;

    if (!counted) {
      return `None of the ${allIndicators} indicators has a target set, so no achievement percentage can be calculated.`;
    }

    const excluded = allIndicators - withTarget;
    const base =
      `QA ${this.achievementLabel(achievement)} and Preliminary ${this.preliminaryLabel(achievement)}, ` +
      `averaged over ${counted} of ${total} ${childNoun}, covering ${withTarget} of ${allIndicators} indicators.`;

    return excluded > 0
      ? `${base} ${excluded} indicator${excluded === 1 ? ' is' : 's are'} excluded for having no target set.`
      : base;
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

  // ── ToC-scope filter control (`changes/overview-aow-cross-filter`, `OSF-T-6`) ─────────────────────
  //
  // This component only RENDERS `scopeOptions`/`selectedScope` and EMITS `scopeChange` (`OSF-DD-4`
  // no-derivation) — the host (`DashboardLabComponent`) owns partitioning, labels and the URL sync.
  // `scopeGroups`/`scopeFlatKeys` below reshape the already-resolved `scopeOptions()` for rendering
  // and keyboard order; they compute no NEW figures, matching the `richStats` exception's spirit but
  // without summing anything (a raw group-by/flatten, not an aggregate).

  /** Grouped, per `OSF-AC-2`'s pinned order: Areas of work → Strategic outcomes → Outside the ToC. */
  readonly selectedScope = input<string | null>(null);
  /** Display-ready options from the host's `scopeOptions` computed (`OSF-DD-4`). */
  readonly scopeOptions = input<OverviewScopeOption[]>([]);
  /**
   * The unfiltered per-scope breakdown (`OSF-R-13`, `OSF-T-7`) — the host's `scopeBreakdown`
   * computed. Rendered as-is: `rows` grouped for display (`breakdownGroups` below), `aowSubtotal`
   * and `total` printed verbatim in the reconciliation sentence. This component sums nothing
   * (`OSF-DD-4`).
   * @akili-spec changes/overview-aow-cross-filter
   */
  readonly scopeBreakdown = input<OverviewScopeBreakdown>({ rows: [], aowSubtotal: 0, total: 0 });
  /** Template-callable handle on the module-level pure function (`OSF-T-14`) — Angular templates
   *  only resolve methods on the component instance, never a free function. */
  readonly overviewScopeDisplayCode = overviewScopeDisplayCode;
  /** Emits the chosen scope key, or `null` for "All areas and outcomes" (`OSF-R-1`). */
  readonly scopeChange = output<string | null>();

  /**
   * Whether a scope is active — drives the `Program-wide` declaration (`OSF-R-5`), the no-plan hero
   * treatment (`OSF-R-6`) and the breakdown's unfiltered-only gate (`OSF-R-13`).
   * @akili-spec changes/overview-aow-cross-filter
   */
  readonly isFiltered = computed(() => this.selectedScope() !== null);

  /**
   * `OSF-R-6`/`OSF-AC-7`: the selected scope has no planned KPIs to measure — `richStats().total`
   * is `0` either because `richRows()` came back empty (an outcome/untagged scope selected — no AoW
   * row ever matches those keys, `filterRowsByScope` in the host) or because the single matched AoW
   * row itself has no planned KPIs. Gated on `isFiltered()` so the pre-existing unfiltered empty
   * state (`OSF-AC-1`) is untouched.
   * @akili-spec changes/overview-aow-cross-filter
   */
  readonly heroNoPlan = computed(() => this.isFiltered() && this.richStats().total === 0);

  /**
   * `RGS-R-7`/`RGS-DD-7`: whether the AoW progress section (summary rail + row list) is expanded.
   * Default EXPANDED, stated per the task's DoD — this card is the Overview hero (promoted to that
   * position by `changes/overview-aow-progress-hero`), not a housekeeping panel that should start
   * closed.
   * @akili-spec changes/aow-row-gesture-split
   */
  readonly aowSectionExpanded = signal(true);

  /**
   * `RGS-DD-7`: flips the disclosure. The template marks the collapsed body `inert` (never
   * `aria-hidden` layered over it) so it drops out of BOTH the tab order and the accessibility
   * tree — the exact gap the house pattern (`reporting-aow-table`'s `.pr-collapse`) leaves open:
   * it collapses its rows to zero height with `aria-hidden="true"` and no `inert`, so a keyboard
   * user still tabs into 20 invisible buttons. `RGS-R-8` exists so this section does not inherit
   * that defect.
   * @akili-spec changes/aow-row-gesture-split
   */
  toggleAowSection(): void {
    this.aowSectionExpanded.update(expanded => !expanded);
  }

  private static readonly SCOPE_GROUP_LABEL: Record<OverviewScopeOption['kind'], string> = {
    aow: 'Areas of work',
    outcome: 'Strategic outcomes',
    untagged: 'Outside the Theory of Change'
  };
  private static readonly SCOPE_GROUP_ORDER: OverviewScopeOption['kind'][] = ['aow', 'outcome', 'untagged'];
  /** `outcome` has exactly two possible keys with a fixed, semantic order (design.md §5's label
   *  table: `INTERMEDIATE` before `EOI_2030`) — unlike `aow`, whose order is the ToC's own and MUST
   *  keep `scopeOptions()`'s relative order, not be re-sorted here. */
  private static readonly OUTCOME_KEY_ORDER: readonly string[] = ['INTERMEDIATE', 'EOI_2030'];

  /**
   * Groups any `OverviewScopeOption[]` in the `OSF-AC-2` pinned order — group headers are never
   * options, and empty groups are dropped. Shared by `scopeGroups` (the control's own options) and
   * `breakdownGroups` (`OSF-T-7`, the per-scope breakdown's rows) — same grouping rule, two
   * different option lists, so the order can never drift between the control and the breakdown.
   */
  private groupScopeOptions(options: OverviewScopeOption[]) {
    return ProgramOverviewComponent.SCOPE_GROUP_ORDER.map(kind => {
      const groupOptions = options.filter(o => o.kind === kind);
      if (kind === 'outcome') {
        groupOptions.sort(
          (a, b) =>
            ProgramOverviewComponent.OUTCOME_KEY_ORDER.indexOf(a.key) -
            ProgramOverviewComponent.OUTCOME_KEY_ORDER.indexOf(b.key)
        );
      }
      return {
        kind,
        label: ProgramOverviewComponent.SCOPE_GROUP_LABEL[kind],
        options: groupOptions
      };
    }).filter(group => group.options.length > 0);
  }

  /** One row per non-empty group, in the `OSF-AC-2` order — group headers are never options. */
  readonly scopeGroups = computed(() => this.groupScopeOptions(this.scopeOptions()));

  /**
   * `OSF-R-13`/`OSF-T-7`: `scopeBreakdown().rows` grouped the SAME way as the control's own options
   * — a raw group-by, no new figure (`OSF-DD-4`). A group with an entry whose `count` is `0` still
   * renders that row; only a group with NO entries is dropped (`groupScopeOptions`' own filter).
   * @akili-spec changes/overview-aow-cross-filter
   */
  readonly breakdownGroups = computed(() => this.groupScopeOptions(this.scopeBreakdown().rows));

  /**
   * The keyboard/arrow order: "All areas and outcomes" first, then every option in group order —
   * headers are simply never in this array, so `↓` from a group's last option lands on the next
   * group's first OPTION by construction (`OSF-T-6` input-that-would-make-it-fail).
   */
  readonly scopeFlatKeys = computed<(string | null)[]>(() => [
    null,
    ...this.scopeGroups().flatMap(group => group.options.map(o => o.key))
  ]);

  readonly selectedScopeOption = computed(() => {
    const key = this.selectedScope();
    return key === null ? null : (this.scopeOptions().find(o => o.key === key) ?? null);
  });

  /** Falls back to the default label when the selected key is absent from THIS program's options
   *  (`OSF-T-4`'s already-reset `overviewScope` reaching here as `null`, or a stale key mid-reset). */
  readonly scopeTriggerLabel = computed(() => this.selectedScopeOption()?.name ?? 'All areas and outcomes');
  /** `OSF-T-14` — routed through `overviewScopeDisplayCode` so the trigger chip never paints a raw
   *  internal key again (`execution.md` §17's `INTERMEDIATE`-at-900–1099px finding). */
  readonly scopeTriggerCode = computed(() => {
    const option = this.selectedScopeOption();
    return option ? overviewScopeDisplayCode(option) : null;
  });

  readonly scopeOpen = signal(false);
  /** The option the arrow keys are currently on (`aria-activedescendant`); `null` = "All". */
  readonly activeScopeKey = signal<string | null>(null);

  private readonly scopeTriggerRef = viewChild<ElementRef<HTMLButtonElement>>('scopeTrigger');
  private readonly scopeListRef = viewChild<ElementRef<HTMLDivElement>>('scopeList');

  constructor() {
    // Moves DOM focus into the listbox once the popover's content is actually in the DOM — the
    // portal attaches on the next tick, so a synchronous `.focus()` right after `scopeOpen.set(true)`
    // would miss it (same `queueMicrotask` shape as the palette's `setFirstItemActive` effect).
    effect(() => {
      if (this.scopeOpen()) {
        queueMicrotask(() => this.scopeListRef()?.nativeElement.focus());
      }
    });
  }

  toggleScopePopover(): void {
    this.scopeOpen() ? this.closeScopePopover() : this.openScopePopover();
  }

  openScopePopover(): void {
    if (this.scopeOpen()) return;
    this.activeScopeKey.set(this.selectedScope());
    this.scopeOpen.set(true);
  }

  /** `Escape` closes and returns focus to the trigger (`OSF-DD-13`); also used on select/outside-close. */
  closeScopePopover(refocusTrigger = true): void {
    if (!this.scopeOpen()) return;
    this.scopeOpen.set(false);
    if (refocusTrigger) {
      queueMicrotask(() => this.scopeTriggerRef()?.nativeElement.focus());
    }
  }

  /** Mirrors the overlay's own open/close (outside click, backdrop) back into `scopeOpen`. */
  onScopeStateChanged(state: 'open' | 'closed'): void {
    this.scopeOpen.set(state === 'open');
  }

  selectScope(key: string | null): void {
    this.scopeChange.emit(key);
    this.closeScopePopover();
  }

  // ── Clear filters control (`changes/clear-filters`, `CF-T-1`) ──────────────────────────────────
  //
  // One button that resets BOTH axes in a single activation (`CF-R-1`), reusing the two mechanisms
  // above rather than adding a new one. `OQ-2`: it coexists with "All Sections" and the scope
  // dropdown — neither existing control is removed or altered by this section.

  /**
   * `CF-DD-1`: visible only while at least one axis is filtered — section ≠ `'all'` OR scope ≠
   * `null`. Gates an `@if` (removal from the DOM, never `hidden`/opacity) so the control can never
   * be invisible-but-focusable (`CF-AC-2`'s negative clause — the exact defect `RGS-T-3` spent a
   * whole task avoiding in the collapse above).
   * @akili-spec changes/clear-filters
   */
  readonly showClearFilters = computed(() => this.activeSection() !== 'all' || this.selectedScope() !== null);

  /**
   * `CF-DD-5` focus target: the "All Sections" tab is never conditionally rendered, so moving focus
   * there works synchronously even on the same tick the Clear filters button removes itself.
   */
  private readonly allSectionsTabRef = viewChild<ElementRef<HTMLButtonElement>>('allSectionsTab');

  /**
   * `CF-DD-2`: resets both axes through their EXISTING paths — `activeSection` set DIRECTLY (never
   * `setActiveSection('all')`, which carries toggle logic that is a no-op for `'all'` today but
   * would couple clearing to an unrelated future change to toggling) and `scopeChange` emitted
   * `null` through the same output the host already binds to `overviewScope.set($event)` — no host
   * change (`CF-R-1`, design.md §3).
   * `CF-DD-5`: focus moves to the "All Sections" tab BEFORE `showClearFilters()` flips false and the
   * `@if` removes this button from the DOM, so a keyboard user's focus is never dropped to `<body>`
   * (`CF-AC-4`) — the tab is always in the DOM, so this `.focus()` call needs no `queueMicrotask`.
   * @akili-spec changes/clear-filters
   */
  clearFilters(): void {
    this.activeSection.set('all');
    this.scopeChange.emit(null);
    this.allSectionsTabRef()?.nativeElement.focus();
  }

  /** `Enter`/`Space`/`↓` open the popover when it is closed (`OSF-DD-13` Keys row). */
  onScopeTriggerKeydown(event: KeyboardEvent): void {
    if (this.scopeOpen()) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openScopePopover();
    }
  }

  /**
   * `↑`/`↓` move the active option and skip headers (they are not in `scopeFlatKeys`); `Enter`
   * selects; `Escape` closes and restores focus to the trigger (`OSF-DD-13`).
   */
  onScopeListKeydown(event: KeyboardEvent): void {
    const flat = this.scopeFlatKeys();
    if (!flat.length) return;
    const currentIndex = flat.indexOf(this.activeScopeKey());
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        this.activeScopeKey.set(flat[currentIndex < 0 ? 0 : Math.min(currentIndex + 1, flat.length - 1)]);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        this.activeScopeKey.set(flat[currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0)]);
        break;
      }
      case 'Home':
        event.preventDefault();
        this.activeScopeKey.set(flat[0]);
        break;
      case 'End':
        event.preventDefault();
        this.activeScopeKey.set(flat[flat.length - 1]);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectScope(this.activeScopeKey());
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.closeScopePopover();
        break;
    }
  }

  /** Stable id for `aria-activedescendant`/each option — `null` (the "All" row) gets a fixed suffix. */
  scopeOptionId(key: string | null): string {
    return `program-overview-scope-option-${key ?? 'all'}`;
  }

  /** Stable id linking the trigger's `aria-controls` to the listbox panel (`OSF-DD-13`'s Trigger
   *  row) — Spartan's popover does not wire this itself, so it is set explicitly here, same fixed-id
   *  precedent as `scopeOptionId`. Only one Overview scope control renders per page. */
  readonly scopeListboxId = 'program-overview-scope-listbox';

  /** The count folded into the accessible name, per `OSF-DD-13`'s Option row ("count exposed in the
   *  accessible name"), not left to be inferred from adjacent visual text alone. */
  scopeOptionAriaLabel(name: string, count: number): string {
    return `${name}, ${count} result${count === 1 ? '' : 's'}`;
  }

  // ── Breakdown status bar (`OSF-T-13`, mockup drift — the 150px bar column `OSF-T-7` shipped
  // without) ──────────────────────────────────────────────────────────────────────────────────
  //
  // Status ids match `OVERVIEW_STATUS_SLOTS` (host): Editing=1, In QA=2, Submitted=3 — the same
  // three the mockup's own `editingStyle`/`submittedStyle`/`qaStyle` paint. `row.count` (already
  // `bucket.total`, every status combined) is the denominator, exactly like the mockup's own
  // `bucketTotal(r)` — Approved/Discontinued count toward the denominator but paint no segment, so
  // the three segments do not have to sum to 100% width (`OAH-R-3` "honest at 1%", never
  // percent-of-percent, mirrored from `completeSegmentWidth`/`inProgressSegmentWidth` above).

  private breakdownSegmentWidth(row: OverviewScopeOption, statusId: number): number {
    return row.count ? ((row.byStatus?.[statusId] ?? 0) / row.count) * 100 : 0;
  }

  breakdownEditingWidth(row: OverviewScopeOption): number {
    return this.breakdownSegmentWidth(row, 1);
  }

  breakdownSubmittedWidth(row: OverviewScopeOption): number {
    return this.breakdownSegmentWidth(row, 3);
  }

  breakdownQaWidth(row: OverviewScopeOption): number {
    return this.breakdownSegmentWidth(row, 2);
  }

  /** Text alternative for the bar (`OAH-N-1` precedent, `:665`) — a roleless `<span>` is not exposed
   *  as a text-alternative-bearing element, so `role="img"` + this label is what AT actually reads. */
  breakdownBarTitle(row: OverviewScopeOption): string {
    const editing = row.byStatus?.[1] ?? 0;
    const submitted = row.byStatus?.[3] ?? 0;
    const qa = row.byStatus?.[2] ?? 0;
    return `${editing} Editing, ${submitted} Submitted, ${qa} In QA`;
  }
}
