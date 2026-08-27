import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

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
 * OVERVIEW TAB — exact layout of the approved live design
 * (`.design-snapshots/PRMS-Reporting.dc.html`, `showOverview` block).
 *
 * Grid 12-col · gap 16px · pad 32px:
 *   About this program                    12
 *   Results by indicator category          6  +  Bilateral results by indicator category  6
 *   Reporting status                      12
 *   Centers with reported W3/bilateral results 6  + Progress by area of work                  6
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
  imports: [NgTemplateOutlet],
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

  /**
   * Typed navigation intent (`OVW-R-5`). Declared here (OVW-T-1) so the parent's `(openResults)`
   * binding compiles under `strictTemplates`; no template wiring or `.emit()` call yet — those
   * land with the real `<button>`/segment/cell markup in OVW-T-2.
   */
  readonly openResults = output<OverviewLink>();

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
