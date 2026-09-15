import { Component, Input } from '@angular/core';

/**
 * Cabecera de un GRUPO de campos — el hermano de `app-field-card` para los títulos que encabezan
 * varios campos a la vez ("Impact Area scores", y cualquier otro bloque que llegue).
 *
 * Existe porque esos títulos eran `<h1 class="pr_label">` sueltos: al migrar los campos a la
 * tarjeta con cabecera tintada, el único elemento que quedó fuera del lenguaje visual fue
 * justamente el que encabeza el grupo, y en pantalla se leía como texto huérfano encima de una
 * lista de campos que sí tenían color.
 *
 * Además resuelve lo que un título no podía decir: **cuánto falta**. El grupo recibe `completed`
 * y `total` y pinta el contador con un anillo de progreso a la derecha, de modo que el avance del
 * bloque se lee sin contar filas a ojo. Es paramétrico a propósito — no sabe nada de Impact Areas.
 */
@Component({
  selector: 'app-field-group-header',
  templateUrl: './field-group-header.component.html',
  styleUrls: ['./field-group-header.component.scss'],
  standalone: false
})
export class FieldGroupHeaderComponent {
  @Input() label = '';
  @Input() tooltip = '';
  /** Los títulos de grupo de esta plataforma llevan dos puntos ("Impact Area scores:"). */
  @Input() useColon = true;

  /**
   * Cuántos elementos del grupo están resueltos. `null` = el grupo no lleva contador y la cabecera
   * se queda neutra: 🛑 un 0 de 0 pintado de verde diría "completo" sobre un grupo vacío.
   */
  @Input() completed: number | null = null;
  @Input() total = 0;
  /** Palabra que cierra el contador: "3 of 5 **scored**", "2 of 4 **complete**". */
  @Input() unit = 'complete';

  /** Radio del anillo; la circunferencia sale de aquí y alimenta el dash-array del SVG. */
  private static readonly RADIUS = 7;
  readonly circumference = 2 * Math.PI * FieldGroupHeaderComponent.RADIUS;

  get showProgress(): boolean {
    return this.completed !== null && this.completed !== undefined && this.total > 0;
  }

  get state(): 'ok' | 'todo' | 'plain' {
    if (!this.showProgress) return 'plain';
    return (this.completed ?? 0) >= this.total ? 'ok' : 'todo';
  }

  /** 0..1. Se recorta arriba y abajo: un `completed` mayor que `total` no debe pasar de la vuelta. */
  get ratio(): number {
    if (!this.showProgress) return 0;
    return Math.min(1, Math.max(0, (this.completed ?? 0) / this.total));
  }

  /** El arco se dibuja quitando longitud al trazo: lleno = offset 0. */
  get dashOffset(): number {
    return this.circumference * (1 - this.ratio);
  }
}
