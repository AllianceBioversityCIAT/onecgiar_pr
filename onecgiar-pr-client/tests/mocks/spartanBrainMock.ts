import { Directive, Input } from '@angular/core';

@Directive({ selector: '[brnButton]', standalone: true })
export class BrnButton {
  @Input() disabled: boolean | string | undefined;
}

@Directive({ selector: '[brnSheet]', standalone: true })
export class BrnSheet {}

@Directive({ selector: '[brnSheetOverlay]', standalone: true })
export class BrnSheetOverlay {}

@Directive({ selector: '[brnSheetTitle]', standalone: true })
export class BrnSheetTitle {}

@Directive({ selector: '[brnSheetContent]', standalone: true })
export class BrnSheetContent {}

@Directive({ selector: '[brnSheetClose]', standalone: true })
export class BrnSheetClose {}

@Directive({ selector: '[brnSheetDescription]', standalone: true })
export class BrnSheetDescription {}

@Directive({ selector: '[brnSheetTrigger]', standalone: true })
export class BrnSheetTrigger {}

@Directive({ selector: '[brnDialog]', standalone: true })
export class BrnDialog {}

@Directive({ selector: '[brnTooltip]', standalone: true })
export class BrnTooltip {}

export type BrnTooltipPosition = string;

@Directive({ selector: '[brnSeparator]', standalone: true })
export class BrnSeparator {}

export function provideBrnDialogDefaultOptions(_opts: any): any {
  return { provide: 'BrnDialogDefaultOptions', useValue: _opts };
}

export function provideBrnTooltipDefaultOptions(_opts: any): any {
  return { provide: 'BrnTooltipDefaultOptions', useValue: _opts };
}

export function injectCustomClassSettable(): any {
  return { setClass: () => {} };
}

export function injectExposedSideProvider(): any {
  return { side: () => 'right' };
}

export function injectExposesStateProvider(): any {
  return { state: () => 'closed' };
}
