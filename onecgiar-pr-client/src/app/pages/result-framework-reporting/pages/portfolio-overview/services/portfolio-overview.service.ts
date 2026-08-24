import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../../../shared/services/api/api.service';

/**
 * One page is enough: the endpoint is already scoped by the caller's roles, and the OPEN phase
 * holds two orders of magnitude fewer results than the archive (259 of 6094 on prtest,
 * 2026-08-24). The guard is `isPartial()` — if the server says it holds more than we asked for,
 * the screen says so instead of passing a truncated portfolio off as the whole thing.
 */
export const PORTFOLIO_PAGE_LIMIT = 20000;

/** The raw list item, restricted to the keys this screen reads. Verified live on prtest. */
interface RawResult {
  submitter?: string;
  submitter_short_name?: string;
  submitter_name?: string;
  result_type?: string;
  status_name?: string;
  source_name?: string;
  status_id?: number | string;
  phase_status?: number | string;
  phase_name?: string;
  acronym?: string;
  version_id?: number | string;
}

interface AllResultsEnvelope {
  response?: { items?: RawResult[]; meta?: { total?: number | string } };
}

/** A counter in the "Results in this phase" strip. The first one is the total and has no dot. */
export interface PortfolioTotal {
  label: string;
  n: number;
  /** '' on the total, a status colour on the rest. */
  dot: string;
}

/** A bar row — used by both "Results by indicator category" and "Bilateral results". */
export interface PortfolioBar {
  /** Only the bilateral list shows a code. */
  code: string;
  name: string;
  n: number;
  /** Fill width as a css percentage, relative to the largest row. */
  width: string;
}

/** One programme row of the matrix. `cells` follows `categories()` order, one to one. */
export interface PortfolioRow {
  code: string;
  name: string;
  total: number;
  cells: number[];
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Status dot colour, resolved by `status_id` — the SAME mapping as
 * `programme-results.component.ts:101 STATUS_TOKENS`, whose foregrounds come in turn from
 * `result-header.component.ts:17`. Resolving by id (not by name) is what keeps a status the same
 * colour here, on the Results tab and on the result page. Unknown ids fall back to the
 * `not-started` foreground — never to a new colour (UI rule 9: no sixth status colour).
 */
const STATUS_DOT: Record<string, string> = {
  1: 'var(--pr-status-in-progress-fg)',
  2: 'var(--pr-status-approved-fg)',
  3: 'var(--pr-status-submitted-fg)'
};
const STATUS_FALLBACK_DOT = 'var(--pr-status-not-started-fg)';

const statusDot = (statusId: unknown): string => STATUS_DOT[String(statusId)] ?? STATUS_FALLBACK_DOT;

const percent = (n: number, max: number): string => `${max > 0 ? Math.round((n / max) * 100) : 0}%`;

/**
 * Portfolio-wide reporting figures, for the admin-only Portfolio overview screen.
 *
 * Everything on that screen is ONE request aggregated in the client. Reason, not laziness: no
 * endpoint returns portfolio-level breakdowns (`science-programs/progress` carries only
 * `totalResults` / `progress` per programme — no status, no category, no funding source), and the
 * figures must describe the whole open phase rather than a page, or every counter would lie.
 */
@Injectable()
export class PortfolioOverviewService {
  private readonly api = inject(ApiService);

  private requestToken = 0;

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  /** True when the server holds more rows than the single page we asked for. */
  readonly isPartial = signal<boolean>(false);

  /** Results of the OPEN phase only (`phase_status === 1`). */
  private readonly rows = signal<RawResult[]>([]);
  /** Label of the phase these figures describe, e.g. `Reporting 2026 - P25`. */
  readonly phaseName = signal<string>('');
  readonly portfolioAcronym = signal<string>('');
  /**
   * True when NO open phase was found and the figures therefore come from the newest closed one.
   * Drives the design's "Viewing a closed phase. Figures are final." line.
   */
  readonly closedPhase = signal<boolean>(false);

  readonly total = computed(() => this.rows().length);

  /**
   * The status strip: the total first (no dot), then one counter per status PRESENT, biggest
   * first. Derived from the rows rather than from a hardcoded list, so a counter can only ever
   * describe a status some result actually has.
   */
  readonly totals = computed<PortfolioTotal[]>(() => {
    const counts = new Map<string, { n: number; statusId: unknown }>();
    for (const row of this.rows()) {
      const label = text(row.status_name);
      if (!label) continue;
      const seen = counts.get(label);
      counts.set(label, { n: (seen?.n ?? 0) + 1, statusId: seen?.statusId ?? row.status_id });
    }
    return [
      { label: 'Results in this phase', n: this.rows().length, dot: '' },
      ...[...counts.entries()]
        .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
        .map(([label, { n, statusId }]) => ({ label, n, dot: statusDot(statusId) }))
    ];
  });

  /** Distinct categories present, ordered by count desc — the matrix columns follow this list. */
  readonly categories = computed<string[]>(() => {
    const counts = this.countBy(this.rows(), row => text(row.result_type));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  });

  /** "Results by indicator category" — same order as `categories()`, widest first. */
  readonly categoryBars = computed<PortfolioBar[]>(() => {
    const counts = this.countBy(this.rows(), row => text(row.result_type));
    const max = Math.max(0, ...counts.values());
    return this.categories().map(name => ({ code: '', name, n: counts.get(name) ?? 0, width: percent(counts.get(name) ?? 0, max) }));
  });

  /** Bilateral (`W3/Bilaterals`) results of the open phase. */
  private readonly bilaterals = computed(() => this.rows().filter(row => text(row.source_name) === 'W3/Bilaterals'));

  readonly bilateralTotal = computed(() => this.bilaterals().length);

  /** Bilateral results per programme, biggest first. */
  readonly bilateralBars = computed<PortfolioBar[]>(() => {
    const counts = this.countBy(this.bilaterals(), row => text(row.submitter));
    const max = Math.max(0, ...counts.values());
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([code, n]) => ({ code, name: this.programmeName(code), n, width: percent(n, max) }));
  });

  /** The matrix: one row per programme, ordered by total desc. */
  readonly programmeRows = computed<PortfolioRow[]>(() => {
    const cats = this.categories();
    const byProgramme = new Map<string, RawResult[]>();
    for (const row of this.rows()) {
      const code = text(row.submitter);
      if (!code) continue;
      byProgramme.set(code, [...(byProgramme.get(code) ?? []), row]);
    }
    return [...byProgramme.entries()]
      .map(([code, items]) => ({
        code,
        name: this.programmeName(code),
        total: items.length,
        cells: cats.map(cat => items.filter(item => text(item.result_type) === cat).length)
      }))
      .sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
  });

  /** The `All programs` closing row — recomputed from the rows, never accumulated by hand. */
  readonly footer = computed(() => ({
    total: this.total(),
    cells: this.categories().map(cat => this.rows().filter(row => text(row.result_type) === cat).length)
  }));

  /** Loads the portfolio. Safe to call again: a second call supersedes the first. */
  load(): void {
    const token = ++this.requestToken;
    const userId = this.api.authSE?.localStorageUser?.id;

    if (!userId) {
      this.reset();
      this.error.set('Your session could not be read. Please sign in again.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    (this.api.resultsSE.GET_AllResultsWithUseRole(userId, { limit: PORTFOLIO_PAGE_LIMIT, page: 1 }) as Observable<AllResultsEnvelope>).subscribe({
      next: envelope => {
        if (token !== this.requestToken) return;
        const items = envelope?.response?.items ?? [];
        this.apply(items);
        const total = Number(envelope?.response?.meta?.total ?? items.length);
        this.isPartial.set(Number.isFinite(total) && total > items.length);
        this.loading.set(false);
      },
      error: () => {
        if (token !== this.requestToken) return;
        this.reset();
        this.error.set('The portfolio figures could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  /**
   * Narrows the payload to ONE phase: the open one (`phase_status === 1`). If nothing is open —
   * between cycles — it falls back to the newest phase present and flags `closedPhase`, which is
   * what the design's amber line announces. Never mixes phases: doing so would add 2022 results
   * to a 2026 counter.
   */
  private apply(items: RawResult[]): void {
    const open = items.filter(item => Number(item.phase_status) === 1);
    if (open.length) {
      this.closedPhase.set(false);
      this.setPhase(open);
      return;
    }

    const newest = Math.max(0, ...items.map(item => Number(item.version_id) || 0));
    const latest = items.filter(item => Number(item.version_id) === newest);
    this.closedPhase.set(latest.length > 0);
    this.setPhase(latest);
  }

  private setPhase(items: RawResult[]): void {
    this.rows.set(items);
    this.phaseName.set(text(items[0]?.phase_name));
    this.portfolioAcronym.set(text(items[0]?.acronym));
  }

  /** The programme's display name, from whichever of the two name fields the payload carries. */
  private programmeName(code: string): string {
    const row = this.rows().find(item => text(item.submitter) === code);
    return text(row?.submitter_short_name) || text(row?.submitter_name) || code;
  }

  private countBy(items: RawResult[], key: (row: RawResult) => string): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items) {
      const value = key(item);
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return counts;
  }

  private reset(): void {
    this.rows.set([]);
    this.phaseName.set('');
    this.portfolioAcronym.set('');
    this.closedPhase.set(false);
    this.isPartial.set(false);
  }
}
