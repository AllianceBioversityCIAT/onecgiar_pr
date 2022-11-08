import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-pr-yes-or-not',
  templateUrl: './pr-yes-or-not.component.html',
  styleUrls: ['./pr-yes-or-not.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrYesOrNotComponent),
      multi: true
    }
  ]
})
export class PrYesOrNotComponent {
  @Input() label: string;
  @Input() description: string;
  @Input() readOnly: boolean;
  @Input() required: boolean = true;
  @Input() hideOptions: boolean;

  private _value: boolean;

  get value() {
    return this._value;
  }

  set value(v: boolean) {
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

  onclickYes() {
    this.value = true;
  }

  onClickNo() {
    this.value = false;
  }
}
