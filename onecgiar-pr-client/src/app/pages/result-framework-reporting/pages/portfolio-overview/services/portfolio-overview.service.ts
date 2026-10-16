import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../../../shared/services/api/api.service';
import type { PortfolioResultDimensions } from '../../../../../shared/interfaces/portfolio-result-dimensions.interface';
import {
  EMPTY_SELECTION,
  FILTER_DIMENSIONS,
  buildDimensionIndex,
  buildOptions,
  isActive,
  matchesRow,
  sanitize,
  type DimensionIndex,
  type FilterDimension,
  type PortfolioFilterOptions,
  type PortfolioFilterSelection
} from './portfolio-filters';
import { resolveStatusSlot } from './portfolio-status-slot';

/**
 * One page is enough: the endpoint is already scoped by the caller's roles, and the OPEN phase
 * holds two orders of magnitude fewer results than the archive (259 of 6094 on prtest,
 * 2026-08-24). The guard is `isPartial()` — if the server says it holds more than we asked for,
 * the screen says so instead of passing a truncated portfolio off as the whole thing.
 */
export const PORTFOLIO_PAGE_LIMIT = 20000;

/** The raw list item, restricted to the keys this screen reads. Verified live on prtest. */
export interface RawResult {
  /** Result id: the key of the dimensions map (global filters, GLF-P-1). */
  id?: number | string | null;
  title?: string;
  result_level_name?: string;
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
  /** Result already existed in an earlier phase. Same encodings as `programme-results.service.ts`. */
  is_replicated?: number | string | boolean | null;
  /** Acronym of the leading Center, as on the wire (typology view, TYV-P-1). */
  lead_center?: string | null;
}

/** `idle` before the first request, `loading` while it is in flight, then `ready` or `error`. */
export interface PortfolioDimensionsState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  map: PortfolioResultDimensions | null;
}

export interface AllResultsEnvelope {
  response?: { items?: RawResult[]; meta?: { total?: number | string } };
}

export interface PortfolioKpis {
  totalResults: number;
  phaseLabel: string;
  w1w2Count: number;
  w1w2SubmittedPercent: number;
  w1w2CategoriesCount: number;
  bilateralCount: number;
  bilateralApprovedPercent: number;
  bilateralCentersCount: number;
  activeProgramsCount: number;
  totalProgramsCount: number;
  portfolioProgressPercent: number;
  w1w2New: number;
  w1w2NewSubmitted: number;
  w1w2NewEditing: number;
  w1w2Replicated: number;
  bilateralNew: number;
  bilateralNewSubmitted: number;
  bilateralNewEditing: number;
  bilateralReplicated: number;
}

export interface PortfolioStatusSegment {
  key: 'editing' | 'in-qa' | 'submitted' | 'approved' | 'rejected' | 'discontinued';
  label: string;
  count: number;
  percent: number;
  bg: string;
  fg: string;
}

export interface CategoryOriginRow {
  category: string;
  w1w2Count: number;
  bilateralCount: number;
  total: number;
}

export interface CenterDistributionRow {
  centerId: string;
  centerName: string;
  count: number;
  approvedCount: number;
  percent: number;
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

// Moved verbatim to a pure file (spec global-filters, GLF-T-2); re-exported so existing imports keep working.
export { resolveStatusSlot };

const STATUS_SEGMENT_DEFINITIONS: {
  key: PortfolioStatusSegment['key'];
  label: string;
  bg: string;
  fg: string;
}[] = [
  { key: 'editing', label: 'Editing', bg: '#F5F3FF', fg: '#6B46E5' },
  { key: 'in-qa', label: 'In QA', bg: '#EDE9FE', fg: '#8B7CC4' },
  { key: 'submitted', label: 'Submitted', bg: '#DDD6FE', fg: '#5733C4' },
  { key: 'approved', label: 'Approved', bg: '#EEF2FF', fg: '#4338CA' },
  { key: 'rejected', label: 'Rejected', bg: '#F5F3FF', fg: '#A79BD4' },
  { key: 'discontinued', label: 'Discontinued', bg: '#F3F4F6', fg: '#9691A8' }
];

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
  private dimensionsToken = 0;

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  /** True when the server holds more rows than the single page we asked for. */
  readonly isPartial = signal<boolean>(false);

  /**
   * Rows actually fetched from the server in this page, BEFORE `apply()`'s open-phase filtering.
   * This is what the partial-results banner must report ("Showing the first N results") — `total()`
   * below is a DIFFERENT number (post-filter, open-phase-only) that legitimately feeds the "Total
   * Portfolio Results" KPI tile. Conflating the two was the bug (see spec
   * bugfix/portfolio-overview-partial-counts).
   */
  readonly fetchedCount = signal<number>(0);

  /** Results of the OPEN phase only (`phase_status === 1`). */
  private readonly rows = signal<RawResult[]>([]);
  /** Read-only view of the open-phase rows, for child blocks that aggregate on their own (TYV-DD-1). */
  readonly openRows = this.rows.asReadonly();
  /** Label of the phase these figures describe, e.g. `Reporting 2026 - P25`. */
  readonly phaseName = signal<string>('');
  readonly portfolioAcronym = signal<string>('');
  /**
   * True when NO open phase was found and the figures therefore come from the newest closed one.
   * Drives the design's "Viewing a closed phase. Figures are final." line.
   */
  readonly closedPhase = signal<boolean>(false);

  readonly total = computed(() => this.rows().length);

  // ---- Global filters (spec global-filters, GLF-T-3) ----------------------------------------------

  /** The global selection. Change it only through the methods below: each one writes a NEW selection. */
  readonly selection = signal<PortfolioFilterSelection>(EMPTY_SELECTION);
  /** The result -> project / Center map (one request per load, plus one per Retry: DD-4). */
  readonly dimensions = signal<PortfolioDimensionsState>({ status: 'idle', map: null });
  /** True when a Project or Center selection had to be dropped because the map failed (GLF-R-13). */
  readonly dimensionsNotice = signal<boolean>(false);

  readonly dimensionIndex = computed<DimensionIndex | null>(() => {
    const { status, map } = this.dimensions();
    return status === 'ready' && map ? buildDimensionIndex(map) : null;
  });

  readonly options = computed<PortfolioFilterOptions>(() => {
    const { status, map } = this.dimensions();
    return buildOptions(this.rows(), status === 'ready' ? map : null);
  });

  /** Project or Center is selected and the map is not ready: the row-driven sections wait (DD-5). */
  readonly filtersPending = computed(() => {
    const selection = this.selection();
    return (selection.project.size > 0 || selection.center.size > 0) && this.dimensions().status !== 'ready';
  });

  /**
   * The page rows the selection keeps. With no selection it is the very same array as `rows()`. A row whose
   * Project / Center match cannot be told yet (no map) is left out: never shown as if it matched (DD-5).
   */
  readonly filteredRows = computed<RawResult[]>(() => {
    const rows = this.rows();
    const selection = this.selection();
    if (!isActive(selection)) return rows;
    const index = this.dimensionIndex();
    return rows.filter(row => matchesRow(row, selection, index) === 'match');
  });

  readonly filteredTotal = computed(() => this.filteredRows().length);

  /**
   * Version (phase) id of the page rows: the first row's `version_id`, or `null` when there is none.
   * `apply()` narrows the rows to ONE phase (the open one, or the newest closed one), so the first row speaks
   * for all. It feeds the ToC KPI block, so the section describes the same phase as the page (TKP-P-10).
   */
  readonly versionId = computed<number | null>(() => {
    const id = Number(this.rows()[0]?.version_id);
    return Number.isFinite(id) && id > 0 ? id : null;
  });

  /**
   * Executive KPI Summary (POV-R-1)
   */
  readonly kpiTotals = computed<PortfolioKpis>(() => {
    const allRows = this.filteredRows();
    const totalResults = allRows.length;
    const phaseLabel = this.phaseName() || 'Active Cycle';

    const w1w2Rows = allRows.filter(r => text(r.source_name) !== 'W3/Bilaterals');
    const w1w2Count = w1w2Rows.length;

    const w1w2Submitted = w1w2Rows.filter(r => {
      const sid = Number(r.status_id);
      const sname = (r.status_name || '').toLowerCase();
      return (
        sid === 3 ||
        sid === 2 ||
        sname.includes('submitted') ||
        sname.includes('quality assessed') ||
        sname.includes('approved')
      );
    }).length;
    const w1w2SubmittedPercent = w1w2Count > 0 ? Math.round((w1w2Submitted / w1w2Count) * 100) : 0;

    const w1w2Categories = new Set(w1w2Rows.map(r => text(r.result_type)).filter(Boolean));
    const w1w2CategoriesCount = w1w2Categories.size;

    const bilateralRows = allRows.filter(r => text(r.source_name) === 'W3/Bilaterals');
    const bilateralCount = bilateralRows.length;

    const bilateralApproved = bilateralRows.filter(r => {
      const sid = Number(r.status_id);
      const sname = (r.status_name || '').toLowerCase();
      return sid === 2 || sid === 6 || sname.includes('approved');
    }).length;
    const bilateralApprovedPercent = bilateralCount > 0 ? Math.round((bilateralApproved / bilateralCount) * 100) : 0;

    const bilateralCenters = new Set(
      bilateralRows.map(r => text(r.submitter) || text(r.submitter_short_name)).filter(Boolean)
    );
    const bilateralCentersCount = bilateralCenters.size;

    const isReplicated = (r: RawResult): boolean =>
      r.is_replicated === 1 || r.is_replicated === '1' || r.is_replicated === true;
    const tally = (rows: RawResult[]) => {
      let newRows = 0;
      let newEditing = 0;
      let replicated = 0;
      for (const r of rows) {
        if (isReplicated(r)) replicated++;
        else {
          newRows++;
          if (Number(r.status_id) === 1) newEditing++;
        }
      }
      return { newRows, newEditing, newSubmitted: newRows - newEditing, replicated };
    };
    const w1w2Tally = tally(w1w2Rows);
    const bilateralTally = tally(bilateralRows);

    const activePrograms = new Set(allRows.map(r => text(r.submitter)).filter(Boolean));
    const activeProgramsCount = activePrograms.size;
    const totalProgramsCount = 13;

    const completedResults = allRows.filter(r => {
      const sid = Number(r.status_id);
      const sname = (r.status_name ?? '').toLowerCase();
      return (
        sid === 2 ||
        sid === 3 ||
        sid === 6 ||
        sname.includes('submitted') ||
        sname.includes('approved') ||
        sname.includes('quality assessed')
      );
    }).length;
    const portfolioProgressPercent =
      allRows.length > 0 ? Math.round((completedResults / allRows.length) * 100) : 0;

    return {
      totalResults,
      phaseLabel,
      w1w2Count,
      w1w2SubmittedPercent,
      w1w2CategoriesCount,
      bilateralCount,
      bilateralApprovedPercent,
      bilateralCentersCount,
      activeProgramsCount,
      totalProgramsCount,
      portfolioProgressPercent,
      w1w2New: w1w2Tally.newRows,
      w1w2NewSubmitted: w1w2Tally.newSubmitted,
      w1w2NewEditing: w1w2Tally.newEditing,
      w1w2Replicated: w1w2Tally.replicated,
      bilateralNew: bilateralTally.newRows,
      bilateralNewSubmitted: bilateralTally.newSubmitted,
      bilateralNewEditing: bilateralTally.newEditing,
      bilateralReplicated: bilateralTally.replicated
    };
  });

  /**
   * Portfolio Status Distribution (POV-R-2)
   */
  readonly statusSegments = computed<PortfolioStatusSegment[]>(() => {
    const allRows = this.filteredRows();
    const total = allRows.length;
    const counts = new Map<PortfolioStatusSegment['key'], number>();

    for (const row of allRows) {
      const slot = resolveStatusSlot(row);
      counts.set(slot, (counts.get(slot) ?? 0) + 1);
    }

    return STATUS_SEGMENT_DEFINITIONS.map(def => {
      const count = counts.get(def.key) ?? 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        key: def.key,
        label: def.label,
        count,
        percent: pct,
        bg: def.bg,
        fg: def.fg
      };
    });
  });

  /**
   * Indicator Category Origin Breakdown (POV-R-3)
   */
  readonly categoryOriginRows = computed<CategoryOriginRow[]>(() => {
    const cats = this.categories();
    const allRows = this.filteredRows();

    return cats.map(category => {
      const matching = allRows.filter(r => text(r.result_type) === category);
      const w1w2Count = matching.filter(r => text(r.source_name) !== 'W3/Bilaterals').length;
      const bilateralCount = matching.filter(r => text(r.source_name) === 'W3/Bilaterals').length;
      return {
        category,
        w1w2Count,
        bilateralCount,
        total: w1w2Count + bilateralCount
      };
    });
  });

  /**
   * Bilateral Center Distribution (POV-R-5)
   */
  readonly centerDistributionRows = computed<CenterDistributionRow[]>(() => {
    const bils = this.bilaterals();
    const totalBilateral = bils.length;
    const byCenter = new Map<string, RawResult[]>();

    for (const row of bils) {
      const code = text(row.submitter) || text(row.submitter_short_name) || text(row.submitter_name);
      if (!code) continue;
      byCenter.set(code, [...(byCenter.get(code) ?? []), row]);
    }

    return [...byCenter.entries()]
      .map(([centerId, items]) => {
        const count = items.length;
        const approvedCount = items.filter(r => resolveStatusSlot(r) === 'approved').length;
        const pct = totalBilateral > 0 ? Math.round((count / totalBilateral) * 100) : 0;
        return {
          centerId,
          centerName: this.programmeName(centerId),
          count,
          approvedCount,
          percent: pct
        };
      })
      .sort((a, b) => b.count - a.count || a.centerName.localeCompare(b.centerName) || a.centerId.localeCompare(b.centerId));
  });

  /**
   * The status strip: the total first (no dot), then one counter per status PRESENT, biggest
   * first. Derived from the rows rather than from a hardcoded list, so a counter can only ever
   * describe a status some result actually has.
   */
  readonly totals = computed<PortfolioTotal[]>(() => {
    const counts = new Map<string, { n: number; statusId: unknown }>();
    const filtered = this.filteredRows();
    for (const row of filtered) {
      const label = text(row.status_name);
      if (!label) continue;
      const seen = counts.get(label);
      counts.set(label, { n: (seen?.n ?? 0) + 1, statusId: seen?.statusId ?? row.status_id });
    }
    return [
      { label: 'Results in this phase', n: filtered.length, dot: '' },
      ...[...counts.entries()]
        .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
        .map(([label, { n, statusId }]) => ({ label, n, dot: statusDot(statusId) }))
    ];
  });

  /** Distinct categories present, ordered by count desc — the matrix columns follow this list. */
  readonly categories = computed<string[]>(() => {
    const counts = this.countBy(this.filteredRows(), row => text(row.result_type));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  });

  /** "Results by indicator category" — same order as `categories()`, widest first. */
  readonly categoryBars = computed<PortfolioBar[]>(() => {
    const counts = this.countBy(this.filteredRows(), row => text(row.result_type));
    const max = Math.max(0, ...counts.values());
    return this.categories().map(name => ({ code: '', name, n: counts.get(name) ?? 0, width: percent(counts.get(name) ?? 0, max) }));
  });

  /** Bilateral (`W3/Bilaterals`) results of the open phase, narrowed by the global selection. */
  private readonly bilaterals = computed(() => this.filteredRows().filter(row => text(row.source_name) === 'W3/Bilaterals'));

  readonly bilateralTotal = computed(() => this.bilaterals().length);

  /** Bilateral results per programme, biggest first. */
  readonly bilateralBars = computed<PortfolioBar[]>(() => {
    const counts = this.countBy(this.bilaterals(), row => text(row.submitter));
    const max = Math.max(0, ...counts.values());
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([code, n]) => ({ code, name: this.programmeName(code), n, width: percent(n, max) }));
  });

  /** Loads the portfolio. Safe to call again: a second call supersedes the first. */
  load(): void {
    const token = ++this.requestToken;
    // A map response still in flight belongs to the rows being replaced.
    ++this.dimensionsToken;
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
        this.fetchedCount.set(items.length);
        this.apply(items);
        const total = Number(envelope?.response?.meta?.total ?? items.length);
        this.isPartial.set(Number.isFinite(total) && total > items.length);
        this.loading.set(false);
        this.loadDimensions();
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
   * Requests the result -> project / Center map for the page version. Called once after `apply()` and by
   * Retry; a response of an older call is ignored (same request-token pattern as `load()`). With no rows there
   * is nothing to filter, so nothing is requested.
   */
  loadDimensions(): void {
    const token = ++this.dimensionsToken;
    const versionId = this.versionId();
    this.dimensionsNotice.set(false);

    if (this.rows().length === 0 || versionId === null) {
      this.dimensions.set({ status: 'idle', map: null });
      return;
    }

    this.dimensions.set({ status: 'loading', map: null });
    this.api.resultsSE.GET_PortfolioResultDimensions(versionId).subscribe({
      next: envelope => {
        if (token !== this.dimensionsToken) return;
        const map = envelope?.response ?? null;
        if (!map) {
          this.failDimensions();
          return;
        }
        this.dimensions.set({ status: 'ready', map });
        this.reconcileSelection();
      },
      error: () => {
        if (token !== this.dimensionsToken) return;
        this.failDimensions();
      }
    });
  }

  retryDimensions(): void {
    this.loadDimensions();
  }

  setSelection(selection: PortfolioFilterSelection): void {
    this.selection.set(selection);
    this.reconcileSelection();
  }

  toggleValue(dimension: FilterDimension, value: string): void {
    const values = new Set(this.selection()[dimension]);
    if (!values.delete(value)) values.add(value);
    this.selection.set({ ...this.selection(), [dimension]: values });
  }

  clearDimension(dimension: FilterDimension): void {
    if (this.selection()[dimension].size === 0) return;
    this.selection.set({ ...this.selection(), [dimension]: new Set<string>() });
  }

  clearAll(): void {
    this.selection.set(EMPTY_SELECTION);
  }

  /** Map failed: Project and Center cannot be told, so those selections go, and the page says so (GLF-R-13). */
  private failDimensions(): void {
    this.dimensions.set({ status: 'error', map: null });
    const selection = this.selection();
    if (selection.project.size > 0 || selection.center.size > 0) {
      this.selection.set({ ...selection, project: new Set<string>(), center: new Set<string>() });
      this.dimensionsNotice.set(true);
    }
  }

  /**
   * Drops the selected values that are not options. Program, Typology and Status are checked as soon as there
   * are rows; Project and Center only once the map is ready (until then they are kept: the filter is pending).
   */
  private reconcileSelection(): void {
    const current = this.selection();
    if (!isActive(current) || this.rows().length === 0) return;
    const clean = sanitize(current, this.options());
    const mapReady = this.dimensions().status === 'ready';
    const next: PortfolioFilterSelection = {
      ...clean,
      project: mapReady ? clean.project : current.project,
      center: mapReady ? clean.center : current.center
    };
    if (FILTER_DIMENSIONS.some(d => next[d].size !== current[d].size)) this.selection.set(next);
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
    this.reconcileSelection();
    this.phaseName.set(text(items[0]?.phase_name));
    this.portfolioAcronym.set(text(items[0]?.acronym));
  }

  /** The programme's display name, from whichever of the two name fields the payload carries. */
  private programmeName(code: string): string {
    const row = this.rows().find(item => text(item.submitter) === code);
    return text(row?.submitter_name) || text(row?.submitter_short_name) || code;
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
    this.fetchedCount.set(0);
    this.phaseName.set('');
    this.portfolioAcronym.set('');
    this.closedPhase.set(false);
    this.isPartial.set(false);
    ++this.dimensionsToken;
    this.dimensions.set({ status: 'idle', map: null });
  }
}
