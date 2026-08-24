import { Directive } from '@angular/core';

/**
 * Lightweight Spartan input styling.
 *
 * The Spartan-CLI-generated version applied `BrnInput` + `BrnFieldControlDescribedBy`
 * host directives plus a reactive `classes()` effect. Inside PRMS's template-driven
 * `pr-input`/`pr-select` (many fields per page, custom field-header + validation),
 * that machinery caused an infinite change-detection loop that hung heavy screens
 * (e.g. Result Detail → General Information). PRMS already owns labels and invalid
 * styling via its own facade, so we only need the visual classes here — applied
 * statically, with no directives/effects that can loop.
 */
@Directive({
  selector: '[hlmInput]',
  host: {
    'data-slot': 'input',
    // Geometría del mockup en px EXPLÍCITOS: 40 de alto, radio 8, 12 de padding, texto 14.
    // Las utilidades rem de Tailwind no sirven aquí — `html` es 12px en esta app, así que el
    // `h-9 rounded-md px-2.5 md:text-sm` anterior resolvía a 27px / 4.5px / 7.5px / 10.5px:
    // un control un tercio más pequeño de lo diseñado, en TODOS los formularios.
    // Sin `shadow-xs`: el mockup separa los inputs con la regla de 1px, nunca con sombra.
    class:
      'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-[40px] rounded-[8px] border bg-white px-[12px] py-[8px] text-[14px] font-normal leading-[1.5] transition-[color,box-shadow] file:h-7 file:text-[13px] file:font-medium focus-visible:ring-3 file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
  }
})
export class HlmInput {}
