import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, viewChild } from '@angular/core';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan/button';
import { HlmDialogDescription, HlmDialogFooter, HlmDialogHeader, HlmDialogTitle } from '@spartan/dialog';

/** Resolution of the Save/Discard warning — see `UnsavedChangesDialogService.openSaveDiscard()`. */
export type UnsavedChangesDialogResult = 'save' | 'discard';

/**
 * `requirements.md` §UCA-R-3` copy, verbatim. Structural/behavioral, not domain vocabulary that
 * differs P22/P25 — a plain string constant is correct here, not a `TermKey`
 * (`requirements.md` §8 Internationalization).
 */
export const UNSAVED_CHANGES_DIALOG_COPY =
  "You have unsaved changes. If you leave now, they'll be lost. Do you want to save before continuing?";

/**
 * Save/Discard warning shown by `UnsavedChangesGuard` (`UCA-T-2`) when the user tries to leave a
 * dirty Result Detail section. Built on `hlm-dialog` (CDK Dialog: focus trap, autofocus, restore)
 * — never `app-pr-dialog`, which has none of those (`src/CLAUDE.md` §21.7). Rendered as the
 * component content of `HlmDialogService.open()`, so this template carries only the dialog BODY —
 * the overlay/backdrop/panel chrome is supplied by `HlmDialogContent`.
 *
 * Exactly two actions, no third "stay" option (`UCA-R-3`): Save (`brand`, gets initial focus) and
 * Discard (`outline`). `UnsavedChangesDialogService` opens this with `disableClose: true`, so the
 * explicit Escape handler below is the ONLY way this dialog closes on Escape — it resolves as
 * Discard (`UCA-OQ-3`), never `hlm-dialog`'s default Escape-closes-with-`undefined` behavior.
 */
@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  imports: [HlmDialogHeader, HlmDialogTitle, HlmDialogDescription, HlmDialogFooter, HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './unsaved-changes-dialog.component.html',
  styleUrl: './unsaved-changes-dialog.component.scss'
})
export class UnsavedChangesDialogComponent implements AfterViewInit {
  private readonly dialogRef = inject(BrnDialogRef<UnsavedChangesDialogResult>);

  protected readonly copy = UNSAVED_CHANGES_DIALOG_COPY;

  private readonly saveButtonRef = viewChild<ElementRef<HTMLButtonElement>>('saveButton');

  ngAfterViewInit(): void {
    // Save is the safer default focus target for a data-loss decision (design.md §6.3). CDK's
    // `autoFocus: 'first-tabbable'` default would already land here since Save is the first
    // focusable element in this content, but focusing explicitly keeps that guarantee even if
    // DOM order or dialog options change later. Real-CDK-overlay focus is browser-verified only
    // (jsdom's focus semantics inside a CDK overlay are not fully representative) — see UCA-T-3's
    // DoD note.
    this.saveButtonRef()?.nativeElement.focus();
  }

  @HostListener('keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    event.preventDefault();
    this.discard();
  }

  protected save(): void {
    this.dialogRef.close('save');
  }

  protected discard(): void {
    this.dialogRef.close('discard');
  }
}
