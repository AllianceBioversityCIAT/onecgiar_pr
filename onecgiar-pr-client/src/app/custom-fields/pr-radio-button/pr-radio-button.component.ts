import { Component, forwardRef, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RolesService } from '../../shared/services/global/roles.service';
import { DataControlService } from '../../shared/services/data-control.service';
import { FieldsManagerService } from '../../shared/services/fields-manager.service';
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
  @Input() fieldRef: string | number;
  @Input() textInputWhenSelectedLabels: string[] = [];
  @Input() textInputPlaceholder: string = 'Why?';
  @Input() textInputPlaceholderOverrides: { [label: string]: string } | null = null;
  @Input() textInputRequiredWhenSelectedLabels: string[] = [];
  @Input() textInputLabel: string | null = null;
  @Input() textInputLabelOverrides: { [label: string]: string } | null = null;
  @Input() checkboxConfig: {
    listAttr: string;
    optionLabel: string;
    optionValue: string;
    optionTextValue: string;
    showInputIfAttr?: string;
  } = { listAttr: '', optionLabel: '', optionValue: '', optionTextValue: '', showInputIfAttr: '' };
  @Output() selectOptionEvent = new EventEmitter<any>();
  private _value: string;
  fieldsManager = inject(FieldsManagerService);
  constructor(
    public rolesSE: RolesService,
    public dataControlSE: DataControlService
  ) {}

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

  preventFieldRender = computed<boolean>(() => {
    if (!this.fieldRef) return true;
    const { hide, label, description, required } = this.fieldsManager.fields()[this.fieldRef] || {};
    this.label = label;
    this.description = description;
    this.required = required;
    return !hide;
  });

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
    return "<div class='text-red-100 italic'>Not provided</div>";
  }

  setAnswerTextToNull(option) {
    if (!option.answer_boolean) {
      option.answer_text = null;
    }
  }
}
