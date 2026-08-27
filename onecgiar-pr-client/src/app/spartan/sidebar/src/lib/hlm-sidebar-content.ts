import { Directive } from '@angular/core';
import { classes } from '@spartan/utils';

@Directive({
  selector: '[hlmSidebarContent],hlm-sidebar-content',
  host: {
    'data-slot': 'sidebar-content',
    'data-sidebar': 'content'
  }
})
export class HlmSidebarContent {
  constructor() {
    // min-h-0 + flex-1 + overflow-y-auto is the CURRENT scroll column
    // (PRMS-Shell.dc.html :54 `flex:1;min-height:0;overflow-y:auto`).
    // Keep a thin scrollbar so vertical scroll is discoverable; only hide it on the icon rail.
    classes(
      () =>
        'gap-2 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:no-scrollbar'
    );
  }
}
