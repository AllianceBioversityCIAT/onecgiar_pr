import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { buildQuickTypologyChips, ResultTypeQuickChip } from './reporting-quick-typology.util';

@Component({
  selector: 'app-reporting-quick-typology-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-1.5 overflow-x-auto custom_scroll"
      role="group"
      aria-label="Quick typology filters"
      data-testid="quick-typology-filters">
      @for (chip of chips(); track chip.id) {
        <button
          type="button"
          (click)="onChipClick(chip)"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-all cursor-pointer max-[1366px]:px-2"
          [class]="chip.active
            ? 'border-[var(--pr-color-primary-400)] bg-[var(--pr-color-primary-400)] font-semibold text-white shadow-xs'
            : 'border-[var(--pr-border)] bg-[var(--pr-surface-card)] font-medium text-[var(--pr-text-secondary)] hover:border-[var(--pr-color-primary-300)]'"
          [attr.aria-pressed]="chip.active"
          [attr.aria-label]="chip.label"
          [title]="chip.label">
          <span class="max-[1366px]:hidden">{{ chip.label }}</span>
          <span class="hidden max-[1366px]:inline">{{ chip.shortLabel }}</span>
          @if (chip.count !== undefined && chip.count !== null) {
            <span
              class="rounded-full px-1.5 py-0.2 text-[10.5px] tabular-nums"
              [class]="chip.active ? 'bg-white/20 font-bold text-white' : 'bg-slate-100 font-medium text-slate-600'">
              {{ chip.count }}
            </span>
          }
        </button>
      }
    </div>
  `
})
export class ReportingQuickTypologyFiltersComponent {
  readonly typologyValue = input<string[]>([]);
  readonly typologyCounts = input<Record<string, number> | null>(null);
  readonly plannedResultsCount = input(0);

  readonly typologyChange = output<string[]>();

  readonly chips = computed(() =>
    buildQuickTypologyChips(this.typologyValue(), this.typologyCounts(), this.plannedResultsCount())
  );

  onChipClick(chip: ResultTypeQuickChip): void {
    if (chip.matchKey === 'all' || chip.active) {
      this.typologyChange.emit([]);
    } else {
      this.typologyChange.emit([chip.matchKey]);
    }
  }
}
