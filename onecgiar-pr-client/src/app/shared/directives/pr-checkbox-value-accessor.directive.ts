import { Directive, ElementRef, forwardRef, HostListener, Input, Renderer2 } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Array-membership ControlValueAccessor for a native checkbox (PrimeNG `<p-checkbox [value]>`
 * group replacement — 0 PrimeNG, no brain directives).
 *
 * Angular's built-in checkbox accessor is boolean-only. PrimeNG's non-binary checkbox instead
 * toggles `value` in/out of an array `ngModel`. This directive restores that exact behavior so
 * `<input type="checkbox" prCheckboxValue [value]="x" [(ngModel)]="arr">` keeps the same
 * two-way semantics — the surrounding `(click)`/`(ngModelChange)` bridge handlers are untouched.
 *
 * Membership uses `indexOf` (reference equality for objects, value equality for primitives),
 * matching PrimeNG's default comparison.
 */
@Directive({
  selector: 'input[type=checkbox][prCheckboxValue]',
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrCheckboxValueAccessorDirective),
      multi: true
    }
  ]
})
export class PrCheckboxValueAccessorDirective implements ControlValueAccessor {
  /** The value this checkbox represents inside the model array. Bound via `[value]`. */
  @Input() value: any;

  private model: any[] = [];
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private readonly el: ElementRef<HTMLInputElement>,
    private readonly renderer: Renderer2
  ) {}

  @HostListener('change')
  onHostChange(): void {
    const checked = this.el.nativeElement.checked;
    const arr = Array.isArray(this.model) ? [...this.model] : [];
    const idx = arr.indexOf(this.value);
    if (checked && idx < 0) {
      arr.push(this.value);
    } else if (!checked && idx >= 0) {
      arr.splice(idx, 1);
    }
    this.model = arr;
    this.onChange(arr);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  writeValue(value: any): void {
    this.model = Array.isArray(value) ? value : [];
    this.renderer.setProperty(this.el.nativeElement, 'checked', this.model.indexOf(this.value) >= 0);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el.nativeElement, 'disabled', isDisabled);
  }
}
