// @akili-spec changes/my-work-editing-reorder (MWER-T-1, MWER-R-2, MWER-R-6, design.md §6.1)
import { computed, Injectable, signal } from '@angular/core';

const STORAGE_PREFIX = 'prms.mwb.editing-order.v1';

function sameCodeSequence(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((code, index) => code === b[index]);
}

/** Builds the localStorage key for one user's manual Editing order (`MWER-R-6`). */
export function editingOrderStorageKey(userId: string | number, programmeCode: string, phaseLabel: string): string {
  return `${STORAGE_PREFIX}::${userId}::${(programmeCode ?? '').trim()}::${phaseLabel ?? ''}`;
}

/**
 * Page-scoped manual Editing order — provided on `MyWorkBoardComponent` alongside
 * `MyWorkBoardService`. Persists ordered result codes in `localStorage`; failures fail open.
 */
@Injectable()
export class MyWorkEditingOrderService {
  private readonly storageKey = signal<string | null>(null);

  readonly orderedCodes = signal<string[]>([]);
  readonly hasManualOrder = computed(() => this.orderedCodes().length > 0);

  loadForKey(userId: string | number, programmeCode: string, phaseLabel: string | null): void {
    const key = editingOrderStorageKey(userId, programmeCode, phaseLabel ?? '');
    if (this.storageKey() !== key) this.storageKey.set(key);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        if (this.orderedCodes().length) this.orderedCodes.set([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      const next = Array.isArray(parsed) ? parsed.map(String) : [];
      if (!sameCodeSequence(next, this.orderedCodes())) this.orderedCodes.set(next);
    } catch {
      if (this.orderedCodes().length) this.orderedCodes.set([]);
    }
  }

  save(codes: readonly string[]): void {
    const key = this.storageKey();
    const next = [...codes];
    if (sameCodeSequence(next, this.orderedCodes())) return;
    this.orderedCodes.set(next);
    if (!key) return;
    try {
      if (!next.length) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(next));
      }
    } catch {
      // fail open — in-memory order still updates for the session
    }
  }

  clear(): void {
    const key = this.storageKey();
    if (this.orderedCodes().length) this.orderedCodes.set([]);
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // fail open
    }
  }

  moveItem(previousIndex: number, currentIndex: number): void {
    const codes = [...this.orderedCodes()];
    if (previousIndex < 0 || previousIndex >= codes.length || currentIndex < 0 || currentIndex > codes.length) return;
    const [item] = codes.splice(previousIndex, 1);
    codes.splice(currentIndex, 0, item);
    this.save(codes);
  }

  /** Drops codes no longer present in the current Editing bucket (`MWER-R-2` prune scenario). */
  pruneToExisting(codesInView: readonly string[]): void {
    const allowed = new Set(codesInView.map(String));
    const pruned = this.orderedCodes().filter(code => allowed.has(String(code)));
    if (pruned.length !== this.orderedCodes().length) {
      this.save(pruned);
    }
  }
}
