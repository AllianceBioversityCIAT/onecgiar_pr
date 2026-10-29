import { inject, Injectable } from '@angular/core';
import { HlmDialogService } from '@spartan/dialog';
import { map, Observable } from 'rxjs';
import { KpSubmitConfirmDialogComponent, KpSubmitConfirmDialogResult } from './kp-submit-confirm-dialog.component';

/**
 * Opens the P2-3980 Knowledge Product submit confirmation. Consumed by
 * `BilateralResultCreatorComponent.submitResult` for a KP only.
 */
@Injectable({ providedIn: 'root' })
export class KpSubmitConfirmDialogService {
  private readonly hlmDialogSE = inject(HlmDialogService);

  /**
   * `disableClose` + no close button: Cancel and Escape (mapped by the component) are the only exits,
   * so backdrop clicks cannot submit and `undefined` never resolves — `?? 'cancel'` is a fallback only.
   */
  open(): Observable<KpSubmitConfirmDialogResult> {
    const dialogRef = this.hlmDialogSE.open<KpSubmitConfirmDialogResult>(KpSubmitConfirmDialogComponent, {
      disableClose: true,
      showCloseButton: false,
      role: 'alertdialog',
      contentClass: 'sm:max-w-lg!',
    });
    return dialogRef.closed$.pipe(map((result) => result ?? 'cancel'));
  }
}
