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
  @Input() disabled: boolean = false;
  /**
   * P2-3655 — opt-in requiredness marker. OFF by default so every existing caller (IPSR step-n3,
   * bilateral, innovation-dev) keeps rendering exactly what it rendered before.
   *
   * This ladder had NO validation affordance of its own: an unanswered mandatory level looked
   * identical to an answered one, so "1 field missing" in the bottom bar pointed at a field the
   * reporter could not find on screen. It does NOT take part in the mandatory-field count — that
   * is owned by the `appFeedbackValidation` marker the caller already renders next to the control.
   */
  @Input() required: boolean = false;
  @Output() selectOptionEvent = new EventEmitter<any>();

  public list: number[] = [];

  constructor(public rolesSE: RolesService) {}

  private _value: any;

  get value(): any {
    return this._value;
  }

  set value(v: any) {
    if (v !== this._value) {
      this._value = v;
      this.onChange(v);
    }
  }

  onChange(_: any) {}

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

  get sizeArray(): number[] {
    if (!this.list?.length) {
      Array.from({ length: this.size + 1 }).forEach((_, i) => this.list.push(i));
    }
    return this.list;
  }

  get levels(): any[] {
    return this.options?.length ? this.options : this.sizeArray;
  }

  get selectedIndex(): number {
    if (this.options?.length && this.optionValue) {
      return this.options.findIndex((item: any) => item[this.optionValue] == this.value);
    }
    return this.sizeArray.findIndex(item => item == this.value);
  }

  get progressPercent(): number {
    const count = this.levels.length;
    if (count <= 1 || this.selectedIndex < 0) return 0;
    return (this.selectedIndex / (count - 1)) * 100;
  }

  get selectedOption(): any {
    if (this.selectedIndex < 0) return null;
    return this.levels[this.selectedIndex] ?? null;
  }

  get hasNarrativeFields(): boolean {
    return !!(this.itemTitle || this.itemDescription);
  }

  /**
   * P2-3655 — true only when the caller declared the field required AND no level is selected yet.
   * `0` is a legitimate level (the ladder starts at 0), so emptiness is null/undefined/'' only —
   * never falsiness.
   *
   * Suppressed while the ladder is not operable (`disabled`, or `RolesService.readOnly`, which is
   * what `onSelectLevel` itself checks): the marker tells the reporter to pick a level, and asking
   * that of someone whose dots are inert is a dead end, not a hint.
   */
  get isRequiredAndEmpty(): boolean {
    if (!this.required || this.disabled || this.rolesSE.readOnly) return false;
    return this.value === null || this.value === undefined || this.value === '';
  }

  get selectedTitle(): string {
    const opt = this.selectedOption;
    if (!opt || !this.itemTitle) return '';
    return typeof opt === 'object' ? (opt[this.itemTitle] ?? '') : String(opt);
  }

  get selectedDescription(): string {
    const opt = this.selectedOption;
    if (!opt || !this.itemDescription || typeof opt !== 'object') return '';
    return opt[this.itemDescription] ?? '';
  }

  levelValue(item: any): any {
    if (this.options?.length && this.optionValue) {
      return item[this.optionValue];
    }
    return item;
  }

  levelLabel(index: number): number {
    return index;
  }

  isReached(index: number): boolean {
    return this.selectedIndex >= 0 && index <= this.selectedIndex;
  }

  isActive(index: number): boolean {
    return index === this.selectedIndex;
  }

  /** @deprecated kept for callers */
  getRangeIndexByValue(value: any): number {
    if (!this.options?.length) return -1;
    return this.options.findIndex((item: any) => item[this.optionValue] == value);
  }

  onSelectLevel(option: any): void {
    if (this.disabled || this.rolesSE.readOnly) return;
    this.value = option;
    this.selectOptionEvent.emit(option);
  }
}
