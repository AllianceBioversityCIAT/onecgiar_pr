import { Component, forwardRef, Input, Output, EventEmitter } from '@angular/core';
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
  ]
})
export class PrMultiSelectComponent implements ControlValueAccessor {
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
  @Input() required: boolean = true;
  @Input() showPartnerAlert: boolean = false;
  @Input() flagsCode: string;
  @Input() confirmDeletion: boolean = false;
  @Input() logicalDeletion: boolean = false;
  @Input() selectedPrimary?: any;
  @Output() selectOptionEvent = new EventEmitter<any>();
  @Output() removeOptionEvent = new EventEmitter<any>();
  selectAll = null;

  private _optionsIntance: any[];
  private _value: any[] = [];
  private _beforeValueLength: number = 0;
  public searchText: string;
  private currentOptionsLength = 0;

  constructor(public rolesSE: RolesService, private customizedAlertsFeSE: CustomizedAlertsFeService, public dataControlSE: DataControlService) {}

  get optionsIntance() {
    if (!this.options?.length) return [];
    if (!this._optionsIntance?.length || this.currentOptionsLength != this.options?.length) this._optionsIntance = [...this.options];

    this.currentOptionsLength = this.options?.length;

    this._optionsIntance.forEach((resp: any) => {
      if (resp.disabled == true) resp.disabled = false;
      if (resp.selected == true) resp.selected = false;
    });

    this.disableOptions?.map(disableOption => {
      const itemFinded = this._optionsIntance.find(listItem => listItem[this.optionValue] == disableOption[this.optionValue]);
      if (itemFinded) itemFinded.disabled = true;
    });

    this.value?.map(savedListItem => {
      const itemFinded = this._optionsIntance.find(listItem => listItem[this.optionValue] == savedListItem[this.optionValue]);

      if (itemFinded) itemFinded.selected = true;

      if (itemFinded && this.logicalDeletion) itemFinded.selected = savedListItem.is_active;
    });

    this._beforeValueLength = this._value?.length;

    if (this.selectAll === false)
      this._optionsIntance.forEach((resp: any) => {
        if (resp.disabled) resp.selected = false;
        this.value = [];
      });

    if (this.selectAll === true) {
      this.value = [];
      this._optionsIntance.forEach((resp: any) => {
        if (resp.disabled) resp.selected = true;
        this.value.push(resp);
      });
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
    }
  }

  selectedLabelDescription() {
    if (this.nextSelectedLabel) return `${this.selectedLabel}(${this.value?.length}) ${this.nextSelectedLabel}(${this.value?.length})`;

    return `${this.selectedLabel} (${this.value?.length})`;
  }

  validateShowDeleteButton(option) {
    if (this.selectedPrimary) {
      return !this.readOnly && !this.rolesSE.readOnly && !this.isStatic && this.selectedPrimary !== option.id;
    }

    return !this.readOnly && !this.rolesSE.readOnly && !this.isStatic;
  }

  onChange(_) {}

  onTouch() {}

  writeValue(value: any): void {
    this._value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  toggleSelectOption(option) {
    if (option?.disabled) return;
    option.selected = !option.selected;
  }

  removeFocus() {
    const element: any = document.getElementById(this.optionValue);
    element.blur();
  }

  getUniqueId() {
    const id = (this.optionValue + this.optionLabel + this.label).replace(' ', '');

    return id;
  }

  confirmDeletionEvent(option) {
    this.customizedAlertsFeSE.show({ id: 'confirm-delete-item', title: `Are you sure you want to remove this Initiative from the contributors?`, description: `This will remove the ToC match made by the Initiative and in case you want to add it again, you will need to submit a new request.`, status: 'warning', confirmText: 'Yes, delete' }, () => {
      this.removeOption(option);
    });
  }

  onSelectOption(option) {
    this.selectAll = null;

    if (option?.disabled) return;

    const indexFind = this.value.findIndex(valueItem => valueItem[this.optionValue] == option[this.optionValue]);
    if (indexFind < 0) {
      this.value.push({ ...option, new: true, is_active: true });
    } else {
      const valueItemFind = this.value.find(valueItem => valueItem[this.optionValue] == option[this.optionValue]);
      if (this.logicalDeletion && !valueItemFind.new) {
        if (!option.selected) {
          valueItemFind.is_active = true;
        } else {
          valueItemFind.is_active = false;
        }
      } else {
        this.value.splice(indexFind, 1);
      }
    }

    this.selectOptionEvent.emit({ option });
  }

  removeOption(option) {
    this.selectAll = null;
    if (this.logicalDeletion && !option.new) {
      option.is_active = false;
    } else {
      const optionFinded = this.value.findIndex(valueItem => valueItem[this.optionValue] == option[this.optionValue]);
      this.value.splice(optionFinded, 1);
    }

    this.removeOptionEvent.emit({ remove: option });
  }
}
