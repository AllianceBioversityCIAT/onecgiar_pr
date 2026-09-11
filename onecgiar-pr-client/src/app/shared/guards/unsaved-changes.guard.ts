import { Injectable, inject } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { CanComponentDeactivate } from './unsaved-changes.types';
import { UnsavedNavigationIntentService } from '../services/unsaved-changes/unsaved-navigation-intent.service';
import { UnsavedChangesDialogService } from '../components/unsaved-changes-dialog/unsaved-changes-dialog.service';

/**
 * Single `CanDeactivate` guard registered on every `resultDetailRouting` route (`UCA-T-4`). Sees
 * every navigation away from a section — `Next`/`Back`, sidebar clicks, browser back/forward —
 * and picks silent auto-save vs. the Save/Discard dialog based on the one-shot intent flag set by
 * `section-bottom-bar` (`UCA-T-5`). See `docs/specs/changes/unsaved-changes-alert/design.md` §2.2,
 * `UCA-DD-2`.
 */
@Injectable({ providedIn: 'root' })
export class UnsavedChangesGuard implements CanDeactivate<CanComponentDeactivate> {
  private readonly intentSE = inject(UnsavedNavigationIntentService);
  private readonly dialogSE = inject(UnsavedChangesDialogService);

  canDeactivate(component: CanComponentDeactivate): Observable<boolean> | boolean {
    if (!component.hasUnsavedChanges()) {
      // Consume unconditionally so a stray `markSilent()` from an earlier, blocked navigation
      // never leaks into the next, unrelated one (`UCA-DD-2`).
      this.intentSE.consumeSilent();
      return true;
    }

    if (this.intentSE.consumeSilent()) {
      // Back/Next: silently save, no dialog (`UCA-R-1`).
      return component.saveSection();
    }

    // Anything else (sidebar click, browser back/forward): ask the user (`UCA-R-2`).
    return this.dialogSE.openSaveDiscard().pipe(
      switchMap(result => (result === 'discard' ? of(true) : component.saveSection()))
    );
  }
}
