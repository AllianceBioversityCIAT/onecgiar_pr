import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, forwardRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HlmInput } from '@spartan/input';

/**
 * Compact single-choice filter dropdown — the pill used in toolbars ("Section ⌄", "Status ⌄").
 *
 * Sibling of `app-pr-filter-multiselect`: same `.custom_select` shell (focus-within opens the
 * panel, no CDK overlay) and the same trigger metrics, but the model holds ONE value instead of an
 * array. Reference: `PRMS Reporting.dc.html` → `mkSelect` — placeholder shown in `--pr-text-subtle`
 * while nothing is picked, the active option tinted `#F5F3FF` / `#5733C4` / 500.
 *
 * Use this instead of a bare `<select>`: the native control renders with the OS look and breaks the
 * design line (see `onecgiar-pr-client/CLAUDE.md` §5).
 */
@Component({
  selector: 'app-pr-filter-select',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmInput],
  templateUrl: './pr-filter-select.component.html',
  styleUrls: ['./pr-filter-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrFilterSelectComponent),
      multi: true
    }
  ]
})
export class PrFilterSelectComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() optionLabel: string;
  /** When set, the model holds `option[optionValue]`; otherwise it holds the whole option object. */
  @Input() optionValue: string;
  @Input() placeholder = 'Select';
  @Input() disabled = false;
  /** Enables in-panel search input above the options list. */
  @Input() filter = false;
  /** Placeholder for the search input when filter is enabled. */
  @Input() filterPlaceholder = 'Search';
  /**
   * Value that means "no filter". Selecting the option that carries it clears the pill back to the
   * placeholder. Defaults to `'all'` — the sentinel the reporting band already uses.
   */
  @Input() emptyValue: any = 'all';
  @Output() changed = new EventEmitter<any>();

  value: any = null;
  searchText = '';

  // OnPush + CVA: a value written from the parent (filter reset, deep link) is not a template
  // event, so the view would keep the stale label until something else triggered CD.
  private readonly cdr = inject(ChangeDetectorRef);

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  private valueOf(option: any): any {
    return this.optionValue ? option?.[this.optionValue] : option;
  }

  labelOf(option: any): string {
    return this.optionLabel ? option?.[this.optionLabel] : option;
  }

  isSelected(option: any): boolean {
    return this.valueOf(option) === this.value;
  }

  get filteredOptions(): any[] {
    if (!this.filter || !this.searchText) {
      return this.options || [];
    }
    const q = this.searchText.toLowerCase().trim();
    if (!q) return this.options || [];
    return (this.options || []).filter(option => {
      const label = this.labelOf(option);
      return (label ? String(label) : '').toLowerCase().includes(q);
    });
  }

  clearSearch(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.searchText = '';
    this.cdr.markForCheck();
  }

  onSearchChange(): void {
    this.cdr.markForCheck();
  }

  onSearchEnter(trigger?: HTMLElement): void {
    const list = this.filteredOptions;
    if (list.length === 1) {
      this.pick(list[0], trigger);
    }
  }

  private blurAll(trigger?: HTMLElement): void {
    trigger?.blur();
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === 'function') {
      active.blur();
    }
  }

  /** Picking the active option again clears the filter — same affordance as the reference. */
  pick(option: any, trigger?: HTMLElement): void {
    if (this.disabled) return;
    const next = this.valueOf(option);
    this.value = next === this.value ? this.emptyValue : next;
    this.onChange(this.value);
    this.changed.emit(this.value);
    this.searchText = '';
    this.blurAll(trigger);
  }

  get hasValue(): boolean {
    return this.value !== null && this.value !== undefined && this.value !== '' && this.value !== this.emptyValue;
  }

  get triggerLabel(): string {
    if (!this.hasValue) return this.placeholder;
    const selected = (this.options || []).find(o => this.valueOf(o) === this.value);
    return selected ? this.labelOf(selected) : this.placeholder;
  }

  removeFocus(el?: HTMLElement): void {
    this.searchText = '';
    this.blurAll(el);
    this.onTouched();
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    this.value = value;
    this.cdr.markForCheck();
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }
}
