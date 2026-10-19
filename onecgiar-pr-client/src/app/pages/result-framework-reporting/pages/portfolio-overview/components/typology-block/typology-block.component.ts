import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { HlmTabsImports } from '@spartan/tabs';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import type { RawResult } from '../../services/portfolio-overview.service';
import { Breakdown, BreakdownRow, LevelCard, TypologyLevel, TYPOLOGY_LEVELS, breakdownByCenter, breakdownByProgram, levelCards } from './typology.aggregate';

export type TypologyDimension = 'program' | 'center';

/** Level fills (design §7.5, TYV-DD-5): bar segments and marker dots only, never text. */
const LEVEL_FILL: Record<TypologyLevel, string> = {
  output: 'var(--pr-color-result-level-2)',
  outcome: 'var(--pr-color-result-level-4)',
  impact: 'var(--pr-color-result-level-3)',
  unclassified: 'var(--pr-color-neutral-800)'
};

/**
 * Typology view (spec changes/portfolio-overview-revamp/typology-view, TYV-R-2..R-8) — level summary cards
 * plus a breakdown table by Program / Accelerator or by lead Center (W3/Bilateral). Read-only: figures are
 * `computed` off the `rows` input; the dimension switch only regroups the table, never the cards.
 */
@Component({
  selector: 'app-portfolio-typology-block',
  imports: [HlmTabsImports],
  templateUrl: './typology-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioTypologyBlockComponent {
  readonly rows = input.required<RawResult[]>();
  readonly dimension = signal<TypologyDimension>('program');

  readonly copy = PORTFOLIO_OVERVIEW_COPY;

  /** Cards always describe all page rows, whatever the dimension (S-3.1). */
  readonly cards = computed<LevelCard[]>(() => levelCards(this.rows()));
  readonly visibleCards = computed<LevelCard[]>(() => this.cards().filter(card => card.level !== 'unclassified' || card.count > 0));
  readonly programBreakdown = computed<Breakdown>(() => breakdownByProgram(this.rows()));
  readonly centerBreakdown = computed<Breakdown>(() => breakdownByCenter(this.rows()));
  readonly activeBreakdown = computed<Breakdown>(() => (this.dimension() === 'center' ? this.centerBreakdown() : this.programBreakdown()));
  /** Columns / bar levels: Unclassified when any PAGE row is unclassified, in both tabs (TYV-R-4/R-5). */
  readonly levels = computed<TypologyLevel[]>(() => {
    const hasUnclassified = this.cards().some(card => card.level === 'unclassified' && card.count > 0);
    return TYPOLOGY_LEVELS.filter(level => level !== 'unclassified' || hasUnclassified);
  });

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
    return LEVEL_FILL[level];
  }

  rowLabel(row: BreakdownRow): string {
    if (row.key !== '') return row.key;
    return this.dimension() === 'center' ? this.copy.noLeadCenter : this.copy.noProgram;
  }

  typeName(name: string): string {
    return name === '' ? this.copy.noType : name;
  }

  setDimension(value: string): void {
    if (value === 'program' || value === 'center') this.dimension.set(value);
  }
}
