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

  /** A label is what makes a field addressable — blank/whitespace does not count as one. */
  get hasLabel(): boolean {
    return !!this.label?.trim();
  }

  get showHeaderRow(): boolean {
    return this.showHeader && this.hasLabel;
  }

  get showDescriptionBlock(): boolean {
    return this.showHeader && this.showDescription && !!this.description;
  }

  /**
   * No label and no description → render no card chrome at all, only the projected control.
   *
   * WHY: the component this card replaced (`app-pr-field-header`) gated its whole label block on
   * `*ngIf="this.label"`, so a label-less field showed nothing. Roughly 60 call sites rely on
   * that — currency cells in the investment/estimates tables, sub-inputs inside a radio option,
   * "Other" specifiers — and most of them default to `required = true`. Without this guard each
   * one grew an orphan "Mandatory" pill over an empty title, an orange border, an 18px margin and
   * 14px of body padding. Those fields were never marked mandatory before the redesign and the
   * DOM scan does not read the card anyway (it reads `.pr-input.mandatory` / `.pr-field.mandatory`
   * on the control), so the marker was pure noise.
   *
   * A description with no label keeps the card, so that copy is never dropped. This looks at the
   * CONTENT only, never at `showHeader`: a consumer that hides the header of a labelled field is
   * asking for a chromeless card, not for no card — that behaviour is unchanged.
   */
  get isBare(): boolean {
    return !this.hasLabel && !(this.showDescription && !!this.description);
  }
}
