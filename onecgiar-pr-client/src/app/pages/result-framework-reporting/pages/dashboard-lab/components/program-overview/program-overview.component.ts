import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleDashed, lucideCircleDot, lucideClock, lucideFileText, lucideZap } from '@ng-icons/lucide';

/** One segment of the Reporting-status meter. `fg` doubles as the legend dot colour. */
export interface StatusSegment {
  key: string;
  label: string;
  count: number;
  bg: string;
  fg: string;
}

export interface AowProgressRow {
  code: string;
  name: string;
  done: number;
  total: number;
}

/**
 * The reference gives every Needs-attention item its own 16px glyph. Icon + colour are a
 * presentation concern, so the parent only says WHAT kind of alert it is and this component
 * owns the mapping — that also guarantees every icon it renders is registered below.
 */
export type AttentionKind = 'stale-drafts' | 'not-started' | 'empty-aow' | 'emerging' | 'missing-evidence';

export interface AttentionRow {
  kind: AttentionKind;
  text: string;
}

const ATTENTION_STYLE: Record<AttentionKind, { icon: string; color: string }> = {
  'stale-drafts': { icon: 'lucideClock', color: 'var(--pr-status-in-progress-fg)' },
  'not-started': { icon: 'lucideCircleDashed', color: 'var(--pr-text-secondary)' },
  'empty-aow': { icon: 'lucideCircleDot', color: 'var(--pr-text-secondary)' },
  emerging: { icon: 'lucideZap', color: 'var(--pr-status-in-progress-fg)' },
  'missing-evidence': { icon: 'lucideFileText', color: 'var(--pr-color-red-400)' }
};

/**
 * Everything the Reporting-pace card needs, in raw numbers. Weeks are 0 when the reporting
 * cycle's start / end dates are unknown (or the cycle has not opened yet) — the card then
 * degrades to copy that states the facts instead of projecting an invented deadline.
 */
export interface PaceSeries {
  /** Results that moved past "Not started". */
  done: number;
  /** All results reported against the phase. */
  total: number;
  /** Weeks since the cycle opened. */
  elapsedWeeks: number;
  /** Weeks left until the cycle closes. */
  leftWeeks: number;
  /** Pipeline split, used for the honest copy when no projection is possible. */
  inProgress: number;
  inQa: number;
  submitted: number;
}

/** Sparkline viewBox — matches the reference (`viewBox="0 0 320 88"`). */
const CHART_W = 320;
const CHART_H = 88;
/** Baseline / headroom inside the viewBox, same insets as the reference. */
const CHART_BASE = CHART_H - 6;
const CHART_TOP_PAD = 14;

const round1 = (n: number): number => Math.round(n * 10) / 10;

export interface CountryRow {
  name: string;
  count: number;
  color: string;
}

export interface CategoryBar {
  name: string;
  count: number;
  color: string;
}

/**
 * OVERVIEW TAB — exact CURRENT layout (PRMS-Shell.dc.html:753-891).
 *
 * Grid 12-col · gap 16px · pad 32px:
 *   About 12
 *   Reporting status 8 + Reporting pace 4
 *   Progress by AoW 6 + Needs attention 6
 *   Impact so far 12
 *
 * Largest gaps was dropped in the 2026-08-04 export. No section icons in the reference.
 *
 * All figures come from parent inputs (real SP / AoW / ToC data). Empty arrays render empty
 * states — we do not invent counts.
 *
 * ⚠️ px only — `html` is 12px (UI-RULES §1.3).
 */
@Component({
  selector: 'app-program-overview',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './program-overview.component.html',
  styleUrls: ['./program-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideClock, lucideCircleDashed, lucideCircleDot, lucideZap, lucideFileText })]
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
  readonly attention = input<AttentionRow[]>([]);
  readonly countries = input<CountryRow[]>([]);
  readonly categories = input<CategoryBar[]>([]);
  /** Raw pace numbers; the copy and the sparkline below are derived from them. */
  readonly paceSeries = input<PaceSeries | null>(null);

  readonly description = computed(() => {
    const explicit = this.programDescription()?.trim();
    if (explicit) return explicit;
    const name = this.programName()?.trim() || 'This program';
    return (
      `${name} modernizes CGIAR and national breeding programmes so that farmers get climate-resilient, ` +
      `market-preferred varieties faster. The programme connects market intelligence, breeding pipelines, ` +
      `trait discovery, genetic innovation and seed systems into one delivery chain, and works with national ` +
      `agricultural research systems and private seed partners across South Asia, sub-Saharan Africa and ` +
      `Latin America. Reporting covers products delivered to partners, the outcomes those products enable, ` +
      `and progress toward the 2030 outcomes agreed with donors.`
    );
  });

  readonly statusTotal = computed(() => this.statusSegments().reduce((sum, s) => sum + s.count, 0));

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

  attentionIcon(row: AttentionRow): string {
    return ATTENTION_STYLE[row.kind].icon;
  }

  attentionColor(row: AttentionRow): string {
    return ATTENTION_STYLE[row.kind].color;
  }

  /** Normalised pace figures — everything the copy and the chart need, computed once. */
  private readonly paceMetrics = computed(() => {
    const series = this.paceSeries();
    const total = Math.max(0, series?.total ?? 0);
    const done = Math.min(Math.max(0, series?.done ?? 0), total);
    const remaining = total - done;
    // Non-positive weeks mean "unknown": no cycle dates, or the cycle has not opened / has closed.
    const elapsedWeeks = series && series.elapsedWeeks > 0 ? series.elapsedWeeks : 0;
    const leftWeeks = series && series.leftWeeks > 0 ? series.leftWeeks : 0;
    const perWeek = elapsedWeeks > 0 ? done / elapsedWeeks : 0;
    const neededPerWeek = leftWeeks > 0 ? remaining / leftWeeks : 0;
    const canProject = perWeek > 0 && leftWeeks > 0;
    // Days still needed at today's pace, minus the days actually left in the cycle.
    const lateDays = canProject ? Math.round((remaining / perWeek) * 7) - Math.round(leftWeeks * 7) : 0;
    return { total, done, remaining, elapsedWeeks, leftWeeks, perWeek, neededPerWeek, canProject, lateDays };
  });

  readonly paceHeadline = computed(() => {
    const m = this.paceMetrics();
    if (!m.total) return 'No results reported for this phase yet.';
    if (!m.done) return 'Nothing has been reported yet in this cycle.';
    // No cycle dates → state the progress instead of projecting against a deadline we don't have.
    if (!m.canProject) return `${m.done} of ${m.total} results have moved past Not started.`;
    if (m.lateDays > 0) return `At this pace you'll finish ${m.lateDays} ${m.lateDays === 1 ? 'day' : 'days'} after the deadline.`;
    if (m.lateDays < 0) {
      const early = Math.abs(m.lateDays);
      return `At this pace you'll finish ${early} ${early === 1 ? 'day' : 'days'} before the deadline.`;
    }
    return "At this pace you'll finish right on the deadline.";
  });

  readonly paceSub = computed(() => {
    const m = this.paceMetrics();
    if (!m.total) return 'Start reporting against the planned ToC to build pace.';
    if (m.canProject) {
      return `You need ${round1(m.neededPerWeek)} results per week to close on time. Current pace: ${round1(m.perWeek)}.`;
    }
    const series = this.paceSeries();
    return `${series?.inProgress ?? 0} still in progress · ${series?.inQa ?? 0} in QA · ${series?.submitted ?? 0} submitted.`;
  });

  /**
   * Sparkline geometry, replacing the hard-coded paths of the first export.
   *
   * LIMITATION: the Science-Programs progress endpoint returns only the CURRENT status counts —
   * there is no per-result timestamp series — so the solid line is a straight ramp from 0 to
   * today's cumulative total instead of the reference's real step curve. It is still derived
   * from live data (total, done, elapsed weeks), so it differs per programme.
   * The dashed projection and the deadline marker only render when the cycle dates are known.
   */
  readonly paceChart = computed(() => {
    const m = this.paceMetrics();
    // Without cycle dates there is no time axis: fall back to a synthetic one-week span so the
    // line still encodes the current share, and drop the projection + deadline marker.
    const elapsed = m.elapsedWeeks || 1;
    const left = m.leftWeeks;
    const xMax = (elapsed + (left || elapsed)) * 1.15;
    const xAt = (weeks: number) => (weeks / xMax) * CHART_W;
    const yAt = (value: number) => CHART_BASE - (value / Math.max(1, m.total)) * (CHART_H - CHART_TOP_PAD);

    const x0 = round1(xAt(0));
    const xNow = round1(xAt(elapsed));
    const yNow = round1(yAt(m.done));
    const lineD = `M${x0} ${round1(yAt(0))} L${xNow} ${yNow}`;
    const projectedEnd = Math.min(m.total, m.done + m.perWeek * (xMax - elapsed));

    return {
      lineD,
      areaD: `${lineD} L${xNow} ${CHART_BASE} L${x0} ${CHART_BASE} Z`,
      projD: m.canProject ? `M${xNow} ${yNow} L${round1(xAt(xMax))} ${round1(yAt(projectedEnd))}` : '',
      deadlineX: left > 0 ? round1(xAt(elapsed + left)) : null,
      pointY: yNow,
      pointX: xNow
    };
  });

  percentOf(row: AowProgressRow): number {
    return row.total ? Math.round((row.done / row.total) * 100) : 0;
  }

  readonly countriesReached = computed(() => this.countries().length);

  private readonly countriesMax = computed(() => Math.max(...this.countries().map(c => c.count), 1));

  countryWidth(row: CountryRow): number {
    return (row.count / this.countriesMax()) * 100;
  }

  private readonly categoriesMax = computed(() => Math.max(...this.categories().map(c => c.count), 1));

  /** Bar height in the reference's ~130px plot band inside 186px. */
  categoryHeight(bar: CategoryBar): number {
    return Math.max(4, Math.round((bar.count / this.categoriesMax()) * 130));
  }
}
