import { inject, Injectable } from '@angular/core';
import { HlmDialogService } from '@spartan/dialog';
import { map, Observable } from 'rxjs';
import { UnsavedChangesDialogComponent, UnsavedChangesDialogResult } from './unsaved-changes-dialog.component';

/**
 * Opens the Save/Discard warning dialog (`UCA-R-3`) via `hlm-dialog`'s service API. Consumed by
 * `UnsavedChangesGuard` (`UCA-T-2`) whenever a dirty section is left through a path that isn't the
 * silent Back/Next save (`UCA-R-1`/`UCA-R-2`).
 */
@Injectable({ providedIn: 'root' })
export class UnsavedChangesDialogService {
  private readonly hlmDialogSE = inject(HlmDialogService);

  /**
   * `disableClose: true` blocks `hlm-dialog`'s default backdrop/outside-click/Escape auto-dismiss,
   * which would otherwise resolve `closed$` with `undefined` — there being no third "stay" action,
   * this dialog must only ever resolve as `'save'` or `'discard'` (`UCA-R-3`). The dialog's own
   * explicit Escape handler is the sole path that closes it on Escape, mapping it to `'discard'`
   * (`UCA-OQ-3`). `showCloseButton: false` removes `hlm-dialog-content`'s default "X" button, which
   * would otherwise be a third, undefined exit path. The `?? 'discard'` below is a defensive
   * fallback only — every real close path already resolves explicitly.
   */
  openSaveDiscard(): Observable<UnsavedChangesDialogResult> {
    const dialogRef = this.hlmDialogSE.open<UnsavedChangesDialogResult>(UnsavedChangesDialogComponent, {
      disableClose: true,
      showCloseButton: false,
      role: 'alertdialog',
      // `hlm-dialog-content`'s default is `sm:max-w-md` (28rem/448px) — widened for readability.
      // Helm classes are concatenated, not tailwind-merged, so the override needs the Tailwind v4
      // `!` important suffix to actually beat the base class at equal specificity.
      contentClass: 'sm:max-w-lg!'
    });

    return dialogRef.closed$.pipe(map((result) => result ?? 'discard'));
  }
}
