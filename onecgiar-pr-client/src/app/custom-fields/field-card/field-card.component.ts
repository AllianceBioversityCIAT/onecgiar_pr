import { Component, Input } from '@angular/core';

/**
 * Reusable field wrapper: bone-grey card with a colored status header (title +
 * Mandatory/Optional tag + color-legend), an optional small description, and a
 * projected body (<ng-content>) holding the real control.
 *
 * Use it to give any field — a custom control OR a raw PrimeNG widget — the
 * field-card look without touching the control's logic. State can be passed
 * explicitly via [state], or derived from [required] + [hasValue] + [hasError].
 *
 * Styles live globally in src/styles/field-card.scss.
 */
@Component({
  selector: 'app-field-card',
  templateUrl: './field-card.component.html',
  standalone: false
})
export class FieldCardComponent {
  @Input() label: string;
  @Input() description: string;
  @Input() required = true;
  @Input() hasValue = false;
  @Input() hasError = false;
  @Input() showHeader = true;
  @Input() showDescription = true;
  @Input() descInlineStyles = '';
  /** Optional explicit override; when set it wins over the derived state. */
  @Input() state: 'optional' | 'pending' | 'done' | 'error' | null = null;

  get computedState(): 'optional' | 'pending' | 'done' | 'error' {
    if (this.state) return this.state;
    if (this.hasError) return 'error';
    if (this.hasValue) return 'done';
    return this.required ? 'pending' : 'optional';
  }
}
