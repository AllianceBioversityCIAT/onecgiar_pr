import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChartColumn, lucideCircle, lucideClock, lucideFileText, lucideGlobe, lucideTarget, lucideTrendingUp, lucideTriangleAlert, lucideZap } from '@ng-icons/lucide';

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

export interface AttentionRow {
  icon: string;
  color: string;
  text: string;
  action: string;
}

export interface GapRow {
  name: string;
  meta: string;
  gap: string;
}

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
 * OVERVIEW TAB — the program's read-only summary.
 *
 * Reference: `docs/design-references/prms-shell-CURRENT/PRMS-Shell.dc.html:752-878` plus the three
 * rendered screenshots. Spec: `docs/reporting-redesign/PROGRAM-SHELL-SPEC.md` §4.
 *
 * 🛑 **EVERY FIGURE BELOW IS PLACEHOLDER DATA**, and deliberately so. Not one of these seven blocks
 * can be fed from the client today:
 *
 * | Block | What is missing |
 * |---|---|
 * | About this program | no description field on the SP payload |
 * | Reporting status | per-status result counts are not aggregated per program |
 * | Reporting pace | needs the cycle END DATE (absent) + a velocity series |
 * | Progress by area of work | reported-vs-planned per AoW is not returned |
 * | Needs attention | staleness, missing-evidence and unsubmitted queries do not exist |
 * | Largest gaps to target | target-vs-achieved per indicator is not aggregated |
 * | Impact so far | countries reached and results-by-category are not fetched |
 *
 * Recorded as NEEDS-BACKEND in `PROGRAM-SHELL-SPEC.md` §7 (open questions 4 and 5). The layout is
 * the deliverable here; wiring is a separate change, and each block reads its numbers from ONE
 * signal so swapping in a real feed is a one-line edit per block.
 *
 * ⚠️ px, never rem type utilities — `html` is 12px here, so `text-sm` renders 10.5px (UI-RULES §1.3).
 */
@Component({
  selector: 'app-program-overview',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './program-overview.component.html',
  styleUrls: ['./program-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideChartColumn,
      lucideCircle,
      lucideClock,
      lucideFileText,
      lucideGlobe,
      lucideTarget,
      lucideTrendingUp,
      lucideTriangleAlert,
      lucideZap
    })
  ]
})
export class ProgramOverviewComponent {
  readonly programName = input<string>('');

  /** `About this program` is clamped to 3 lines until expanded (spec §4.1). */
  readonly descriptionExpanded = signal(false);

  readonly description = computed(
    () =>
      `${this.programName() || 'This program'} modernizes crop improvement across CGIAR and its national partners so that farmers gain access to varieties matched to the markets and climates they actually face. The program works through six connected areas of work: market intelligence that defines what to breed for, redesigned breeding pipelines with explicit stage-gate decisions, trait discovery platforms shared across programs, genetic innovation that broadens the adaptive base of staple crops, seed systems that move finished varieties into the hands of growers, and the data and digital tools that hold the whole chain together.`
  );

  /** Fixed status pairs — never recombine a fg with another bg (rule 9). */
  readonly statusSegments = signal<StatusSegment[]>([
    { key: 'not-started', label: 'Not started', count: 20, bg: 'var(--pr-status-not-started-bg)', fg: 'var(--pr-status-not-started-fg)' },
    { key: 'in-progress', label: 'In progress', count: 6, bg: 'var(--pr-status-in-progress-bg)', fg: 'var(--pr-status-in-progress-fg)' },
    { key: 'submitted', label: 'Submitted', count: 1, bg: 'var(--pr-status-submitted-bg)', fg: 'var(--pr-status-submitted-fg)' },
    { key: 'in-qa', label: 'In QA', count: 1, bg: 'var(--pr-status-in-qa-bg)', fg: 'var(--pr-status-in-qa-fg)' },
    { key: 'approved', label: 'Approved', count: 0, bg: 'var(--pr-status-approved-bg)', fg: 'var(--pr-status-approved-fg)' }
  ]);

  readonly statusTotal = computed(() => this.statusSegments().reduce((sum, s) => sum + s.count, 0));

  /** Width as a percentage of the total; a zero-count status renders no segment at all. */
  segmentWidth(segment: StatusSegment): number {
    const total = this.statusTotal();
    return total ? (segment.count / total) * 100 : 0;
  }

  readonly paceHeadline = "At this pace you'll finish 57 days after the deadline.";
  readonly paceSub = 'You need 2.9 results per week to close on time. Current pace: 1.3.';

  /** Sorted ASCENDING by completion — least complete first is the point of the block (spec §4.4). */
  readonly aowProgress = signal<AowProgressRow[]>([
    { code: 'AOW06', name: 'Data and Digital Tools', done: 0, total: 2 },
    { code: 'AOW03', name: 'Trait Discovery', done: 1, total: 5 },
    { code: 'AOW04', name: 'Genetic Innovation', done: 1, total: 4 },
    { code: 'AOW02', name: 'Breeding Pipelines', done: 2, total: 6 },
    { code: 'AOW05', name: 'Seed Systems', done: 1, total: 3 },
    { code: 'AOW01', name: 'Market Intelligence', done: 3, total: 8 }
  ]);

  percentOf(row: AowProgressRow): number {
    return row.total ? Math.round((row.done / row.total) * 100) : 0;
  }

  readonly attention = signal<AttentionRow[]>([
    { icon: 'lucideClock', color: 'var(--pr-status-in-progress-fg)', text: '1 draft untouched for more than 7 days', action: 'Review' },
    { icon: 'lucideCircle', color: 'var(--pr-text-subtle)', text: 'AOW06 has no results reported yet', action: 'Open' },
    { icon: 'lucideZap', color: 'var(--pr-status-in-progress-fg)', text: '4 emerging results waiting for submission', action: 'Open' },
    { icon: 'lucideFileText', color: 'var(--pr-color-red-300)', text: '8 results are missing evidence links', action: 'Review' }
  ]);

  /** Units are respected: money, percent and plain counts all appear (spec §4.6). */
  readonly gaps = signal<GapRow[]>([
    { name: 'Investment mobilized for shared research infrastructure', meta: 'AOW02 · 2026 Target: $1.2M · Achieved: $0', gap: '$1.2M left' },
    { name: 'Investment mobilized for demand-led breeding', meta: 'AOW01 · 2026 Target: $850K · Achieved: $0', gap: '$850K left' },
    { name: 'Investment mobilized for seed enterprises', meta: 'AOW05 · 2026 Target: $24K · Achieved: $0', gap: '$24K left' },
    { name: 'Share of partner programs using segment profiles', meta: 'AOW01 · 2026 Target: 40% · Achieved: 0%', gap: '40% left' },
    { name: 'Number of policy engagements informed by market intelligence', meta: 'AOW01 · 2026 Target: 6 · Achieved: 0', gap: '6 left' }
  ]);

  readonly countriesReached = 16;

  readonly countries = signal<CountryRow[]>([
    { name: 'Kenya', count: 8, color: 'var(--pr-chart-1)' },
    { name: 'India', count: 8, color: 'var(--pr-chart-1)' },
    { name: 'Ethiopia', count: 7, color: 'var(--pr-chart-2)' },
    { name: 'Nigeria', count: 7, color: 'var(--pr-chart-2)' },
    { name: 'Colombia', count: 5, color: 'var(--pr-chart-3)' },
    { name: 'Bangladesh', count: 4, color: 'var(--pr-chart-3)' }
  ]);

  private readonly countriesMax = computed(() => Math.max(...this.countries().map(c => c.count), 1));

  countryWidth(row: CountryRow): number {
    return (row.count / this.countriesMax()) * 100;
  }

  readonly categories = signal<CategoryBar[]>([
    { name: 'Knowledge product', count: 11, color: 'var(--pr-chart-1)' },
    { name: 'Innovation development', count: 11, color: 'var(--pr-chart-2)' },
    { name: 'Capacity sharing', count: 3, color: 'var(--pr-chart-3)' },
    { name: 'Other output', count: 3, color: 'var(--pr-chart-4)' }
  ]);

  private readonly categoriesMax = computed(() => Math.max(...this.categories().map(c => c.count), 1));

  /** Bar height in px inside the reference's 186px plot area, minus the label + value rows. */
  categoryHeight(bar: CategoryBar): number {
    return Math.round((bar.count / this.categoriesMax()) * 130);
  }
}
