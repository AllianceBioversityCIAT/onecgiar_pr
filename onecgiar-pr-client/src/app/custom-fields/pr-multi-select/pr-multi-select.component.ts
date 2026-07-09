import { Component, forwardRef, inject, input, output, signal, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RolesService } from '../../shared/services/global/roles.service';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';
import { DataControlService } from '../../shared/services/data-control.service';

@Component({
  selector: 'app-pr-multi-select',
  templateUrl: './pr-multi-select.component.html',
  styleUrls: ['./pr-multi-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrMultiSelectComponent),
      multi: true
    }
  ],
  standalone: false
})
export class PrMultiSelectComponent implements ControlValueAccessor, OnChanges {
  readonly optionLabel = input<string>();
  readonly optionValue = input<string>();
  readonly options = input<any>();
  readonly disableOptions = input<any>();
  readonly placeholder = input<string>();
  readonly label = input<string>();
  readonly selectedLabel = input<string>();
  // Extra concatenation to increase or have an additional counter (some requirements need a second one).
  readonly nextSelectedLabel = input<string>();
  readonly selectedOptionLabel = input<string>();
  readonly description = input<string>();
  readonly readOnly = input<boolean>();
  readonly hideSelect = input<boolean>(false);
  readonly isStatic = input<boolean>(false);
  readonly showSelectAll = input<boolean>(false);
  readonly group = input<boolean>(false);
  readonly optionGroupLabel = input<string>();
  readonly optionGroupChildren = input<string>();
  readonly required = input<boolean>(true);
  readonly showPartnerAlert = input<boolean>(false);
  readonly flagsCode = input<string>();
  readonly confirmDeletion = input<boolean>(false);
  readonly logicalDeletion = input<boolean>(false);
  readonly labelDescInlineStyles = input<string>('');
  readonly selectedPrimary = input<any>();
  readonly cannotRemoveOptionValues = input<any[]>([]);
  readonly displayLabelFormatter = input<(option: any) => string>();
  readonly showDescriptionLabel = input<boolean>(true);

  readonly selectOptionEvent = output<any>();
  readonly removeOptionEvent = output<any>();

  selectAll = null;
  public searchText: string;

  private readonly _valueSig = signal<any[]>([]);

  /** Stable clones for flat mode, rebuilt only when the source `options` reference/length changes. */
  private _decorated: any[] = [];
  private _decoratedSource: any = null;

  readonly rolesSE = inject(RolesService);
  private readonly customizedAlertsFeSE = inject(CustomizedAlertsFeService);
  readonly dataControlSE = inject(DataControlService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['group']) {
      this.syncSelectionFlags();
    }
  }

  /**
   * Flat-mode options decorated with `selected`/`disabled` flags. Runs on every change detection
   * (called from the template), re-deriving flags from the CURRENT bound value. This is intentional:
   * several consumers mutate the bound model in place (e.g. a parent doing
   * `partnersBody.contributing_center.splice(i, 1)`), which does NOT change the array reference and so
   * never triggers `writeValue`. Re-deriving each cycle keeps the dropdown checkboxes in sync with
   * those external changes — exactly like the pre-signals getter did.
   *
   * Flags are applied to STABLE clones (rebuilt only when the source `options` reference/length
   * changes), so we never mutate the parent's original `options` array (fixes shared-reference
   * corruption) and the virtual-scroll checkbox bindings stay stable. Grouped mode keeps its in-place
   * decoration via `syncSelectionFlags`.
   */
  optionsIntance(): any[] {
    const opts = this.options();
    if (!opts?.length) {
      this._decorated = [];
      this._decoratedSource = opts;
      return this._decorated;
    }

    const optionValue = this.optionValue();
    const logicalDeletion = this.logicalDeletion();

    if (this._decoratedSource !== opts || this._decorated.length !== opts.length) {
      this._decorated = opts.map((o: any) => ({ ...o }));
      this._decoratedSource = opts;
    }

    for (const clone of this._decorated) {
      clone.disabled = false;
      clone.selected = false;
    }

    this.disableOptions()?.forEach((disableOption: any) => {
      const itemFinded = this._decorated.find((listItem: any) => listItem[optionValue] == disableOption[optionValue]);
      if (itemFinded) itemFinded.disabled = true;
    });

    this._valueSig()?.forEach((savedListItem: any) => {
      const savedId = typeof savedListItem === 'object' ? savedListItem?.[optionValue] : savedListItem;
      const itemFinded = this._decorated.find((listItem: any) => listItem[optionValue] == savedId);
      if (itemFinded) {
        itemFinded.selected = true;
        if (logicalDeletion) itemFinded.selected = savedListItem.is_active;
      }
    });

    return this._decorated;
  }

  selectAllF() {
    this.selectAll = !this.selectAll;

    if (this.group()) {
      const children = this.getAllChildrenFromGroups(this.options() || []);
      if (this.selectAll) {
        children.forEach((child: any) => (child.selected = true));
        this.value = [...children];
      } else {
        children.forEach((child: any) => (child.selected = false));
        this.value = [];
      }
    } else if (this.selectAll) {
      this.value = (this.options() || []).map((option: any) => ({ ...option }));
    } else {
      this.value = [];
    }

    setTimeout(() => {
      this.selectOptionEvent.emit({});
    }, 500);
  }

  get value(): any[] {
    return this._valueSig();
  }

  set value(v: any) {
    if (v !== this._valueSig()) {
      this._valueSig.set(v);
      this.onChange(v);
      if (this.group()) this.syncSelectionFlags();
    }
  }

  /** Backward-compat bridge: user-management pokes `_value` via @ViewChild to reset the entity filter. */
  get _value(): any {
    return this._valueSig();
  }
  set _value(v: any) {
    this._valueSig.set(v);
  }

  validateShowDeleteButton(option) {
    if (this.cannotRemoveOptionValues()?.length) {
      const id = typeof option === 'object' && option != null ? option[this.optionValue()] : option;
      if (id != null && this.cannotRemoveOptionValues().includes(id)) return false;
    }
    if (this.selectedPrimary()) {
      return !this.readOnly() && !this.rolesSE.readOnly && !this.isStatic() && this.selectedPrimary() !== option.id;
    }

    return !this.readOnly() && !this.rolesSE.readOnly && !this.isStatic();
  }

  selectedLabelDescription() {
    if (this.nextSelectedLabel()) return `${this.selectedLabel()}(${this.value?.length}) ${this.nextSelectedLabel()}(${this.value?.length})`;

    return `${this.selectedLabel()} (${this.value?.length})`;
  }

  onChange(_) {}

  onTouch() {}

  writeValue(value: any): void {
    const optionValue = this.optionValue();
    if (Array.isArray(value)) {
      // Only remap when some entries are raw IDs (chips need objects). When every entry is already an
      // object, keep the EXACT array reference so external in-place mutations (parent `.splice()`) stay
      // visible to `optionsIntance()`/chips without re-triggering writeValue.
      const needsMapping = value.some((v: any) => typeof v !== 'object' || v === null);
      if (needsMapping) {
        const source = this.group() ? this.getAllChildrenFromGroups(this.options() || []) : this.options() || [];
        const mapped = value
          .map((v: any) => (typeof v === 'object' && v !== null ? v : source.find((s: any) => s?.[optionValue] == v)))
          .filter(Boolean);
        this._valueSig.set(mapped);
      } else {
        this._valueSig.set(value);
      }
      if (this.group()) this.syncSelectionFlags();
      return;
    }
    this._valueSig.set(value);
    if (this.group()) this.syncSelectionFlags();
  }

  /** Grouped mode only: decorate the (original) grouped children in place, since the group template iterates them directly. */
  private syncSelectionFlags() {
    if (!this.group()) return;
    const optionValue = this.optionValue();
    const ids = new Set((this._valueSig() || []).map((v: any) => (typeof v === 'object' ? v?.[optionValue] : v)));
    const children = this.getAllChildrenFromGroups(this.options() || []);
    for (const child of children) {
      child.selected = ids.has(child?.[optionValue]);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  removeFocus() {
    const element: any = document.getElementById(this.optionValue());
    element.blur();
  }

  getUniqueId() {
    const id = (this.optionValue() + this.optionLabel() + this.label()).replace(' ', '');

    return id;
  }

  getAllChildrenFromGroups(groups: any[]): any[] {
    const list: any[] = [];
    if (!Array.isArray(groups)) return list;
    const childrenKey = this.optionGroupChildren();
    for (const group of groups) {
      const children = group?.[childrenKey] || [];
      for (const child of children) {
        list.push(child);
      }
    }
    return list;
  }

  filterChildrenBySearch(children: any[]): any[] {
    if (!this.searchText) return children || [];
    const optionLabel = this.optionLabel();
    const searchLower = this.searchText.toLowerCase();
    return (children || []).filter((c: any) => {
      const title = (c?.[optionLabel] || '').toString().toLowerCase();
      const resultCode = (c?.result_code || '').toString().toLowerCase();
      const acronym = (c?.acronym || '').toString().toLowerCase();
      const phaseYear = (c?.phase_year || '').toString().toLowerCase();
      const name = (c?.name || '').toString().toLowerCase();
      return (
        title.includes(searchLower) ||
        resultCode.includes(searchLower) ||
        acronym.includes(searchLower) ||
        phaseYear.includes(searchLower) ||
        name.includes(searchLower)
      );
    });
  }

  getDisplayLabel(option: any, useSelectedLabel: boolean = false): string {
    const formatter = this.displayLabelFormatter();
    if (formatter) {
      return formatter(option);
    }
    const selectedOptionLabel = this.selectedOptionLabel();
    if (useSelectedLabel && selectedOptionLabel) {
      return option?.[selectedOptionLabel] || '';
    }
    return option?.[this.optionLabel()] || '';
  }

  filterFlatOptions(options: any[]): any[] {
    if (!options?.length) return [];
    if (!this.searchText) return options;
    const optionLabel = this.optionLabel();
    const searchLower = this.searchText.toLowerCase();
    return options.filter((option: any) => {
      const title = (option?.[optionLabel] || '').toString().toLowerCase();
      const resultCode = (option?.result_code || '').toString().toLowerCase();
      const acronym = (option?.acronym || '').toString().toLowerCase();
      const phaseYear = (option?.phase_year || '').toString().toLowerCase();
      const name = (option?.name || '').toString().toLowerCase();
      return (
        title.includes(searchLower) ||
        resultCode.includes(searchLower) ||
        acronym.includes(searchLower) ||
        phaseYear.includes(searchLower) ||
        name.includes(searchLower)
      );
    });
  }

  confirmDeletionEvent(option) {
    this.customizedAlertsFeSE.show(
      {
        id: 'confirm-delete-item',
        title: `Are you sure you want to remove this Initiative from the contributors?`,
        description: `This will remove the ToC match made by the Initiative and in case you want to add it again, you will need to submit a new request.`,
        status: 'warning',
        confirmText: 'Yes, delete'
      },
      () => {
        this.removeOption(option);
      }
    );
  }

  onSelectOption(option) {
    this.selectAll = null;

    if (option?.disabled) return;

    const optionValue = this.optionValue();

    // Ensure value is initialized as an array
    if (!this.value) {
      this.value = [];
    }

    const indexFind = this.value.findIndex(valueItem => valueItem[optionValue] == option[optionValue]);
    if (indexFind < 0) {
      const newValue = [...(this.value || []), { ...option, new: true, is_active: true }];
      this.value = newValue;
    } else {
      // Option is being deselected
      const valueItemFind = this.value.find(valueItem => valueItem[optionValue] == option[optionValue]);
      if (this.logicalDeletion() && !valueItemFind.new) {
        const updated = this.value.map(item => {
          if (item[optionValue] == option[optionValue]) {
            return { ...item, is_active: !option.selected };
          }
          return item;
        });
        this.value = updated;
      } else {
        const filtered = this.value.filter((_, i) => i !== indexFind);
        this.value = filtered;
      }
    }

    this.selectOptionEvent.emit({ option });
  }

  removeOption(option) {
    this.selectAll = null;

    const optionValue = this.optionValue();

    // Ensure value is initialized as an array
    if (!this.value) {
      this.value = [];
    }

    if (this.logicalDeletion() && !option.new) {
      const updated = this.value.map(item => {
        if (item[optionValue] == option[optionValue]) return { ...item, is_active: false };
        return item;
      });
      this.value = updated;
    } else {
      const optionFinded = this.value.findIndex(valueItem => valueItem[optionValue] == option[optionValue]);
      const filtered = this.value.filter((_, i) => i !== optionFinded);
      this.value = filtered;
    }

    this.removeOptionEvent.emit({ remove: option });
  }
}
