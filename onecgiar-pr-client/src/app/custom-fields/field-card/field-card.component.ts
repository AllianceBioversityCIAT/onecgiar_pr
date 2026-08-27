import { Component, Input } from '@angular/core';

/**
 * Reusable field wrapper: a label (with a red asterisk when required), an optional info button,
 * an optional description, and a projected body (<ng-content>) holding the real control.
 *
 * Use it to give any field — a custom control OR a raw PrimeNG widget — the standard field look
 * without touching the control's logic.
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
  @Input() tooltip = '';
  @Input() required = true;
  @Input() hasError = false;
  @Input() showHeader = true;
  @Input() showDescription = true;
  @Input() descInlineStyles = '';

  /**
   * @deprecated No longer read. The card used to derive a four-colour status from it
   * (`optional` / `pending` / `done` / `error`) and paint the border and header tint with it;
   * the redesign dropped that verdict from the field. Kept as an accepted input so the four
   * wrappers that still bind it (`pr-input`, `pr-textarea`, `pr-radio-button`,
   * `lead-contact-person-field`) do not need touching for a purely visual change.
   */
  @Input() hasValue = false;
  /**
   * `row` pone el label a la IZQUIERDA y el control a la DERECHA en una sola línea, con una regla
   * de 1px arriba — la forma en que el mockup presenta una lista de campos homogéneos y cortos
   * (los cinco Impact Area scores: mismo tipo de respuesta, cinco veces). Apilar label sobre
   * control ahí gasta el doble de alto vertical y rompe la lectura en columna de las respuestas.
   *
   * `stack` (por defecto) es el resto de los formularios y no cambia.
   */
  @Input() layout: 'stack' | 'row' = 'stack';

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
   * No label and no description → render no chrome at all, only the projected control.
   *
   * WHY: the component this card replaced (`app-pr-field-header`) gated its whole label block on
   * `*ngIf="this.label"`, so a label-less field showed nothing. Roughly 60 call sites rely on
   * that — currency cells in the investment/estimates tables, sub-inputs inside a radio option,
   * "Other" specifiers — and most of them default to `required = true`. Without this guard each
   * one would grow an orphan asterisk over an empty title and the block's vertical margin.
   *
   * A description with no label keeps the block, so that copy is never dropped. This looks at the
   * CONTENT only, never at `showHeader`: a consumer that hides the header of a labelled field is
   * asking for a chromeless field, not for no field — that behaviour is unchanged.
   */
  get isBare(): boolean {
    return !this.hasLabel && !(this.showDescription && !!this.description);
  }
}
