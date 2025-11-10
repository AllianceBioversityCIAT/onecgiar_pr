import { Component, forwardRef, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
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
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() options: any;
  @Input() disableOptions: any;
  @Input() placeholder: string;
  @Input() label: string;
  @Input() selectedLabel: string;
  @Input() nextSelectedLabel?: string; // This variable represents the extra concatenation to increase or have an additional counter, since by default it only shows one counter and the requirements make us generate an additional one.
  @Input() selectedOptionLabel: string;
  @Input() description: string;
  @Input() readOnly: boolean;
  @Input() hideSelect?: boolean = false;
  @Input() isStatic: boolean = false;
  @Input() showSelectAll: boolean = false;
  @Input() group: boolean = false;
  @Input() optionGroupLabel: string;
  @Input() optionGroupChildren: string;
  @Input() required: boolean = true;
  @Input() showPartnerAlert: boolean = false;
  @Input() flagsCode: string;
  @Input() confirmDeletion: boolean = false;
  @Input() logicalDeletion: boolean = false;
  @Input() labelDescInlineStyles?: string = '';
  @Input() selectedPrimary?: any;
  @Input() displayLabelFormatter?: (option: any) => string;
  @Output() selectOptionEvent = new EventEmitter<any>();
  @Output() removeOptionEvent = new EventEmitter<any>();
  selectAll = null;

  private _optionsIntance: any[];
  private _value: any[] = [];
  private _beforeValueLength: number = 0;
  public searchText: string;
  private currentOptionsLength = 0;

  constructor(
    public rolesSE: RolesService,
    private customizedAlertsFeSE: CustomizedAlertsFeService,
    public dataControlSE: DataControlService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['group']) {
      this.syncSelectionFlags();
    }
  }

  get optionsIntance() {
    if (!this.options?.length) return [];
    if (!this._optionsIntance?.length || this.currentOptionsLength != this.options?.length) this._optionsIntance = [...this.options];

    this.currentOptionsLength = this.options?.length;

    if (!this.group) {
      this._optionsIntance.forEach((resp: any) => {
        if (resp.disabled === true) resp.disabled = false;
        if (resp.selected === true) resp.selected = false;
      });

      this.disableOptions?.map(disableOption => {
        const itemFinded = this._optionsIntance.find(listItem => listItem[this.optionValue] == disableOption[this.optionValue]);
        if (itemFinded) itemFinded.disabled = true;
      });

    this.value?.map(savedListItem => {
      const savedId = typeof savedListItem === 'object' ? savedListItem?.[this.optionValue] : savedListItem;
      const itemFinded = this._optionsIntance.find(listItem => listItem[this.optionValue] == savedId);

        if (itemFinded) itemFinded.selected = true;

        if (itemFinded && this.logicalDeletion) itemFinded.selected = savedListItem.is_active;
      });

      this._beforeValueLength = this._value?.length;

      if (this.selectAll === false)
        this._optionsIntance.forEach((resp: any) => {
          if (resp.disabled === true) resp.selected = false;
          this.value = [];
        });

    if (this.selectAll === true) {
      const newSelection: any[] = [];
      this._optionsIntance.forEach((resp: any) => {
        if (resp.disabled === true) resp.selected = true;
        newSelection.push(resp);
      });
      this.value = newSelection;
    }

      return this._optionsIntance;
    }

    // Grouped mode: reset flags on all children
    const children = this.getAllChildrenFromGroups(this._optionsIntance);

    for (const child of children) {
      if (child.disabled === true) child.disabled = false;
      if (child.selected === true) child.selected = false;
    }

    this.disableOptions?.map(disableOption => {
      const itemFinded = children.find(listItem => listItem[this.optionValue] == disableOption[this.optionValue]);
      if (itemFinded) itemFinded.disabled = true;
    });

    this.value?.map(savedListItem => {
      const savedId = typeof savedListItem === 'object' ? savedListItem?.[this.optionValue] : savedListItem;
      const itemFinded = children.find(listItem => listItem[this.optionValue] == savedId);
      if (itemFinded) itemFinded.selected = true;
      if (itemFinded && this.logicalDeletion) itemFinded.selected = savedListItem.is_active;
    });

    if (this.selectAll === false) {
      for (const child of children) {
        if (child.disabled === true) child.selected = false;
      }
      this.value = [];
    }

    if (this.selectAll === true) {
      const newSelection: any[] = [];
      for (const child of children) {
        if (child.disabled === true) child.selected = true;
        newSelection.push(child);
      }
      this.value = newSelection;
    }

    return this._optionsIntance;
  }

  selectAllF() {
    this.selectAll = !this.selectAll;
    setTimeout(() => {
      this.selectOptionEvent.emit({});
    }, 500);
  }

  get value(): any[] {
    return this._value;
  }

  set value(v: any) {
    if (v !== this._value) {
      this._value = v;
      this.onChange(v);
      this.syncSelectionFlags();
    }
  }

  validateShowDeleteButton(option) {
    if (this.selectedPrimary) {
      return !this.readOnly && !this.rolesSE.readOnly && !this.isStatic && this.selectedPrimary !== option.id;
    }

    return !this.readOnly && !this.rolesSE.readOnly && !this.isStatic;
  }

  selectedLabelDescription() {
    if (this.nextSelectedLabel) return `${this.selectedLabel}(${this.value?.length}) ${this.nextSelectedLabel}(${this.value?.length})`;

    return `${this.selectedLabel} (${this.value?.length})`;
  }

  onChange(_) {}

  onTouch() {}

  writeValue(value: any): void {
    // Support receiving array of IDs by mapping them to option objects for chip rendering
    if (Array.isArray(value)) {
      const source = this.group ? this.getAllChildrenFromGroups(this.options || []) : (this.options || []);
      const mapped = value
        .map((v: any) => (typeof v === 'object' ? v : source.find((s: any) => s?.[this.optionValue] == v)))
        .filter(Boolean);
      this._value = mapped;
      this.syncSelectionFlags();
      return;
    }
    this._value = value;
    this.syncSelectionFlags();
  }

  private syncSelectionFlags() {
    const ids = new Set((this._value || []).map((v: any) => (typeof v === 'object' ? v?.[this.optionValue] : v)));
    if (!ids.size) {
      // clear all flags
      if (this.group) {
        const children = this.getAllChildrenFromGroups(this.options || []);
        for (const child of children) child.selected = false;
      } else {
        for (const opt of this.options || []) opt.selected = false;
      }
      return;
    }
    if (this.group) {
      const children = this.getAllChildrenFromGroups(this.options || []);
      for (const child of children) {
        child.selected = ids.has(child?.[this.optionValue]);
      }
    } else {
      for (const opt of this.options || []) {
        opt.selected = ids.has(opt?.[this.optionValue]);
      }
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  removeFocus() {
    const element: any = document.getElementById(this.optionValue);
    element.blur();
  }

  getUniqueId() {
    const id = (this.optionValue + this.optionLabel + this.label).replace(' ', '');

    return id;
  }

  getAllChildrenFromGroups(groups: any[]): any[] {
    const list: any[] = [];
    if (!Array.isArray(groups)) return list;
    for (const group of groups) {
      const children = group?.[this.optionGroupChildren] || [];
      for (const child of children) {
        list.push(child);
      }
    }
    return list;
  }

  filterChildrenBySearch(children: any[]): any[] {
    if (!this.searchText) return children || [];
    const searchLower = this.searchText.toLowerCase();
    return (children || []).filter((c: any) => {
      const title = (c?.[this.optionLabel] || '').toString().toLowerCase();
      const resultCode = (c?.result_code || '').toString().toLowerCase();
      return title.includes(searchLower) || resultCode.includes(searchLower);
    });
  }

  getDisplayLabel(option: any, useSelectedLabel: boolean = false): string {
    if (this.displayLabelFormatter) {
      return this.displayLabelFormatter(option);
    }
    if (useSelectedLabel && this.selectedOptionLabel) {
      return option?.[this.selectedOptionLabel] || '';
    }
    return option?.[this.optionLabel] || '';
  }

  filterFlatOptions(options: any[]): any[] {
    if (!options?.length) return [];
    if (!this.searchText) return options;
    const searchLower = this.searchText.toLowerCase();
    return options.filter((option: any) => {
      const title = (option?.[this.optionLabel] || '').toString().toLowerCase();
      const resultCode = (option?.result_code || '').toString().toLowerCase();
      return title.includes(searchLower) || resultCode.includes(searchLower);
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

    // Ensure value is initialized as an array
    if (!this.value) {
      this.value = [];
    }

    const indexFind = this.value.findIndex(valueItem => valueItem[this.optionValue] == option[this.optionValue]);
    if (indexFind < 0) {
      const newValue = [...(this.value || []), { ...option, new: true, is_active: true }];
      this.value = newValue;
    } else {
      // Option is being deselected
      const valueItemFind = this.value.find(valueItem => valueItem[this.optionValue] == option[this.optionValue]);
      if (this.logicalDeletion && !valueItemFind.new) {
        const updated = this.value.map(item => {
          if (item[this.optionValue] == option[this.optionValue]) {
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

    // Ensure value is initialized as an array
    if (!this.value) {
      this.value = [];
    }

    if (this.logicalDeletion && !option.new) {
      const updated = this.value.map(item => {
        if (item[this.optionValue] == option[this.optionValue]) return { ...item, is_active: false };
        return item;
      });
      this.value = updated;
    } else {
      const optionFinded = this.value.findIndex(valueItem => valueItem[this.optionValue] == option[this.optionValue]);
      const filtered = this.value.filter((_, i) => i !== optionFinded);
      this.value = filtered;
    }

    this.removeOptionEvent.emit({ remove: option });
  }
}
