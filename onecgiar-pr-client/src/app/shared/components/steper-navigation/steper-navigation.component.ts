import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-steper-navigation',
  templateUrl: './steper-navigation.component.html',
  styleUrls: ['./steper-navigation.component.scss']
})
export class SteperNavigationComponent {
  @Input() size: number = 9;
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() options: any;
  public list = [];
  constructor() {}

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
  //? Extra

  get sizeArray() {
    if (!this.list?.length) Array.from({ length: this.size + 1 }).map((_, i) => this.list.push(i));
    return this.list;
  }

  onSelectLevel(option, circle: HTMLElement) {
    const htmlElement: HTMLElement = circle;
    htmlElement.parentElement.querySelectorAll('.circle').forEach(circle => {
      circle.classList.remove('active');
    });
    htmlElement.classList.add('active');
    this.value = option;
  }
}
