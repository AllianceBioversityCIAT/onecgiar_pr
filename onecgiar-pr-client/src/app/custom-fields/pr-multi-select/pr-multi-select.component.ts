import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
  constructor() {}
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() options: any;
  @Input() placeholder: string;
  @Input() label: string;
  @Input() inputTitle: string;
  @Input() description: string;
  @Input() readOnly: boolean;
  @Input() required: boolean = true;
  private _value: string;

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
}
