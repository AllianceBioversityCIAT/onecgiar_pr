// @akili-spec changes/portfolio-overview-revamp/global-filters (GLF-T-4, design 6.4, 6.7)
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSlidersHorizontal, lucideX } from '@ng-icons/lucide';
import { HlmBadge } from '@spartan/badge';
import { HlmButton } from '@spartan/button';
import { HlmSheet, HlmSheetContent, HlmSheetHeader, HlmSheetPortal, HlmSheetTitle } from '@spartan/sheet';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import { FILTER_DIMENSIONS, type FilterDimension, type FilterOption, activeDimensions, isActive } from '../../services/portfolio-filters';
import { PortfolioOverviewService } from '../../services/portfolio-overview.service';
import { FilterMultiSelectComponent } from './filter-multi-select.component';

export interface FilterChip {
  dimension: FilterDimension;
  value: string;
  label: string;
}

/**
 * The global filter bar of the Portfolio overview. It reads and writes the page's `PortfolioOverviewService`
 * directly (it lives inside the page's provider scope), so it has no inputs.
 */
@Component({
  selector: 'app-portfolio-filter-bar',
  standalone: true,
  imports: [NgTemplateOutlet, NgIcon, HlmBadge, HlmButton, HlmSheet, HlmSheetContent, HlmSheetHeader, HlmSheetPortal, HlmSheetTitle, FilterMultiSelectComponent],
  providers: [provideIcons({ lucideSlidersHorizontal, lucideX })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-bar.component.html'
})
export class FilterBarComponent {
  protected readonly data = inject(PortfolioOverviewService);
  protected readonly copy = PORTFOLIO_OVERVIEW_COPY.filters;
  protected readonly dimensions = FILTER_DIMENSIONS;
  protected readonly sheetOpen = signal(false);
  protected readonly sheetTitleId = 'pr-filter-sheet-title';

  protected readonly isActive = computed(() => isActive(this.data.selection()));
  /** Number of selected values; the sheet trigger shows it. */
  protected readonly selectedCount = computed(() => activeDimensions(this.data.selection()).reduce((n, d) => n + this.data.selection()[d].size, 0));

  /** Value -> label for every chip, from the same lists the controls render. */
  private readonly labels = computed(() => {
    const options = this.data.options();
    const map = new Map<string, string>();
    const put = (dimension: FilterDimension, list: readonly FilterOption[]) => list.forEach(o => map.set(`${dimension}:${o.value}`, o.label));
    put('program', options.program);
    put('project', options.project);
    put('center', options.center);
    put('status', options.status);
    for (const group of options.typology) {
      map.set(`typology:${group.value}`, group.label);
      put('typology', group.types);
    }
    return map;
  });

  protected readonly chips = computed<FilterChip[]>(() => {
    const selection = this.data.selection();
    const labels = this.labels();
    return activeDimensions(selection).flatMap(dimension => [...selection[dimension]].map(value => ({ dimension, value, label: labels.get(`${dimension}:${value}`) ?? value })));
  });

  protected readonly countText = computed(() => {
    if (this.data.filtersPending()) return this.copy.applying;
    const total = this.data.total();
    const totalText = total.toLocaleString('en-US');
    return this.isActive() ? this.copy.count(this.data.filteredTotal().toLocaleString('en-US'), totalText) : this.copy.countAll(totalText, total);
  });

  /** Project and Center need the map; the other three never wait for it. */
  protected isDisabled(dimension: FilterDimension): boolean {
    return (dimension === 'project' || dimension === 'center') && this.data.dimensions().status !== 'ready';
  }

  protected hintFor(dimension: FilterDimension): string {
    if (!this.isDisabled(dimension)) return '';
    return this.data.dimensions().status === 'error' ? this.copy.hintError : this.copy.hintLoading;
  }

  protected optionsFor(dimension: FilterDimension): readonly FilterOption[] {
    return dimension === 'typology' ? [] : this.data.options()[dimension];
  }

  protected toggle(dimension: FilterDimension, value: string): void {
    this.data.toggleValue(dimension, value);
  }

  protected remove(chip: FilterChip): void {
    this.data.toggleValue(chip.dimension, chip.value);
  }

  protected clearAll(): void {
    this.data.clearAll();
  }

  protected retry(): void {
    this.data.retryDimensions();
  }
}
