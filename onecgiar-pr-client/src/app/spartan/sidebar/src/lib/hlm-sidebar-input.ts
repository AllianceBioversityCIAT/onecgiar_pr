import { Directive } from '@angular/core';
import { HlmInput } from '@spartan/input';
import { classes } from '@spartan/utils';

@Directive({
  selector: 'input[hlmSidebarInput]',
  hostDirectives: [HlmInput],
  host: {
    'data-slot': 'sidebar-input',
    'data-sidebar': 'input'
  }
})
export class HlmSidebarInput {
  constructor() {
    classes(() => 'bg-background h-8 w-full shadow-none');
  }
}
