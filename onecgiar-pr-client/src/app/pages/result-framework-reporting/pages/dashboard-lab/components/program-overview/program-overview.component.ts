import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

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
  text: string;
  color: string;
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
  readonly attention = input<AttentionRow[]>([]);
  readonly countries = input<CountryRow[]>([]);
  readonly categories = input<CategoryBar[]>([]);
  /** Pace copy — parent can pass real copy when cycle end-date exists. */
  readonly paceHeadline = input<string>(
    'Pace to deadline will appear when the reporting cycle end date is available.'
  );
  readonly paceSub = input<string>(
    'Submit results steadily so the program closes on time.'
  );

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
