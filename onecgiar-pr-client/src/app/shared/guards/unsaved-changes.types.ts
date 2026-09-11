import { Observable } from 'rxjs';

/**
 * Contract each `rd-*` Result Detail section implements so `UnsavedChangesGuard`
 * (see `unsaved-changes.guard.ts`, added in `UCA-T-2`) can gate navigation away
 * from a dirty section.
 *
 * See `docs/specs/changes/unsaved-changes-alert/design.md` §6.2, `UCA-DD-1`.
 */
export interface CanComponentDeactivate {
  /** Synchronous dirty check — typically `dirtyTracker.isDirty(body)`. */
  hasUnsavedChanges(): boolean;
  /** Wraps the section's existing save call; resolves `true` on success, `false` on failure. */
  saveSection(): Observable<boolean>;
}
