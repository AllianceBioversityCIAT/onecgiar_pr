import { Component, forwardRef, Input, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RolesService } from '../../shared/services/global/roles.service';

@Component({
  selector: 'app-pr-select',
  templateUrl: './pr-select.component.html',
  styleUrls: ['./pr-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrSelectComponent),
      multi: true
    }
  ]
})
export class PrSelectComponent implements ControlValueAccessor {
  constructor(public rolesSE: RolesService) {}
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() options: any;
  @Input() placeholder: string;
  @Input() label: string;
  @Input() description: string;
  @Input() readOnly: boolean;
  @Input() isStatic: boolean;
  @Input() required: boolean = true;
  @Input() flagsCode: string;
  @Input() disableOptions: any;
  @Input() disabled: any = false;
  @Input() editable: boolean = false;

  @Output() selectOptionEvent = new EventEmitter();
  private _optionsIntance: any[];
  private _value: string;
  public fullValue: any = {};
  public searchText: string;

  get value(): any {
    return this._value;
  }

  set value(v: string) {
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
  //? Extra
  removeFocus() {
    // console.log('removeFocus');
    const element: any = document.getElementById(this.optionValue);
    element.blur();
  }
  get optionsIntance() {
    if (!this._optionsIntance?.length) this._optionsIntance = JSON.parse(JSON.stringify(this.options));

    this._optionsIntance.map((resp: any) => {
      resp.disabled = false;
      resp.selected = false;
    });

    this.disableOptions?.map(disableOption => {
      let itemFinded = this._optionsIntance.find(listItem => listItem[this.optionValue] == disableOption[this.optionValue]);
      if (itemFinded) itemFinded.disabled = true;
    });
    this.fullValue[this.optionValue] = this.value;

    if (!this.value) return this._optionsIntance;
    const id = typeof this.value == 'object' ? this.value[this.optionValue] : this.value;
    const itemFinded = this._optionsIntance?.find(listItem => listItem[this.optionValue] == id);
    if (!itemFinded) return this._optionsIntance;
    itemFinded.selected = true;
    this.fullValue[this.optionLabel] = itemFinded[this.optionLabel];

    // console.log(itemFinded);

    return this._optionsIntance;
  }
  onSelectOption(option) {
    this.fullValue = option;
    this.value = option[this.optionValue];
    option.selected = true;
    console.log(option);
    // this.value = this.valueAsObject ? option : this.value;
    // console.log(this.value);
    // const optionFinded = this.value.findIndex(valueItem => valueItem[this.optionValue] == option[this.optionValue]);

    this.selectOptionEvent.emit();
  }

  get labelName() {
    if (!this.value) return '';
    const id = typeof this.value == 'object' ? this.value[this.optionValue] : this.value;
    const itemFinded = this._optionsIntance?.find(listItem => listItem[this.optionValue] == id);
    if (!itemFinded) return '';

    return itemFinded[this.optionLabel];
  }
  // toggleSelectOption(option) {
  //   if (option?.disabled === true) return;
  //   console.log('toggleSelectOption');
  //   option.selected = !option.selected;
  // }
}
