// @akili-spec changes/portfolio-overview-revamp/global-filters (GLF-T-4, design 6.4, DD-10)
import { ChangeDetectionStrategy, Component, computed, input, output, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown } from '@ng-icons/lucide';
import { BrnCommand, BrnCommandImports } from '@spartan-ng/brain/command';
import { HlmPopover, HlmPopoverContent, HlmPopoverPortal } from '@spartan/popover';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import type { FilterOption, TypologyOptionGroup } from '../../services/portfolio-filters';

interface ItemView {
  value: string;
  label: string;
  hint?: string;
  indent: boolean;
}

interface SectionView {
  key: string;
  label: string | null;
  items: ItemView[];
}

/**
 * One multi-select of the global filter bar: a trigger button plus a Spartan Popover holding a Command list
 * of checkbox-style items. No state of its own besides "open": the selection comes in and toggles go out.
 * Optional search (Project, Center) and optional level groups (Typology).
 */
@Component({
  selector: 'app-filter-multi-select',
  standalone: true,
  imports: [HlmPopover, HlmPopoverContent, HlmPopoverPortal, ...BrnCommandImports, NgIcon],
  providers: [provideIcons({ lucideCheck, lucideChevronDown })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-multi-select.component.html'
})
export class FilterMultiSelectComponent {
  protected readonly copy = PORTFOLIO_OVERVIEW_COPY.filters;

  /** Dimension key, used for test ids and element ids. */
  readonly dimension = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input<readonly FilterOption[]>([]);
  readonly groups = input<readonly TypologyOptionGroup[]>([]);
  readonly selected = input<ReadonlySet<string>>(new Set<string>());
  readonly searchable = input(false);
  readonly disabled = input(false);
  /** Why the control is disabled; read by assistive tech through aria-describedby. */
  readonly hint = input('');

  readonly toggled = output<string>();

  protected readonly open = signal(false);
  private readonly command = viewChild(BrnCommand);

  /** Same rule as Brain's own default filter; used when the visible search box is on. */
  private readonly searchFilter = (value: string, search: string): boolean => value.toLowerCase().includes(search.toLowerCase());
  /** Non-searchable: the input is hidden, so whatever reaches it must never hide an option. */
  private readonly matchAll = (): boolean => true;
  protected readonly filter = computed(() => (this.searchable() ? this.searchFilter : this.matchAll));

  protected readonly count = computed(() => this.selected().size);
  protected readonly triggerName = computed(() => (this.count() > 0 ? `${this.label()}, ${this.copy.selectedCount(this.count())}` : this.label()));
  protected readonly listId = computed(() => `pr-filter-list-${this.dimension()}`);
  protected readonly hintId = computed(() => `pr-filter-hint-${this.dimension()}`);

  protected readonly sections = computed<SectionView[]>(() => {
    const out: SectionView[] = [];
    const flat = this.options();
    if (flat.length > 0) out.push({ key: 'flat', label: null, items: flat.map(o => ({ value: o.value, label: o.label, hint: o.hint, indent: false })) });
    for (const group of this.groups()) {
      out.push({
        key: group.value,
        label: group.label,
        items: [{ value: group.value, label: this.copy.levelAll(group.label), indent: false }, ...group.types.map(t => ({ value: t.value, label: t.label, hint: t.hint, indent: true }))]
      });
    }
    return out;
  });

  protected toggleOpen(): void {
    if (this.disabled()) return;
    this.open.update(v => !v);
  }

  protected onState(state: 'open' | 'closed'): void {
    this.open.set(state === 'open');
  }

  protected isSelected(value: string): boolean {
    return this.selected().has(value);
  }

  /**
   * Non-searchable only: the command input is just the keyboard target (arrows and Enter are Brain's own). Space is the
   * Enter equivalent: it emits `selected` on the key manager's active item, which is Brain's protected `selectActiveItem()`.
   * No printable key may reach the hidden input. A searchable input keeps typing (a space included).
   */
  protected onInputKey(event: KeyboardEvent): void {
    if (this.searchable() || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    event.preventDefault();
    if (event.key === ' ') this.command()?.keyManager.activeItem?.selected.emit();
  }

  protected pick(value: string): void {
    this.toggled.emit(value);
  }
}
