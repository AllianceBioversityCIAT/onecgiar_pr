// @akili-spec changes/portfolio-rejection-reason-export (PRE-T-3, design 8.1, DD-4)
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown } from '@ng-icons/lucide';
import { BrnCommandImports } from '@spartan-ng/brain/command';
import { HlmButtonImports } from '@spartan/button';
import { HlmPopover, HlmPopoverContent, HlmPopoverPortal } from '@spartan/popover';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import type { FilterOption } from '../../services/portfolio-filters';

export type DetailFilterDimension = 'funding' | 'status';

export interface DetailFilterToggle {
  dimension: DetailFilterDimension;
  value: string;
}

interface SectionView {
  dimension: DetailFilterDimension;
  label: string;
  options: readonly FilterOption[];
  selected: ReadonlySet<string>;
}

/**
 * The Filters dropdown of the Results detail toolbar: a trigger plus a Spartan Popover with a Command list of two
 * check-style sections (Funding, Status). Presentational: it holds NO selection. The page binds it to the global
 * selection, so a tick here is the same state as the top bar (PRE-R-2). Only "open" is local, like the top-bar select.
 */
@Component({
  selector: 'app-portfolio-detail-filters',
  standalone: true,
  imports: [HlmButtonImports, HlmPopover, HlmPopoverContent, HlmPopoverPortal, ...BrnCommandImports, NgIcon],
  providers: [provideIcons({ lucideCheck, lucideChevronDown })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-filters.component.html'
})
export class PortfolioDetailFiltersComponent {
  protected readonly copy = PORTFOLIO_OVERVIEW_COPY.detail.filters;

  readonly fundingOptions = input<readonly FilterOption[]>([]);
  readonly statusOptions = input<readonly FilterOption[]>([]);
  readonly fundingSelected = input<ReadonlySet<string>>(new Set<string>());
  readonly statusSelected = input<ReadonlySet<string>>(new Set<string>());
  readonly disabled = input(false);

  readonly toggled = output<DetailFilterToggle>();
  readonly cleared = output<void>();

  protected readonly open = signal(false);

  protected readonly listId = 'pr-detail-filters-list';
  protected readonly count = computed(() => this.fundingSelected().size + this.statusSelected().size);
  protected readonly triggerName = computed(() => this.copy.triggerName(this.count()));
  protected readonly sections = computed<SectionView[]>(() => [
    { dimension: 'funding', label: this.copy.funding, options: this.fundingOptions(), selected: this.fundingSelected() },
    { dimension: 'status', label: this.copy.status, options: this.statusOptions(), selected: this.statusSelected() }
  ]);

  protected toggleOpen(): void {
    if (this.disabled()) return;
    this.open.update(v => !v);
  }

  protected onState(state: 'open' | 'closed'): void {
    this.open.set(state === 'open');
  }

  /** Escape (PRE-R-6): close and put focus back on the Filters button, even where the overlay does not restore it itself. */
  protected closeAndRestore(trigger: HTMLElement): void {
    this.open.set(false);
    trigger.focus();
  }

  protected pick(dimension: DetailFilterDimension, value: string): void {
    this.toggled.emit({ dimension, value });
  }

  protected clear(): void {
    this.cleared.emit();
  }
}
