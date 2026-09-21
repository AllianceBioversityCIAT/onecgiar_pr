import { Component, Input } from '@angular/core';

/**
 * Word budget of a field, as an aro that fills plus the figure (propuesta 04, 15-Sep-2026).
 *
 * The threshold is INCLUSIVE: `wordCount === maxWords` is still valid, and the same comparison
 * feeds `app-field-card [hasError]` in `pr-input` — so moving it by one would reject, or accept,
 * fields one word early. It is asserted from three places, this component included.
 */
@Component({
  selector: 'app-pr-word-counter',
  templateUrl: './pr-word-counter.component.html',
  styleUrls: ['./pr-word-counter.component.scss'],
  standalone: false
})
export class PrWordCounterComponent {
  @Input() wordCount: number;
  @Input() maxWords: number;
  @Input() autogenerate: boolean;

  /** Perímetro del aro, r=6 en un viewBox de 16. Constante: el SVG no escala. */
  readonly ringCircumference = 2 * Math.PI * 6;

  /**
   * Cuánto del presupuesto se lleva gastado, acotado a [0, 1]. El padre calcula el conteo, así
   * que puede llegar `undefined` mientras el campo se inicializa, y `maxWords` puede ser 0 —
   * dividir por él daría `Infinity` y un `stroke-dashoffset` que el navegador ignora, dejando el
   * aro pintado entero justo cuando el campo está vacío.
   */
  private get progress(): number {
    const used = this.wordCount ?? 0;
    if (!this.maxWords || this.maxWords <= 0) return used > 0 ? 1 : 0;
    return Math.min(Math.max(used / this.maxWords, 0), 1);
  }

  get ringOffset(): number {
    return this.ringCircumference * (1 - this.progress);
  }

  /** `>` y no `>=`: el límite es alcanzable. Ver la nota de la clase. */
  get isOverLimit(): boolean {
    return (this.wordCount ?? 0) > this.maxWords;
  }

  /**
   * El aviso ANTES del accidente, que es lo que el contador plano nunca dio: a partir del 85% del
   * presupuesto el aro y la cifra se tiñen de naranja. No es un error —nada se bloquea aquí—, solo
   * deja de ser gris para que el reportero decida si recorta antes de chocar con el techo.
   */
  get isNearLimit(): boolean {
    return !this.isOverLimit && this.progress >= 0.85 && (this.wordCount ?? 0) > 0;
  }

  /**
   * El gráfico y los dos números dicen lo mismo tres veces a un lector de pantalla. El contenedor
   * lleva `role="img"` con esta etiqueta y el resto va `aria-hidden`, de modo que se anuncia una
   * sola frase — y al pasarse la frase LO DICE, en vez de depender de un color.
   */
  get ariaLabel(): string {
    const used = this.wordCount ?? 0;
    return this.isOverLimit
      ? `${used} of ${this.maxWords} words — over the limit`
      : `${used} of ${this.maxWords} words`;
  }
}
