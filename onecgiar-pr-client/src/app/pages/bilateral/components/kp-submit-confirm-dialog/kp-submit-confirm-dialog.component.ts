import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, viewChild } from '@angular/core';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan/button';
import { HlmDialogDescription, HlmDialogFooter, HlmDialogHeader, HlmDialogTitle } from '@spartan/dialog';
import { BILATERAL_KP_SUBMIT_COPY } from '../../../../internationalization/bilateral-kp-submit.copy';

/** Resolution of the Knowledge Product submit confirmation — see `KpSubmitConfirmDialogService.open()`. */
export type KpSubmitConfirmDialogResult = 'submit' | 'cancel';

/**
 * P2-3980: "This result will be sent to the Science Program" confirmation for a bilateral Knowledge
 * Product. `hlm-dialog` (focus trap, autofocus, restore), never `window.confirm()`. Mirrors
 * `TocLinkageSwitchDialogComponent`.
 */
@Component({
  selector: 'app-kp-submit-confirm-dialog',
  standalone: true,
  imports: [HlmDialogHeader, HlmDialogTitle, HlmDialogDescription, HlmDialogFooter, HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kp-submit-confirm-dialog.component.html',
  styleUrl: './kp-submit-confirm-dialog.component.scss',
})
export class KpSubmitConfirmDialogComponent implements AfterViewInit {
  private readonly dialogRef = inject(BrnDialogRef<KpSubmitConfirmDialogResult>);

  protected readonly copy = BILATERAL_KP_SUBMIT_COPY;

  private readonly cancelButtonRef = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  ngAfterViewInit(): void {
    // Cancel leaves the result as it was: the safe default focus target for a one-way action.
    this.cancelButtonRef()?.nativeElement.focus();
  }

  @HostListener('keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    event.preventDefault();
    this.cancel();
  }

  protected confirm(): void {
    this.dialogRef.close('submit');
  }

  protected cancel(): void {
    this.dialogRef.close('cancel');
  }
}
