import { Component, Input, effect, inject, signal, untracked } from '@angular/core';
import { SaveButtonService } from '../save-button/save-button.service';

/**
 * Visual state of a field, in the order it is resolved:
 * `error` over the word limit · `ok` required and filled · `opt` optional and filled ·
 * `todo` required and empty · `idle` optional and empty · `plain` the wrapper did not report
 * whether the field holds a value, so nothing is claimed about it.
 */
export type FieldCardState = 'plain' | 'idle' | 'todo' | 'ok' | 'opt' | 'error';

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
   * Paridad con `app-pr-field-header`, que es de donde vienen los campos migrados: 23 plantillas
   * pasan `labelDescInlineStyles` y 38 pasan `useColon`. Sin estos dos inputs, migrar un wrapper
   * perdería silenciosamente el estilo del label y los dos puntos del título en esos sitios.
   */
  @Input() labelDescInlineStyles = '';
  @Input() useColon = false;

  /**
   * Whether the field currently holds a value. Read again by the redesign to tint the header.
   *
   * 🛑 `null` is NOT the same as `false`: it means the wrapper never reported one. Roughly half the
   * call sites do not bind this input, and defaulting them to `false` would paint every one of them
   * amber — "required and empty" — on a form the user may have filled long ago. Unreported stays
   * `plain`: neutral chrome, no verdict.
   */
  @Input() hasValue: boolean | null = null;
  /**
   * `row` pone el label a la IZQUIERDA y el control a la DERECHA en una sola línea, con una regla
   * de 1px arriba — la forma en que el mockup presenta una lista de campos homogéneos y cortos
   * (los cinco Impact Area scores: mismo tipo de respuesta, cinco veces). Apilar label sobre
   * control ahí gasta el doble de alto vertical y rompe la lectura en columna de las respuestas.
   *
   * `stack` (por defecto) es el resto de los formularios y no cambia.
   */
  @Input() layout: 'stack' | 'row' = 'stack';

  readonly saveSE = inject(SaveButtonService);

  /** The user typed/picked something in this field since the last successful save. */
  readonly edited = signal(false);
  /** Momentary confirmation right after a save that actually reached the server. */
  readonly justSaved = signal(false);
  private justSavedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Only a SUCCESSFUL save clears the mark (see SaveButtonService.savedTick): watching
    // `isSaving` instead would tell the user their work is safe when the request failed.
    effect(() => {
      this.saveSE.savedTick();
      untracked(() => {
        if (!this.edited()) return;
        this.edited.set(false);
        this.justSaved.set(true);
        if (this.justSavedTimer) clearTimeout(this.justSavedTimer);
        this.justSavedTimer = setTimeout(() => this.justSaved.set(false), FieldCardComponent.JUST_SAVED_MS);
      });
    });
  }

  private static readonly JUST_SAVED_MS = 4000;

  get state(): FieldCardState {
    if (this.hasError) return 'error';
    if (this.hasValue === null || this.hasValue === undefined) return 'plain';
    if (this.hasValue) return this.required ? 'ok' : 'opt';
    return this.required ? 'todo' : 'idle';
  }

  /** What the right-hand pill says — the one thing neither the tint nor the tag tells you. */
  get saveState(): 'saving' | 'unsaved' | 'saved' | 'none' {
    if (this.edited() && this.saveSE.isSaving()) return 'saving';
    if (this.edited()) return 'unsaved';
    if (this.justSaved()) return 'saved';
    return 'none';
  }

  /** `input`/`change` bubble out of the projected control, so one listener on the card is enough. */
  markEdited(): void {
    if (!this.edited()) this.edited.set(true);
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
