// @akili-spec changes/reporting-favorite-indicators
import { Injectable, Signal, inject, signal } from '@angular/core';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ReportingIndicator } from '../components/reporting-aow-table/reporting-aow-table.component';

/** Schema-versioned so a future shape change can migrate instead of silently colliding. */
const FAVORITES_STORAGE_KEY_PREFIX = 'pr.reporting.favorites.v1.';

/**
 * Must stay byte-identical to `ReportingAowTableComponent.rowKey()` (RFI-AC-14 pins it) — the
 * table and the host derive the same identity for a row independently, and a drift here would
 * make a pin silently stop matching its row.
 */
export function favoriteKeyOf(row: Pick<ReportingIndicator, 'indicator_id' | 'center_id' | '__aowCode'>): string {
  return `${row.indicator_id}::${row.center_id ?? ''}::${row.__aowCode ?? ''}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Per-user, per-programme favorite indicators, kept in `localStorage` behind a signal.
 *
 * One store for every programme (`{ [programCode]: favoriteKey[] }`) rather than one service
 * instance per programme, because the user id — and therefore the storage key — is the only
 * thing that scopes the data to "this browser, this person"; the programme is just a field inside
 * it (RFI-R-3.2).
 */
@Injectable({ providedIn: 'root' })
export class ReportingFavoritesService {
  private readonly api = inject(ApiService);

  private readonly storageKey = `${FAVORITES_STORAGE_KEY_PREFIX}${this.api.authSE?.localStorageUser?.id ?? 'anon'}`;

  private readonly store = signal<Record<string, string[]>>(this.load());

  readonly byProgram: Signal<Readonly<Record<string, readonly string[]>>> = this.store.asReadonly();

  setOf(programCode: string): ReadonlySet<string> {
    return new Set(this.store()[programCode] ?? []);
  }

  isFavorite(programCode: string, key: string): boolean {
    return this.setOf(programCode).has(key);
  }

  toggle(programCode: string, key: string): void {
    const current = this.store();
    const existing = current[programCode] ?? [];
    const next = existing.includes(key) ? existing.filter(k => k !== key) : [...existing, key];
    this.store.set({ ...current, [programCode]: next });
    this.persist();
  }

  count(programCode: string): number {
    return (this.store()[programCode] ?? []).length;
  }

  private load(): Record<string, string[]> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      return isPlainObject(parsed) ? (parsed as Record<string, string[]>) : {};
    } catch {
      return {};
    }
  }

  private persist(): void {
    // Drop empty programme arrays before writing so the store never grows with `[]` entries
    // (a toggle that empties a programme should look, on reload, like it was never touched).
    const current = this.store();
    const cleaned: Record<string, string[]> = {};
    for (const [programCode, keys] of Object.entries(current)) {
      if (keys.length > 0) cleaned[programCode] = keys;
    }
    if (Object.keys(cleaned).length !== Object.keys(current).length) {
      this.store.set(cleaned);
    }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(cleaned));
    } catch {
      // Storage may be unavailable (private mode / quota) — the in-memory copy still serves the session.
    }
  }
}
