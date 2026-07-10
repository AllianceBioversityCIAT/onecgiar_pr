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
    class:
      'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] file:h-7 file:text-sm file:font-medium focus-visible:ring-3 md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
  }
})
export class HlmInput {}
