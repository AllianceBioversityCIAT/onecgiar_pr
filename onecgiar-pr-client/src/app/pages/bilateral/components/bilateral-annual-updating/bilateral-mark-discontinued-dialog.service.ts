import { inject, Injectable } from '@angular/core';
import { HlmDialogService } from '@spartan/dialog';
import { map, Observable } from 'rxjs';
import {
  BilateralMarkDiscontinuedDialogComponent,
  BilateralMarkDiscontinuedDialogResult,
} from './bilateral-mark-discontinued-dialog.component';

/**
 * Opens the BIL-RAU-T-8 "Mark as discontinued" confirm via `hlm-dialog`'s service API. Consumed by
 * `BilateralAnnualUpdatingComponent` once the answer is complete (R-11 S-11.1).
 */
@Injectable({ providedIn: 'root' })
export class BilateralMarkDiscontinuedDialogService {
  private readonly hlmDialogSE = inject(HlmDialogService);

  /**
   * `disableClose: true` blocks the default backdrop/outside-click/Escape auto-dismiss, which would
   * otherwise resolve `closed$` with `undefined`. The dialog's own explicit Escape handler is the
   * sole path that closes it on Escape, mapping it to `'cancel'`. `showCloseButton: false` removes
   * the default "X", which would otherwise be a third, undefined exit path. The `?? 'cancel'` below
   * is a defensive fallback only — every real close path already resolves explicitly.
   */
  open(): Observable<BilateralMarkDiscontinuedDialogResult> {
    const dialogRef = this.hlmDialogSE.open<BilateralMarkDiscontinuedDialogResult>(BilateralMarkDiscontinuedDialogComponent, {
      disableClose: true,
      showCloseButton: false,
      role: 'alertdialog',
      contentClass: 'sm:max-w-lg!',
    });

    return dialogRef.closed$.pipe(map(result => result ?? 'cancel'));
  }
}
