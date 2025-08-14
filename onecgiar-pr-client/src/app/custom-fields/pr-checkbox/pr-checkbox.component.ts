import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { GreenChecksService } from '../../shared/services/global/green-checks.service';
import { RolesService } from '../../shared/services/global/roles.service';

@Component({
    selector: 'app-pr-checkbox',
    templateUrl: './pr-checkbox.component.html',
    styleUrls: ['./pr-checkbox.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => PrCheckboxComponent),
            multi: true
        }
    ],
    standalone: false
})
export class PrCheckboxComponent {
  constructor(public greenChecksSE: GreenChecksService, public rolesSE: RolesService) {}
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() placeholder: string;
  @Input() label: string;
  @Input() description: string;
  @Input() readOnly: boolean;
  @Input() required: boolean = true;
  @Input() isStatic: boolean = false;
  @Output() selectOptionEvent = new EventEmitter();
  private _value: string;

  get value() {
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
}
