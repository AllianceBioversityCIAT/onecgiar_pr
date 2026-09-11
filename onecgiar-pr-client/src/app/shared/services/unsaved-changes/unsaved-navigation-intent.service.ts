import { Injectable } from '@angular/core';

/**
 * One-shot flag that lets `section-bottom-bar`'s `Back`/`Next` clicks tell the
 * upcoming `UnsavedChangesGuard` (`UCA-T-2`) "this navigation should silently
 * save, don't show the dialog" — without threading state through the router.
 *
 * See `docs/specs/changes/unsaved-changes-alert/design.md` `UCA-DD-2`.
 */
@Injectable({
  providedIn: 'root'
})
export class UnsavedNavigationIntentService {
  private silent = false;

  /** Marks the next `consumeSilent()` call to return `true`. */
  markSilent(): void {
    this.silent = true;
  }

  /**
   * Reads the flag and unconditionally resets it to `false` in the same call,
   * so it can never leak into an unrelated, later navigation.
   */
  consumeSilent(): boolean {
    const wasSilent = this.silent;
    this.silent = false;
    return wasSilent;
  }
}
