import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { ECElementEvent } from 'echarts/core';
import { HlmTabsImports } from '@spartan/tabs';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import { PrVizChartComponent } from '../../../../../../shared/components/pr-viz-chart/pr-viz-chart.component';
import { PortfolioOverviewService, type RawResult } from '../../services/portfolio-overview.service';
import { LevelCard, TypologyLevel, levelCards, centerTypeMatrix, programTypeMatrix } from './typology.aggregate';
import { buildTypologyChart, type TypologyChart, type TypologyChartColours } from './typology.charts';
import { resolveTypologyClick } from './typology.click';

export type TypologyDimension = 'program' | 'center';

/** Result type (series key; `''` = Unclassified) -> design token (TBC-DD-7): bar segments, chart series and marker dots only, never text. */
const TYPE_TOKEN: Record<string, string> = {
  'Capacity sharing for development': '--pr-color-yellow-500',
  'Knowledge product': '--pr-color-blue-600',
  'Innovation development': '--pr-color-green-600',
  'Other output': '--pr-color-primary-300',
  'Policy change': '--pr-color-orange-700',
  'Innovation use': '--pr-color-red-200',
  'Capacity change': '--pr-color-blue-800',
  'Other outcome': '--pr-color-green-800',
  'Impact contribution': '--pr-color-red-500',
  '': '--pr-color-neutral-800'
};

/** Level card marker dots keep `var()` references, never resolved values (T-4 advisory). */
const LEVEL_TOKEN: Record<TypologyLevel, string> = {
  output: '--pr-color-result-level-2',
  outcome: '--pr-color-result-level-4',
  impact: '--pr-color-result-level-3',
  unclassified: '--pr-color-neutral-800'
};

/**
 * Resolves the 10 type tokens once (design 6.4). A canvas cannot read `var()`, so the computed value is used
 * when available; otherwise (jsdom, SSR) the `var(--pr-...)` reference itself is the fallback, never a literal colour.
 */
function resolveTypeColours(): TypologyChartColours {
  const style = typeof document !== 'undefined' && typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement) : null;
  const pick = (token: string): string => style?.getPropertyValue(token).trim() || `var(${token})`;
  return Object.fromEntries(Object.entries(TYPE_TOKEN).map(([key, token]) => [key, pick(token)]));
}

/**
 * Typology view (specs changes/portfolio-overview-revamp/typology-view and changes/portfolio-typology-bar-chart) —
 * level summary cards plus a clickable bar chart per Program / Accelerator, split by status bucket and result type.
 * Read-only on the rows; a click only writes the global selection (one `setSelection`, TBC-DD-3).
 */
@Component({
  selector: 'app-portfolio-typology-block',
  imports: [PrVizChartComponent, HlmTabsImports],
  templateUrl: './typology-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioTypologyBlockComponent {
  private readonly data = inject(PortfolioOverviewService);

  readonly rows = input.required<RawResult[]>();

  readonly copy = PORTFOLIO_OVERVIEW_COPY;
  private readonly colours = resolveTypeColours();

  /** Cards always describe all page rows (the page already passes the filtered rows). */
  readonly cards = computed<LevelCard[]>(() => levelCards(this.rows()));
  readonly visibleCards = computed<LevelCard[]>(() => this.cards().filter(card => card.level !== 'unclassified' || card.count > 0));
  readonly dimension = signal<TypologyDimension>('program');
  readonly programChart = computed<TypologyChart>(() => buildTypologyChart(programTypeMatrix(this.rows()), this.colours, this.copy.typologyChart));
  /** View-only (TBC-DD-9): lead-Center counts differ from the Center filter, so the chart never writes the selection. */
  readonly centerChart = computed<TypologyChart>(() => buildTypologyChart(centerTypeMatrix(this.rows()), this.colours, this.copy.typologyCenterChart, false));
  readonly chart = computed<TypologyChart>(() => (this.dimension() === 'center' ? this.centerChart() : this.programChart()));

  levelLabel(level: TypologyLevel): string {
    switch (level) {
      case 'output':
        return this.copy.levelOutput;
      case 'outcome':
        return this.copy.levelOutcome;
      case 'impact':
        return this.copy.levelImpact;
      default:
        return this.copy.levelUnclassified;
    }
  }

  fill(level: TypologyLevel): string {
    return `var(${LEVEL_TOKEN[level]})`;
  }

  typeName(name: string): string {
    return name === '' ? this.copy.noType : name;
  }

  setDimension(value: string): void {
    if (value === 'program' || value === 'center') this.dimension.set(value);
  }

  /** Mouse and keyboard (table action) arrive here through the same `chartClick` output; the Center tab is ignored (TBC-R-10). */
  onChartClick(event: ECElementEvent): void {
    if (this.dimension() === 'center') return;
    const next = resolveTypologyClick(event, this.data.selection());
    if (next) this.data.setSelection(next);
  }
}
