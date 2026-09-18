import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, viewChild } from '@angular/core';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan/button';
import { HlmDialogDescription, HlmDialogFooter, HlmDialogHeader, HlmDialogTitle } from '@spartan/dialog';

/** Resolution of the NO -> YES data-loss warning — see `TocLinkageSwitchDialogService.openSwitchToDefault()`. */
export type TocLinkageSwitchDialogResult = 'switch' | 'cancel';

export const TOC_LINKAGE_SWITCH_DIALOG_COPY =
  'Switching to the default linkage will remove the custom ToC details and indicators you selected. Do you want to proceed?';

/**
 * BIL-TOC-R-7 confirmation shown when the user switches NO (`custom`) to YES (`project_default`)
 * with saved custom values. Built on `hlm-dialog` (CDK Dialog: focus trap, autofocus, restore) —
 * never a native `window.confirm()`, which blocks the JS event loop and has no focus management
 * (`onecgiar-pr-client/src/CLAUDE.md` §21.7). Mirrors `UnsavedChangesDialogComponent`.
 */
@Component({
  selector: 'app-toc-linkage-switch-dialog',
  standalone: true,
  imports: [HlmDialogHeader, HlmDialogTitle, HlmDialogDescription, HlmDialogFooter, HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toc-linkage-switch-dialog.component.html',
  styleUrl: './toc-linkage-switch-dialog.component.scss',
})
export class TocLinkageSwitchDialogComponent implements AfterViewInit {
  private readonly dialogRef = inject(BrnDialogRef<TocLinkageSwitchDialogResult>);

  protected readonly copy = TOC_LINKAGE_SWITCH_DIALOG_COPY;

  private readonly cancelButtonRef = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  ngAfterViewInit(): void {
    // Cancel (keep the custom details) is the safer default focus target for a data-loss decision.
    this.cancelButtonRef()?.nativeElement.focus();
  }

  @HostListener('keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    event.preventDefault();
    this.cancel();
  }

  protected switch(): void {
    this.dialogRef.close('switch');
  }

  protected cancel(): void {
    this.dialogRef.close('cancel');
  }
}
