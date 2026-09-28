import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTriangleAlert } from '@ng-icons/lucide';
import { HlmButton } from '@spartan/button';
import { HlmDialogDescription, HlmDialogFooter, HlmDialogHeader, HlmDialogTitle } from '@spartan/dialog';
import { BULK_UPLOADER_ACCESS_COPY } from '../../../../internationalization/bilateral-header-info.copy';

/**
 * `continue` carries the tab opened by the Continue click (`null` when the popup was blocked).
 * Cancel, Escape and a backdrop click all close with `undefined`.
 */
export interface BulkUploaderAccessResult {
  tab: Window | null;
}

/**
 * Warning shown before the Bulk Results Uploader redirect, opened through `HlmDialogService`
 * (focus trap, autofocus, restore — never `app-pr-dialog`, `src/CLAUDE.md` §21.7).
 *
 * 🛑 The tab is opened HERE, inside the Continue click, not by whoever reads `closed$`. A popup
 * blocker only honours `window.open` from inside the user gesture, and `BrnDialogRef` may emit
 * `closed$` after a close delay — by then the gesture is gone. The reverse link is severed on the
 * spot (same property `rel="noopener"` gives an anchor) and the handle travels back in the result.
 */
@Component({
  selector: 'app-bulk-uploader-access-dialog',
  standalone: true,
  imports: [HlmDialogHeader, HlmDialogTitle, HlmDialogDescription, HlmDialogFooter, HlmButton, NgIcon],
  providers: [provideIcons({ lucideTriangleAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bulk-uploader-access-dialog.component.html',
  styleUrl: './bulk-uploader-access-dialog.component.scss'
})
export class BulkUploaderAccessDialogComponent implements AfterViewInit {
  private readonly dialogRef = inject(BrnDialogRef<BulkUploaderAccessResult | undefined>);

  protected readonly copy = BULK_UPLOADER_ACCESS_COPY;

  private readonly continueButtonRef = viewChild<ElementRef<HTMLButtonElement>>('continueButton');

  ngAfterViewInit(): void {
    this.continueButtonRef()?.nativeElement.focus();
  }

  protected continueAnyway(): void {
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    this.dialogRef.close({ tab });
  }

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }
}
