import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';

import { DataControlService } from '../../../../shared/services/data-control.service';
import { PortfolioBar, PortfolioOverviewService, PortfolioRow } from './services/portfolio-overview.service';

/** How many bilateral programmes the card shows before `View all` appears. Design: 4. */
export const BILATERAL_PREVIEW = 4;

/** A column of the `Progress by science program` matrix. */
export interface PortfolioColumn {
  label: string;
  /** '' on the programme column (it flexes); every figure column is fixed-width. */
  key: 'programme' | 'total' | 'category';
  /** Index into `PortfolioRow.cells`; -1 for the two non-category columns. */
  cellIndex: number;
}

type SortKey = 'programme' | 'total' | number;

/**
 * Portfolio overview — reporting figures across every science program, admin only.
 *
 * Built from the live Claude Design (`PRMS Reporting.dc.html`, block `showPortfolio`, read
 * 2026-08-24). Column order is the design's, verified in the template rather than inferred from a
 * rendering: a row emits `code`, `name`, **`total`**, then one cell per category — so TOTAL sits
 * between the programme and the categories, not at the end.
 */
@Component({
  selector: 'app-portfolio-overview',
  standalone: true,
  templateUrl: './portfolio-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  providers: [PortfolioOverviewService, provideIcons({ lucideChevronDown })],
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
  private readonly dataControlSE = inject(DataControlService);
  readonly data = inject(PortfolioOverviewService);

  /** Sort state of the matrix. The design ships it sorted by the programme column. */
  readonly sortKey = signal<SortKey>('total');
  readonly sortAsc = signal<boolean>(false);

  /** Whether the bilateral card is showing every programme or just the preview. */
  readonly bilateralExpanded = signal<boolean>(false);

  constructor() {
    this.data.load();
  }

  /** `PORTFOLIO · REPORTING CYCLE 2026 · P25` — the phase these figures actually describe. */
  readonly eyebrow = computed(() => {
    const phase = this.dataControlSE?.reportingCurrentPhase;
    const year = this.data.phaseName() ? /\d{4}/.exec(this.data.phaseName())?.[0] : String(phase?.phaseYear ?? '');
    const acronym = this.data.portfolioAcronym() || phase?.portfolioAcronym || '';
    return ['PORTFOLIO', year ? `REPORTING CYCLE ${year}` : '', acronym].filter(Boolean).join(' · ');
  });

  /** Programme column + TOTAL + one column per category, in the design's order. */
  readonly columns = computed<PortfolioColumn[]>(() => [
    { label: 'Science program', key: 'programme', cellIndex: -1 },
    { label: 'Total', key: 'total', cellIndex: -1 },
    ...this.data.categories().map((name, index) => ({ label: name, key: 'category' as const, cellIndex: index }))
  ]);

  /** The matrix rows under the active sort. */
  readonly rows = computed<PortfolioRow[]>(() => {
    const key = this.sortKey();
    const dir = this.sortAsc() ? 1 : -1;
    const value = (row: PortfolioRow): string | number =>
      key === 'programme' ? row.code : key === 'total' ? row.total : (row.cells[key] ?? 0);

    return [...this.data.programmeRows()].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * (key === 'programme' ? -dir : dir);
      return (Number(va) - Number(vb)) * dir;
    });
  });

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

  columnKey(column: PortfolioColumn): SortKey {
    return column.key === 'category' ? column.cellIndex : column.key;
  }

  isSorted(column: PortfolioColumn): boolean {
    return this.sortKey() === this.columnKey(column);
  }

  /** Header click: same column flips the direction, a new column starts descending. */
  sortBy(column: PortfolioColumn): void {
    const key = this.columnKey(column);
    if (this.sortKey() === key) {
      this.sortAsc.update(asc => !asc);
      return;
    }
    this.sortKey.set(key);
    this.sortAsc.set(false);
  }

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
}
