import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { RolesService } from '../../shared/services/global/roles.service';

@Component({
    selector: 'app-pr-range-level',
    templateUrl: './pr-range-level.component.html',
    styleUrls: ['./pr-range-level.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => PrRangeLevelComponent),
            multi: true
        }
    ],
    standalone: false
})
export class PrRangeLevelComponent {
  @Input() size: number = 9;
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() options: any = [];
  @Input() itemTitle: string = null;
  @Input() itemDescription: string = null;
  @Output() selectOptionEvent = new EventEmitter<any>();
  hoverData = {
    show: false,
    object: {},
    index: null,
    handleMouseEnter: (data: any, index: any) => {
      this.hoverData.object = data;
      this.hoverData.index = index;
      this.hoverData.show = true;
    },
    handleMouseLeave: () => {
      this.hoverData.object = {};
      this.hoverData.index = null;
      this.hoverData.show = false;
    }
  };
  public list = [];

  constructor(private rolesSE: RolesService) {}

  private _value: string;

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

  get sizeArray() {
    if (!this.list?.length) Array.from({ length: this.size + 1 }).forEach((_, i) => this.list.push(i));

    return this.list;
  }

  getRangeIndexByValue(value) {
    return this.options.findIndex(item => item[this.optionValue] == value);
  }

  onSelectLevel(option, circle: HTMLElement) {
    if (this.rolesSE.readOnly) return;
    const htmlElement: HTMLElement = circle;
    htmlElement.parentElement.querySelectorAll('.circle').forEach(circle => {
      circle.classList.remove('active');
    });
    htmlElement.classList.add('active');
    this.value = option;
    this.selectOptionEvent.emit(option);
  }
}
