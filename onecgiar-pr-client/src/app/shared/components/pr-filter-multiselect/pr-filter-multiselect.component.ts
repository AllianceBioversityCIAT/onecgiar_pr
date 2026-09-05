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
  /**
   * Noun for the trigger when more than one option is picked ("3 sections"). When set, a single
   * selection shows that option's own label instead of "1 …" — the reference behaviour for the
   * reporting Section filter. Left unset the trigger keeps the historical "N selected".
   */
  @Input() countLabel: string;
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

  /**
   * Value equality for the model.
   *
   * ⚠️ P2-3307 / P2-3308: this used to be `item === v`. When the consumer does not pass
   * `optionValue` the model holds whole option objects, so identity comparison only matched
   * when the preselected entries were the *same instances* as the ones in `options`. A caller
   * that preloads its selection from a different response (a copy, not the same object) got
   * every entry rendered as unselected, and clicking it pushed a duplicate instead of removing it.
   * The PrimeNG `<p-multiselect>` this component replaced (migration `8fea5077b`) compared with
   * `ObjectUtils.equals`; that behaviour was lost and is restored here as a shallow compare.
   */
  private sameValue(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(k => a[k] === b[k]);
  }

  isSelected(option: any): boolean {
    const v = this.valueOf(option);
    return (this.value || []).some(item => this.sameValue(item, v));
  }

  toggle(option: any): void {
    if (this.disabled) return;
    const v = this.valueOf(option);
    const arr = [...(this.value || [])];
    const idx = arr.findIndex(item => this.sameValue(item, v));
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(v);
    this.value = arr;
    this.onChange(arr);
    this.changed.emit(arr);
  }

  // @akili-spec changes/my-work-board (MWB-T-13)
  /**
   * `trackBy` for both row loops — the option's VALUE, exactly what the model stores
   * (`optionValue ? option[optionValue] : option`).
   *
   * Without it the panel closed on the first click. The panel is shown by `.field:focus-within`,
   * so it only stays open while focus stays inside it; the click that ticks a row focuses that
   * row's checkbox, and any `*ngFor` pass that destroys the row takes the focused node with it —
   * focus falls back to `<body>`, `:focus-within` goes false, panel gone (measured by MWB-T-14 on
   * the Results tab's Section control). Keying on the value survives both a rebuilt wrapper list
   * and a fresh `options` array carrying equal-but-new option objects.
   */
  trackByOption = (_index: number, option: any): any => this.valueOf(option) ?? option;

  /** `trackBy` for the group loop — the group label, which is what identifies a group here. */
  trackByGroup = (_index: number, group: { label: string }): any => group?.label;

  // ── Memoised option lists ───────────────────────────────────────────────────────────────
  // Both getters below are read from the template, so they run on EVERY change-detection pass.
  // Rebuilding their arrays there was the other half of the closing-panel bug: grouped mode
  // minted brand-new `{ label, children }` wrappers each pass, which the outer `*ngFor` (identity
  // diffing) could only read as "every group replaced". They are computed once per real change
  // and cached, so an unchanged control hands `*ngFor` the SAME array instance and it does not
  // diff at all.
  //
  // Invalidation is lazy rather than `ngOnChanges`-driven on purpose: `options` is assigned
  // imperatively as often as it is bound (specs and the `@ViewChild` `_value` bridge both do it),
  // and a cache that only refreshed on a binding pass would go stale for those callers.
  private cacheKey: string | null = null;
  private cachedSource: any[] | null = null;
  private cachedOptions: any[] = [];
  private cachedGroups: { label: string; children: any[] }[] = [];

  get filteredOptions(): any[] {
    this.refreshCache();
    return this.cachedOptions;
  }

  /** Groups with their (search-filtered) children, for grouped mode. */
  get filteredGroups(): { label: string; children: any[] }[] {
    this.refreshCache();
    return this.cachedGroups;
  }

  /** Every input the two lists are derived from, except `options` itself (compared separately). */
  private currentCacheKey(): string {
    return [this.group, this.optionLabel, this.optionGroupChildren, this.optionGroupLabel, this.filter, this.searchText].join('\u0000');
  }

  private refreshCache(): void {
    const source = this.options || [];
    const key = this.currentCacheKey();

    if (this.cacheKey === key && this.cachedSource !== null && this.sameSource(this.cachedSource, source)) {
      // Content-equal but a different array instance: adopt the new reference so the next pass
      // takes the `===` fast path, and keep the cached lists (and with them every DOM row).
      this.cachedSource = source;
      return;
    }

    this.cacheKey = key;
    this.cachedSource = source;
    this.cachedOptions = this.applyFilter(source);
    this.cachedGroups = source
      .map(g => ({
        label: g?.[this.optionGroupLabel],
        children: this.applyFilter(g?.[this.optionGroupChildren] || [])
      }))
      .filter(g => g.children.length);
  }

  /** Cheap `===`, then a content compare — the group shape when grouped, options otherwise. */
  private sameSource(a: any[], b: any[]): boolean {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    if (!this.group) return a.every((option, index) => this.sameValue(option, b[index]));
    return a.every((group, index) => {
      const other = b[index];
      if (group === other) return true;
      if (group?.[this.optionGroupLabel] !== other?.[this.optionGroupLabel]) return false;
      const children = group?.[this.optionGroupChildren] || [];
      const otherChildren = other?.[this.optionGroupChildren] || [];
      return children.length === otherChildren.length && children.every((child, i) => this.sameValue(child, otherChildren[i]));
    });
  }

  private applyFilter(list: any[]): any[] {
    if (!this.filter || !this.searchText) return list;
    const q = this.searchText.toLowerCase();
    return list.filter(o => `${this.optionLabel ? o?.[this.optionLabel] : o}`.toLowerCase().includes(q));
  }

  /** Flattens grouped options so a selected value can be resolved back to its label. */
  private get allOptions(): any[] {
    const opts = this.options || [];
    return this.group ? opts.flatMap(g => g?.[this.optionGroupChildren] || []) : opts;
  }

  get triggerLabel(): string {
    const selected = this.value || [];
    if (!selected.length) return this.placeholder;
    if (!this.countLabel) return `${selected.length} selected`;
    if (selected.length === 1) {
      const option = this.allOptions.find(o => this.valueOf(o) === selected[0]);
      if (option) return this.optionLabel ? option[this.optionLabel] : option;
    }
    return `${selected.length} ${this.countLabel}`;
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
