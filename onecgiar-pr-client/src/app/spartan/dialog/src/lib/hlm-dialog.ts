import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { BrnDialog, provideBrnDialogDefaultOptions } from '@spartan-ng/brain/dialog';
import type { ClassValue } from 'clsx';
import { HlmDialogOverlay } from './hlm-dialog-overlay';

@Component({
  selector: 'hlm-dialog',
  exportAs: 'hlmDialog',
  imports: [HlmDialogOverlay],
  providers: [
    {
      provide: BrnDialog,
      useExisting: forwardRef(() => HlmDialog)
    },
    provideBrnDialogDefaultOptions({
      // add custom options here
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hlm-dialog-overlay [class]="overlayClass()" />
    <ng-content />
  `
})
export class HlmDialog extends BrnDialog {
  /**
   * Extra classes for the backdrop, merged over Helm's default (`bg-black/10 backdrop-blur-xs`).
   *
   * ADDED to the generated Helm file on purpose: `HlmDialog`'s template renders
   * `<hlm-dialog-overlay />` with no class binding, and the backdrop lives in the CDK overlay
   * container — outside the consuming component's DOM — so neither `::ng-deep` nor a component
   * style can reach it. PRMS needs `--pr-scrim` (0.32 alpha) rather than Helm's 0.10.
   * Additive and defaulted to `''`, so every existing usage renders exactly as before.
   */
  public readonly overlayClass = input<ClassValue>('');
}
