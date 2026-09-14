import { Injectable, signal } from '@angular/core';

/**
 * La bolita que vuela de un campo recién completado al indicador de progreso de la sección.
 *
 * Existe porque el indicador vive al pie de la pantalla y el campo que se acaba de llenar puede
 * estar a media página de distancia: el número sube, pero nadie lo ve subir. La bolita ES la
 * explicación — dice DE DÓNDE vino ese punto, que es lo que convierte un contador en una
 * recompensa.
 *
 * Diseño deliberado:
 * - El destino se REGISTRA (el indicador se anuncia al montarse). Sin destino en pantalla no hay
 *   vuelo, y no pasa nada: el contador sigue funcionando por su cuenta.
 * - La partícula se monta en `document.body`, no dentro del campo: dentro quedaría recortada por
 *   el primer ancestro con `overflow: hidden`, y hay varios en el camino.
 * - Se anima con la Web Animations API y se borra en `finish` Y en `cancel`; una animación
 *   interrumpida (navegar, cerrar la sección) no puede dejar basura pegada al body.
 */
@Injectable({ providedIn: 'root' })
export class FieldCompletionFlightService {
  /** Sube cada vez que una bolita ATERRIZA. El indicador lo lee para dar su pulso. */
  readonly landed = signal(0);

  private target: HTMLElement | null = null;

  // Grande y sin prisa (Yeck, 14-sep-2026): el recorrido puede ser de media pantalla, y a 12 px en
  // 620 ms el ojo lo perdía — que es lo mismo que no animar nada.
  private static readonly DURATION_MS = 1100;
  private static readonly SIZE_PX = 14;
  /** Altura del brinco inicial, antes de que empiece el viaje. */
  private static readonly JUMP_PX = 52;

  registerTarget(el: HTMLElement): void {
    this.target = el;
  }

  /** Solo desregistra si el que se va es el que estaba puesto: dos secciones pueden solaparse al navegar. */
  clearTarget(el: HTMLElement): void {
    if (this.target === el) this.target = null;
  }

  get hasTarget(): boolean {
    return !!this.target?.isConnected;
  }

  /**
   * Lanza la bolita desde `origin` hasta el destino registrado.
   * No hace nada —y no es un error— si no hay destino, si alguno de los dos está fuera de pantalla,
   * o si el usuario pidió menos movimiento.
   */
  flyFrom(origin: HTMLElement | null | undefined): void {
    if (!origin?.isConnected || !this.target?.isConnected) return;
    if (typeof document === 'undefined' || typeof Element === 'undefined') return;
    // 🛑 `prefers-reduced-motion` no es un detalle de estilo: para parte de los usuarios una
    // partícula cruzando la pantalla es una molestia física. Sin movimiento, el contador sube igual.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      this.landed.update(n => n + 1);
      return;
    }

    const from = origin.getBoundingClientRect();
    const to = this.target.getBoundingClientRect();
    if (!from.width || !to.width) return;

    const size = FieldCompletionFlightService.SIZE_PX;
    const startX = from.left + from.width / 2 - size / 2;
    const startY = from.top + from.height / 2 - size / 2;
    const endX = to.left + to.width / 2 - size / 2;
    const endY = to.top + to.height / 2 - size / 2;

    const dot = document.createElement('span');
    dot.className = 'pr-completion-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.style.cssText = `position:fixed;left:${startX}px;top:${startY}px;width:${size}px;height:${size}px;z-index:9999;pointer-events:none;border-radius:50%;`;
    document.body.appendChild(dot);

    const dx = endX - startX;
    const dy = endY - startY;
    // Media de trayecto: el arco impide que un salto largo se lea como un parpadeo en línea recta.
    const lift = Math.min(170, Math.abs(dx) * 0.3 + 70);

    /*
     * Dos tiempos, no uno (Yeck, 14-sep-2026): BRINCA y después VIAJA.
     *
     * Con un solo tramo la bolita salía ya en diagonal y el ojo no llegaba a ver de dónde venía. El
     * salto vertical la despega del campo —que es lo que ata el punto a ESE campo— y solo entonces
     * arranca el viaje.
     *
     * Cada keyframe lleva su propia curva, que es lo que da las dos sensaciones con una sola
     * animación: el salto sale disparado y frena arriba (`.2,.8,.3,1`), se sostiene un instante, y
     * la caída acelera hacia el destino (`.45,0,.75,1`). Un `easing` global no puede hacer las dos.
     */
    const jump = FieldCompletionFlightService.JUMP_PX;

    const animation = dot.animate(
      [
        // Sin rebote de tamaño: el punto no CRECE al salir (se leía como un globo hinchándose),
        // solo aparece y se mueve. Lo único que escala es la despedida, para que el aterrizaje
        // no termine en un corte seco.
        { transform: 'translate(0px, 0px) scale(0.7)', opacity: 0, offset: 0, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { transform: `translate(0px, ${-jump * 0.45}px) scale(1)`, opacity: 1, offset: 0.14, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { transform: `translate(0px, ${-jump}px) scale(1)`, opacity: 1, offset: 0.32, easing: 'cubic-bezier(.4,0,.6,1)' },
        { transform: `translate(0px, ${-jump}px) scale(1)`, opacity: 1, offset: 0.4, easing: 'cubic-bezier(.45,0,.75,1)' },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift * 0.55}px) scale(1)`, opacity: 1, offset: 0.7 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.55)`, opacity: 0.85, offset: 1 }
      ],
      { duration: FieldCompletionFlightService.DURATION_MS, fill: 'forwards' }
    );

    const cleanup = () => dot.remove();
    animation.addEventListener('finish', () => {
      cleanup();
      this.landed.update(n => n + 1);
    });
    animation.addEventListener('cancel', cleanup);
  }
}
