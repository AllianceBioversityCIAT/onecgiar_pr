import { Component, forwardRef, Input, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RolesService } from '../../shared/services/global/roles.service';
import { DataControlService } from '../../shared/services/data-control.service';
@Component({
    selector: 'app-pr-radio-button',
    templateUrl: './pr-radio-button.component.html',
    styleUrls: ['./pr-radio-button.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => PrRadioButtonComponent),
            multi: true
        }
    ],
    standalone: false
})
export class PrRadioButtonComponent implements ControlValueAccessor {
  @Input() options: any;
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() label: string;
  @Input() description: string;
  @Input() subLabel: string;
  @Input() required: boolean = true;
  @Input() hideOptions: boolean;
  @Input() readOnly: boolean;
  @Input() isStatic: boolean = false;
  @Input() verticalAlignment: boolean = false;
  @Input() checkboxConfig: {
    listAttr: string;
    optionLabel: string;
    optionValue: string;
    optionTextValue: string;
    showInputIfAttr?: string;
  } = { listAttr: '', optionLabel: '', optionValue: '', optionTextValue: '', showInputIfAttr: '' };
  @Output() selectOptionEvent = new EventEmitter<any>();
  private _value: string;
  constructor(public rolesSE: RolesService, public dataControlSE: DataControlService) {}

  get value() {
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

  joinName() {
    return this.label?.split(' ')?.join('');
  }

  currentVal = null;
  onSelect() {
    this.selectOptionEvent.emit();
    if (this.currentVal === this.value) this.value = null;

    if (this.checkboxConfig.listAttr) {
      this.options.forEach((option: any) => {
        if (option.subOptions) {
          option.subOptions.forEach((subOption: any) => {
            subOption.answer_boolean = false;
            subOption.answer_text = null;
          });
        }
      });
    }

    this.currentVal = this.value;
  }

  get valueName() {
    const optionFinded = this.options.find((option: any) => option[this.optionValue] == this.value);
    if (optionFinded) return optionFinded[this.optionLabel];
    return "<div class='not_provided_color'>Not provided</div>";
  }

  setAnswerTextToNull(option) {
    if (!option.answer_boolean) {
      option.answer_text = null;
    }
  }
}
