import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Compact filter multiselect (PrimeNG `<p-multiselect>` replacement — 0 PrimeNG).
 *
 * A lightweight dropdown with native checkboxes whose trigger shows a count of the
 * selected items (not chips). Mirrors the p-multiselect filter API used across the
 * app: options, optionLabel, optionValue (when set the model holds values, otherwise
 * whole objects), placeholder, filter (search box), showHeader. Two-way `ngModel`
 * (array) + `(changed)` output for the old `(onChange)`/`(ngModelChange)` handlers.
 *
 * For the rich partner/chips multiselect keep using `app-pr-multi-select`.
 */
@Component({
  selector: 'app-pr-filter-multiselect',
  templateUrl: './pr-filter-multiselect.component.html',
  styleUrls: ['./pr-filter-multiselect.component.scss'],
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrFilterMultiselectComponent),
      multi: true
    }
  ]
})
export class PrFilterMultiselectComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() optionLabel: string;
  /** When set, the model holds `option[optionValue]`; otherwise it holds the whole option object. */
  @Input() optionValue: string;
  @Input() placeholder = 'Select';
  @Input() filter = false;
  @Input() showHeader = true;
  @Input() disabled = false;
  /** Grouped options: when true, `options` is a list of groups with `optionGroupChildren` arrays. */
  @Input() group = false;
  @Input() optionGroupChildren: string;
  @Input() optionGroupLabel = 'name';
  @Output() changed = new EventEmitter<any[]>();

  value: any[] = [];
  searchText = '';

  /** Backward-compat bridge for consumers that reset the selection via @ViewChild (`x._value = []`). */
  get _value(): any[] {
    return this.value;
  }
  set _value(v: any[]) {
    this.value = Array.isArray(v) ? v : [];
  }

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  private valueOf(option: any): any {
    return this.optionValue ? option?.[this.optionValue] : option;
  }

  isSelected(option: any): boolean {
    const v = this.valueOf(option);
    return (this.value || []).some(item => item === v);
  }

  toggle(option: any): void {
    if (this.disabled) return;
    const v = this.valueOf(option);
    const arr = [...(this.value || [])];
    const idx = arr.findIndex(item => item === v);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(v);
    this.value = arr;
    this.onChange(arr);
    this.changed.emit(arr);
  }

  get filteredOptions(): any[] {
    return this.applyFilter(this.options || []);
  }

  /** Groups with their (search-filtered) children, for grouped mode. */
  get filteredGroups(): { label: string; children: any[] }[] {
    const groups = this.options || [];
    return groups
      .map(g => ({
        label: g?.[this.optionGroupLabel],
        children: this.applyFilter(g?.[this.optionGroupChildren] || [])
      }))
      .filter(g => g.children.length);
  }

  private applyFilter(list: any[]): any[] {
    if (!this.filter || !this.searchText) return list;
    const q = this.searchText.toLowerCase();
    return list.filter(o => `${this.optionLabel ? o?.[this.optionLabel] : o}`.toLowerCase().includes(q));
  }

  get triggerLabel(): string {
    const count = (this.value || []).length;
    return count ? `${count} selected` : this.placeholder;
  }

  removeFocus(el: HTMLElement): void {
    el?.blur();
    this.onTouched();
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    this.value = Array.isArray(value) ? value : [];
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
