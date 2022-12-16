import { Component, forwardRef, Input, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RolesService } from '../../shared/services/global/roles.service';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';

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
  constructor(public rolesSE: RolesService, private customizedAlertsFeSE: CustomizedAlertsFeService) {}
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() options: any;
  @Input() disableOptions: any;
  @Input() placeholder: string;
  @Input() label: string;
  @Input() selectedLabel: string;
  @Input() selectedOptionLabel: string;
  @Input() description: string;
  @Input() readOnly: boolean;
  @Input() isStatic: boolean = false;
  @Input() required: boolean = true;
  @Input() flagsCode: string;
  @Input() confirmDeletion: boolean;
  @Output() selectOptionEvent = new EventEmitter<any>();
  @Output() removeOptionEvent = new EventEmitter<any>();

  private _optionsIntance: any[];
  private _value: any[] = [];
  private _beforeValueLength: number = 0;
  public searchText: string;
  get optionsIntance() {
    if (!this._optionsIntance?.length) this._optionsIntance = JSON.parse(JSON.stringify(this.options));
    // if ((this._beforeValueLength | 0) != (this._value?.length | 0) || this.init) {
    // console.log('optionsIntance');
    this._optionsIntance.map((resp: any) => {
      resp.disabled = false;
      resp.selected = false;
    });
    this.disableOptions?.map(disableOption => {
      let itemFinded = this._optionsIntance.find(listItem => listItem[this.optionValue] == disableOption[this.optionValue]);
      if (itemFinded) itemFinded.disabled = true;
    });

    this.value?.map(savedListItem => {
      let itemFinded = this._optionsIntance.find(listItem => listItem[this.optionValue] == savedListItem[this.optionValue]);
      if (itemFinded) itemFinded.selected = true;
    });
    // }

    this._beforeValueLength = this._value?.length;

    return this._optionsIntance;
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
    // console.log('removeFocus');
    const element: any = document.getElementById(this.optionValue);
    element.blur();
  }

  getUniqueId() {
    const id = (this.optionValue + this.optionLabel + this.label).replace(' ', '');
    // console.log(id);
    return id;
  }

  confirmDeletionEvent(option) {
    this.customizedAlertsFeSE.show({ id: 'confirm-delete-item', title: `Are you sure you want to remove this initiative from the contributors?`, description: `This will remove the ToC match made by the initiative and in case you want to add it again, you will need to submit a new request.`, status: 'warning', confirmText: 'Yes, delete' }, () => {
      this.removeOption(option);
    });
  }

  onSelectOption(option) {
    if (option?.disabled) return;
    // this.onChange(null);
    // console.log('onSelectOption');
    const optionFinded = this.value.findIndex(valueItem => valueItem[this.optionValue] == option[this.optionValue]);
    if (optionFinded < 0) {
      this.value.push(option);
    } else {
      // console.log('lo enceutra');
      this.value.splice(optionFinded, 1);
      // let itemFinded = this._optionsIntance.find(listItem => listItem[this.optionValue] == option[this.optionValue]);
      // if (itemFinded) itemFinded.selected = false;
    }
    this.selectOptionEvent.emit();
  }

  removeOption(option) {
    const optionFinded = this.value.findIndex(valueItem => valueItem[this.optionValue] == option[this.optionValue]);
    this.value.splice(optionFinded, 1);
    // let itemFinded = this._optionsIntance.find(listItem => listItem[this.optionValue] == option[this.optionValue]);
    // if (itemFinded) itemFinded.selected = false;
    this.removeOptionEvent.emit({ remove: option });
  }

  selectBySavedList(savedList: any[]) {
    // console.log(this.options);
    // console.log(savedList);
    // savedList?.map(savedListItem => {
    //   let itemFinded = listBr.find(listItem => listItem[this.optionValue] == savedListItem[this.optionValue]);
    //   if (itemFinded) itemFinded.selected = true;
    // });
    // return listBr;
  }
}
