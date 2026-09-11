import { Injectable } from '@angular/core';

/**
 * Structural-diff dirty tracker for `rd-*` Result Detail sections that bind a
 * plain object (not a Reactive `FormGroup`) to their fields.
 *
 * **Not root-provided.** Each section provides its own instance
 * (`providers: [SectionDirtyTrackerService]`) so one section's snapshot never
 * leaks into another's.
 *
 * See `docs/specs/changes/unsaved-changes-alert/design.md` `UCA-DD-1`.
 */
@Injectable()
export class SectionDirtyTrackerService {
  private snapshotValue: string | undefined;
  private hasSnapshot = false;

  /**
   * Deep-clones and stores `value` as the dirty-diff baseline. Cloning via
   * `JSON.stringify` (rather than `structuredClone`, unavailable in this
   * project's jsdom test environment) matches `isDirty()`'s own comparison
   * mechanism, so the "clone" and the "diff" never disagree on what counts
   * as structurally equal.
   */
  snapshot(value: unknown): void {
    this.snapshotValue = JSON.stringify(value);
    this.hasSnapshot = true;
  }

  /**
   * `true` when `value`'s serialized shape differs from the stored snapshot.
   * `false` when no snapshot has been taken yet.
   */
  isDirty(value: unknown): boolean {
    if (!this.hasSnapshot) return false;
    return JSON.stringify(value) !== this.snapshotValue;
  }
}
