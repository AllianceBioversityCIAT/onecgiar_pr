import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, viewChild } from '@angular/core';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan/button';
import { HlmDialogDescription, HlmDialogFooter, HlmDialogHeader, HlmDialogTitle } from '@spartan/dialog';

/** Resolution of the "Mark as discontinued" confirm — see `BilateralMarkDiscontinuedDialogService.open()`. */
export type BilateralMarkDiscontinuedDialogResult = 'confirm' | 'cancel';

export const BILATERAL_MARK_DISCONTINUED_DIALOG_COPY =
  'This will save the reasons you selected and move this result to Discontinued. ' +
  'This is not a submission, and an administrator can reopen it later. Do you want to continue?';

/**
 * BIL-RAU-T-8 (design.md §6.2, DD-3) — confirms the "No" answer before it is sent: R-11 requires
 * that a stored "No" never autosave on its own, because it moves the result to Discontinued (R-4)
 * and locks the bilateral editor for non-admins (R-6). Built on `hlm-dialog` (CDK Dialog: focus
 * trap, autofocus, restore), mirroring `TocLinkageSwitchDialogComponent` — never `app-pr-dialog`,
 * which has no focus trap (`onecgiar-pr-client/src/CLAUDE.md` §21.7). Imports only Spartan
 * primitives, so it satisfies the P-2 disqualifier (no import from `pages/results/`).
 */
@Component({
  selector: 'app-bilateral-mark-discontinued-dialog',
  standalone: true,
  imports: [HlmDialogHeader, HlmDialogTitle, HlmDialogDescription, HlmDialogFooter, HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bilateral-mark-discontinued-dialog.component.html',
  styleUrl: './bilateral-mark-discontinued-dialog.component.scss',
})
export class BilateralMarkDiscontinuedDialogComponent implements AfterViewInit {
  private readonly dialogRef = inject(BrnDialogRef<BilateralMarkDiscontinuedDialogResult>);

  protected readonly copy = BILATERAL_MARK_DISCONTINUED_DIALOG_COPY;

  private readonly cancelButtonRef = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  ngAfterViewInit(): void {
    // Cancel is the safer default focus target: a discontinuation is not reversible by the
    // reporter (only an admin's Reopen undoes it).
    this.cancelButtonRef()?.nativeElement.focus();
  }

  @HostListener('keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    event.preventDefault();
    this.cancel();
  }

  protected confirm(): void {
    this.dialogRef.close('confirm');
  }

  protected cancel(): void {
    this.dialogRef.close('cancel');
  }
}
