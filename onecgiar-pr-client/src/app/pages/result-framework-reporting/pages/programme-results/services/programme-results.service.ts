import { computed, inject, Injectable, signal } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { ApiService } from '../../../../../shared/services/api/api.service';
// @akili-spec changes/results-aow-column-filter (RAC-T-3, R-7)
import { Unit } from '../../entity-details/interfaces/entity-details.interface';
// @akili-spec changes/my-work-board (MWB-T-2, MWB-DD-3)
import { ScienceProgramIdService } from '../../../services/science-program-id.service';

/**
 * One row of the programme Results table.
 *
 * Field-by-field origin in the `GET /api/results/get/all/roles/filter/{userId}` payload
 * (results-api.service.ts:51). Only what the table renders is kept — the raw item also
 * carries `initiative_entity_user` (the whole user's role tree, repeated on EVERY row),
 * which is why the rows are mapped instead of handed to the template as-is.
 */
export interface ProgrammeResultRow {
  /** `id` — the result's internal id. Needed for the bilateral review deep link. */
  id: number | null;
  /** `result_code` — the CODE column and the first segment of the result-detail route. */
  code: string;
  /** `title` — the RESULT column, line 1. */
  title: string;
  /** `result_type` — the CATEGORY column and the Category filter. */
  category: string;
  /** `status_id`. Drives the status token pair (`--pr-status-*-fg/bg`). */
  statusId: number | null;
  /** `status_name` — the STATUS pill label and the Status filter. */
  statusName: string;
  // @akili-spec changes/my-work-board (MWB-T-2, MWB-DD-4)
  /** `result_type_id` — needed by the My work board to tell an IPSR package apart from a
   *  results-validation-module result (eligibility for `completeness`, `MWB-R-8`). Not shown by
   *  the Results tab table itself, which renders `category` (`result_type`) instead. */
  resultTypeId: number | null;
  /** `create_first_name` + `create_last_name` — the CREATED BY optional column. */
  createdBy: string;
  /** `created_date`, raw ISO string. Formatting belongs to the template. */
  created: string;
  /** `source_name` (`W1/W2` | `W3/Bilaterals`) — the ORIGIN column and the Origin filter. */
  origin: string;
  /** `lead_center` — the CENTER optional column. Null on most non-bilateral rows. */
  center: string;
  /**
   * The UPDATED column. ⚠️ The list payload does NOT carry a last-updated timestamp
   * (verified live 2026-08-21: the item keys are id, result_code, title, reported_year,
   * result_type, result_level_name, result_type_id, created_date, submitter*, status*,
   * role*, is_new, phase*, result_level_id, no_applicable_partner, geographic_scope_id,
   * legacy_id, created_by, create_*_name, version_id, portfolio*, acronym, source_name,
   * has_discontinued_options, lead_center, initiative_entity_map/_user — no `*updated*`).
   * Mapped defensively from `last_updated_date` / `updated_date` so it lights up the day
   * the backend adds it; until then it is an empty string and the cell renders blank.
   */
  updated: string;
  /**
   * The RESULT column's second line (indicator / KPI). ALWAYS EMPTY: no results-list
   * payload carries a ToC indicator. Known, ticketed gap — P2-3398.
   */
  indicator: string;
  /**
   * The SECTION column — the Overview's scope-bucket key (`AOW01`, `INTERMEDIATE`, `EOI_2030`,
   * `UNTAGGED`) joined client-side from `GET results-framework-reporting/results-scope`
   * (RAC-T-2, `programme-results.service.ts` `joinResultScope`). `''` while the buckets are
   * loading/errored or when this row's phase differs from the loaded buckets' phase (A-1) —
   * see `sectionState`.
   */
  section: string;
  /**
   * Every AoW code the result's active ToC links touch (`kind: 'aow'` buckets only, RAC-R-1);
   * `[]` for the fixed keys and while unset. Drives the `+N` / `title` on the Area of Work cell
   * (RAC-R-2). Optional so a `ProgrammeResultRow` literal built elsewhere (tests, RAC-T-3's own
   * fixtures) does not have to name it — `ProgrammeResultsService.rows()` always sets it.
   */
  aowCodes?: string[];
  /**
   * Whether `section`/`aowCodes` reflect a real join (`'ready'`), the scope request is still in
   * flight (`'loading'`), it failed (`'error'`), or this row's `versionId` differs from the
   * phase the loaded buckets were fetched for (`'version-mismatch'`, A-1). Drives the Area of
   * Work cell's skeleton / `—`+title / normal rendering (RAC-R-2.1). Optional for the same
   * reason as `aowCodes`.
   */
  sectionState?: 'ready' | 'loading' | 'error' | 'version-mismatch';
  /**
   * Sort rank for the Area of Work column (RAC-R-2.2): `0_<code>` for an AoW (alphabetical by
   * code), then `1_INTERMEDIATE`, `2_EOI_2030`, `3_UNTAGGED`; `9_` while there is no section to
   * rank (loading/error/mismatch). Optional for the same reason as `aowCodes`.
   */
  sectionSort?: string;

  // --- raw fields the "Open result" route needs -------------------------------------
  // Mirrors results-list.component.ts:634 `getResultRoute()`, whose branch reads exactly
  // result_code, version_id, status_name, source_name, submitter and id. Kept raw here so
  // the route helper can stay a pure function of the row.
  /** `version_id` — `?phase=` on the result-detail route. */
  versionId: string;
  /** `phase_name` — for phase filtering and display. */
  phaseName: string;
  /** `phase_year` — for phase filtering and display. */
  phaseYear: number | null;
  /** `submitter` — the programme official code (e.g. `SP01`) in the review-drawer route. */
  submitterCode: string;

  /**
   * P2-3508 — the untouched payload item.
   *
   * "Update result" cannot be decided from the mapped fields: `ApiService.shouldShowUpdate`
   * reads `initiative_entity_map` / `initiative_entity_user`, and `ChangePhaseModalComponent`
   * reads `id`, `result_code`, `source_name`, `lead_center`, `submitter` and
   * `initiative_entity_map` straight off `DataControlService.currentResult`. Re-mapping each of
   * those into this row would fork the eligibility rule from the one the old Results list
   * enforces; keeping the raw item means both screens ask the exact same question of the exact
   * same object. It costs nothing extra — the response is already in memory.
   */
  raw: Record<string, any>;

  // @akili-spec changes/my-work-board (MWB-T-2, MWB-R-8, MWB-DD-4)
  /**
   * `completeness` — present ONLY when the payload carried `include_completeness=true`
   * (`MWB-R-8`). `{ complete, total, missing }` for an eligible item the server validated;
   * `null` for every ineligible item, an item past the server cap, or a failed validation call.
   * Optional (not `| undefined` in the type) so every existing `ProgrammeResultRow` literal
   * (Results tab, tests) that never asked for the flag does not have to name this field at all —
   * `toProgrammeResultRow` only sets it when the raw item actually carries the key, preserving an
   * explicit `null` rather than collapsing it to "absent".
   */
  completeness?: { complete: number; total: number; missing: string[] } | null;
}

/** Envelope of `GET /api/results/get/all/roles/filter/{userId}` (paginated). */
interface AllResultsEnvelope {
  response?: {
    items?: Record<string, any>[];
    meta?: { total?: string | number; page?: number; limit?: number; totalPages?: number };
  };
}

// @akili-spec changes/results-aow-column-filter (RAC-T-2)
// ── Area of Work scope join ─────────────────────────────────────────────────────────────────

/** One result's scope bucket, held in the map `loadScope()` builds. */
export interface ResultScope {
  key: string;
  kind: 'aow' | 'outcome' | 'untagged';
  codes: string[];
}

/** Envelope of `GET /api/results-framework-reporting/results-scope` (RAC-T-1). */
interface ResultsScopeEnvelope {
  response?: {
    programId?: string;
    versionId?: number;
    buckets?: Array<{ result_id: number | string; key: string; kind: 'aow' | 'outcome' | 'untagged'; codes: string[] }>;
  };
}

// @akili-spec changes/results-aow-column-filter (RAC-T-3, R-7)
/** Envelope of `GET /api/results-framework-reporting/clarisa-global-units` — same request the
 *  Overview already makes (`dashboard-lab.component.ts` `cacheAows`), read here ONLY for
 *  `response.units[].{code,name}` (RAC-R-7's AoW display names). */
interface ClarisaGlobalUnitsEnvelope {
  response?: { units?: Unit[] };
}

/** `0_AOW01` … `3_UNTAGGED`, alphabetical within `aow` (RAC-R-2.2). `''`/unset sorts last. */
function sectionSortRank(key: string): string {
  if (!key) return '9_';
  if (key === 'INTERMEDIATE') return `1_${key}`;
  if (key === 'EOI_2030') return `2_${key}`;
  if (key === 'UNTAGGED') return `3_${key}`;
  return `0_${key}`;
}

/**
 * Joins one base row with the currently held scope state (design.md §6.2, RAC-DD-5, A-1).
 * Pure — exported for the spec.
 *
 * Precedence: a request in flight always renders as loading (never a stale bucket); a failed
 * request always renders as an error; only once both are clear does a phase mismatch matter —
 * comparing against a scope this row does not belong to would otherwise misreport a mismatch
 * while the *next* phase's buckets are still loading.
 */
export function joinResultScope(
  row: ProgrammeResultRow,
  scope: Map<number, ResultScope> | null,
  scopeVersionId: number | null,
  scopeLoading: boolean,
  scopeError: string | null
): ProgrammeResultRow {
  if (scopeLoading) {
    return { ...row, section: '', aowCodes: [], sectionState: 'loading', sectionSort: sectionSortRank('') };
  }
  if (scopeError) {
    return { ...row, section: '', aowCodes: [], sectionState: 'error', sectionSort: sectionSortRank('') };
  }
  if (scope && scopeVersionId !== null) {
    const rowVersionId = num(row.versionId);
    if (rowVersionId === null || rowVersionId !== scopeVersionId) {
      return { ...row, section: '', aowCodes: [], sectionState: 'version-mismatch', sectionSort: sectionSortRank('') };
    }
  }
  const bucket = scope?.get(num(row.id) ?? NaN);
  const key = bucket?.key ?? 'UNTAGGED';
  return {
    ...row,
    section: key,
    aowCodes: bucket?.codes ?? [],
    sectionState: 'ready',
    sectionSort: sectionSortRank(key)
  };
}

/**
 * VOLUME DECISION — one request, everything client-side.
 *
 * The endpoint is already server-scoped to a single programme through `submitter_id`, so
 * the whole set is small and bounded (verified live on prtest 2026-08-21: SP01 =>
 * `meta.total` 476). We therefore ask for it in ONE page with this limit and do all
 * filtering, sorting and counting in the browser, because:
 *   1. the status counters must describe the WHOLE programme, not the current page — a
 *      server-paginated table can only count what it holds, which would make the pills lie;
 *   2. the design has no pagination and no "load more" control anywhere in the block;
 *   3. 476 mapped rows is nothing next to the two-line-per-row DOM the table already pays for.
 * Guarded, not assumed: if `meta.total` comes back larger than what we asked for, `isPartial`
 * flips and `totalReported` holds the real number so the UI can say the list is partial
 * instead of silently showing a truncated set as if it were everything.
 */
export const PROGRAMME_RESULTS_PAGE_LIMIT = 2000;

/** Trims a raw payload value into a display string. `null`/`undefined` become ''. */
function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

/** Numeric ids arrive as strings on this endpoint (`status_id: "1"`), so coerce. */
function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Sorted, de-duplicated, empty-free option list — so no dropdown ever offers a blank. */
function optionsOf(rows: ProgrammeResultRow[], pick: (row: ProgrammeResultRow) => string): string[] {
  const unique = new Set(rows.map(pick).filter(value => !!value));
  return [...unique].sort((a, b) => a.localeCompare(b));
}

/** Maps one raw payload item to the row the table renders. Exported for the spec and reused by
 *  `MyWorkBoardService`/`MyWorkCountService` (T-3) — one mapping of the payload, `MWB-DD-4`. */
export function toProgrammeResultRow(raw: Record<string, any>): ProgrammeResultRow {
  const firstName = text(raw?.['create_first_name']);
  const lastName = text(raw?.['create_last_name']);
  // @akili-spec changes/my-work-board (MWB-T-2, MWB-R-8) — `completeness` only exists on the
  // payload when the caller asked for `include_completeness=true`; preserve an explicit `null`
  // rather than let `??`/optional-chaining collapse it to "absent" like `undefined` would.
  const hasCompleteness = !!raw && Object.prototype.hasOwnProperty.call(raw, 'completeness');

  return {
    id: num(raw?.['id']),
    code: text(raw?.['result_code']),
    title: text(raw?.['title']),
    category: text(raw?.['result_type']),
    statusId: num(raw?.['status_id']),
    statusName: text(raw?.['status_name']),
    resultTypeId: num(raw?.['result_type_id']),
    createdBy: [firstName, lastName].filter(Boolean).join(' '),
    created: text(raw?.['created_date']),
    origin: text(raw?.['source_name']),
    center: text(raw?.['lead_center']),
    updated: text(raw?.['last_updated_date'] ?? raw?.['updated_date']),
    indicator: '',
    section: '',
    versionId: text(raw?.['version_id']),
    phaseName: text(raw?.['phase_name']),
    phaseYear: num(raw?.['phase_year']),
    submitterCode: text(raw?.['submitter']),
    raw: raw ?? {},
    ...(hasCompleteness ? { completeness: raw['completeness'] } : {})
  };
}

/**
 * Loads ONE programme's results for the Results tab of the programme shell.
 *
 * The route carries the programme's official code (`SP01`); the results endpoint wants the
 * numeric initiative id (`50`). `GET_ScienceProgramsProgress()` is the mapping — it is the
 * same call the shell already makes on entry (result-framework-reporting.component.ts:16),
 * so it is normally a warm request.
 *
 * Not `providedIn: 'root'`: the state is per-programme-screen. Provide it on the Results
 * tab component so leaving the tab drops the rows instead of leaking them to the next
 * programme.
 */
@Injectable()
export class ProgrammeResultsService {
  private readonly api = inject(ApiService);
  // @akili-spec changes/my-work-board (MWB-T-2, MWB-DD-3)
  private readonly scienceProgramIdSE = inject(ScienceProgramIdService);

  /** Discards a late response when `load()` was called again with a different programme. */
  private requestToken = 0;
  /** Discards a late scope response when `loadScope()` was called again for another phase. */
  private scopeRequestToken = 0;

  /** The programme code (official code, e.g. `SP01`) the current rows belong to. */
  readonly programmeCode = signal<string>('');
  /** The resolved numeric initiative id used as `submitter_id`. */
  readonly initiativeId = signal<number | null>(null);

  /** Base rows from `get/all/roles/filter` — no Area of Work join applied yet. */
  private readonly rawRows = signal<ProgrammeResultRow[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // @akili-spec changes/results-aow-column-filter (RAC-T-2) — Area of Work scope
  /** `result_id -> ResultScope`, keyed by `Number(result_id)` (buckets may arrive string-keyed). */
  readonly scope = signal<Map<number, ResultScope> | null>(null);
  readonly scopeLoading = signal<boolean>(false);
  readonly scopeError = signal<string | null>(null);
  /** The phase `scope()` was fetched for — the join's version guard (A-1). */
  private readonly scopeVersionId = signal<number | null>(null);

  // @akili-spec changes/results-aow-column-filter (RAC-T-3, R-7)
  /** Discards a late unit-names response when `loadUnits()` was called again for another programme. */
  private unitsRequestToken = 0;
  /**
   * `AoW code (upper-case) -> display name`, for `sectionOptions()`'s R-7 "name beside the code"
   * (SHOULD, not blocking). FAIL-SOFT by design: this is decoration on an option label, not data
   * the table or the filter depends on, so a failed/slow request just leaves the map empty and
   * every option falls back to its code alone — no error state, no `—`, nothing else reacts.
   */
  readonly unitNames = signal<Map<string, string>>(new Map());

  /**
   * Rows the table renders: the base rows joined with the currently held scope state
   * (`joinResultScope`, RAC-T-2). Public API unchanged — still a `Signal<ProgrammeResultRow[]>`
   * callers read with `rows()`; only its `WritableSignal` internals moved to `rawRows`.
   */
  readonly rows = computed<ProgrammeResultRow[]>(() => {
    const scope = this.scope();
    const scopeVersionId = this.scopeVersionId();
    const scopeLoading = this.scopeLoading();
    const scopeError = this.scopeError();
    return this.rawRows().map(row => joinResultScope(row, scope, scopeVersionId, scopeLoading, scopeError));
  });

  /** `meta.total` as reported by the server for this programme (already a number). */
  readonly totalReported = signal<number>(0);
  /** True when the server holds more rows than the single page we asked for. */
  readonly isPartial = signal<boolean>(false);

  /** How many rows we actually hold. */
  readonly loadedCount = computed(() => this.rows().length);

  // Option lists are DERIVED from the rows we hold (bilateral-results.service.ts:57-71),
  // never hardcoded, so a dropdown can only ever offer a value that matches something.
  readonly phaseOptions = computed(() => {
    const unique = new Set(
      this.rows()
        .map(row => row.phaseName || (row.phaseYear ? `Phase ${row.phaseYear}` : ''))
        .filter(Boolean)
    );
    return [...unique].sort((a, b) => b.localeCompare(a));
  });
  readonly statusOptions = computed(() => optionsOf(this.rows(), row => row.statusName));
  readonly categoryOptions = computed(() => optionsOf(this.rows(), row => row.category));
  readonly originOptions = computed(() => optionsOf(this.rows(), row => row.origin));
  readonly centerOptions = computed(() => optionsOf(this.rows(), row => row.center));
  readonly createdByOptions = computed(() => optionsOf(this.rows(), row => row.createdBy));

  /**
   * Loads the programme's results. Safe to call again: a second call supersedes the first.
   * @param programmeCode the programme's official code from the route (e.g. `SP01`).
   */
  load(programmeCode: string): void {
    const code = text(programmeCode);
    const token = ++this.requestToken;

    this.programmeCode.set(code);

    if (!code) {
      this.reset();
      this.error.set('No program code was provided.');
      return;
    }

    const userId = this.api.authSE?.localStorageUser?.id;
    if (!userId) {
      this.reset();
      this.error.set('Your session could not be read. Please sign in again.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.scienceProgramIdSE
      .resolve(code)
      .pipe(
        switchMap(initiativeId => {
          if (token !== this.requestToken) return of(null);
          if (initiativeId === null) {
            // Keep the Results tab's exact wording — MWB-T-2 moved the lookup, not the message.
            this.error.set(`Program "${code}" was not found.`);
            return of(null);
          }

          this.initiativeId.set(initiativeId);
          return this.api.resultsSE.GET_AllResultsWithUseRole(userId, {
            submitter_id: String(initiativeId),
            limit: PROGRAMME_RESULTS_PAGE_LIMIT,
            page: 1
          }) as Observable<AllResultsEnvelope>;
        })
      )
      .subscribe({
        next: envelope => {
          if (token !== this.requestToken) return;

          if (envelope === null) {
            // The switchMap branch above already set this.error() for a null initiativeId.
            this.rawRows.set([]);
            this.totalReported.set(0);
            this.isPartial.set(false);
            this.loading.set(false);
            if (!this.error()) this.error.set(`Program "${code}" was not found.`);
            return;
          }

          const items = envelope?.response?.items ?? [];
          const total = num(envelope?.response?.meta?.total) ?? items.length;

          this.rawRows.set(items.map(toProgrammeResultRow));
          this.totalReported.set(total);
          this.isPartial.set(total > items.length);
          this.loading.set(false);
        },
        error: () => {
          if (token !== this.requestToken) return;
          this.rawRows.set([]);
          this.totalReported.set(0);
          this.isPartial.set(false);
          this.loading.set(false);
          this.error.set('The results of this program could not be loaded.');
        }
      });
  }

  /** Drops every row and flag. Call when leaving the tab. */
  reset(): void {
    this.requestToken++;
    this.scopeRequestToken++;
    this.unitsRequestToken++;
    this.rawRows.set([]);
    this.initiativeId.set(null);
    this.scope.set(null);
    this.scopeVersionId.set(null);
    this.scopeLoading.set(false);
    this.scopeError.set(null);
    this.unitNames.set(new Map());
    this.totalReported.set(0);
    this.isPartial.set(false);
    this.loading.set(false);
    this.error.set(null);
  }

  // @akili-spec changes/results-aow-column-filter (RAC-T-2)
  /**
   * Loads this programme's Area of Work scope buckets for one phase (RAC-T-2). Token-guarded
   * like `load()`: a call in flight is superseded by a later one, never merged with it. Safe to
   * call with an unresolved phase (`versionId: null`, e.g. before the rows have loaded) — the
   * request is skipped and any previously held scope is cleared.
   *
   * @param programId the programme's official code (e.g. `SP01`) — the endpoint resolves it
   *   itself, same as `GET_ClarisaGlobalUnits` / `GET_DashboardData`.
   * @param versionId the phase's numeric version id the buckets must be pinned to (A-1).
   */
  loadScope(programId: string, versionId: number | null): void {
    const code = text(programId);
    const token = ++this.scopeRequestToken;

    if (!code || versionId === null || !Number.isFinite(versionId)) {
      this.scope.set(null);
      this.scopeVersionId.set(null);
      this.scopeLoading.set(false);
      this.scopeError.set(null);
      return;
    }

    this.scopeLoading.set(true);
    this.scopeError.set(null);

    (this.api.resultsSE.GET_ResultsScope(code, versionId) as Observable<ResultsScopeEnvelope>).subscribe({
      next: envelope => {
        if (token !== this.scopeRequestToken) return;

        const buckets = envelope?.response?.buckets ?? [];
        const map = new Map<number, ResultScope>();
        for (const bucket of buckets) {
          const id = num(bucket?.result_id);
          if (id === null) continue;
          map.set(id, { key: bucket.key, kind: bucket.kind, codes: bucket.codes ?? [] });
        }

        this.scope.set(map);
        this.scopeVersionId.set(versionId);
        this.scopeLoading.set(false);
      },
      error: () => {
        if (token !== this.scopeRequestToken) return;
        this.scope.set(null);
        this.scopeVersionId.set(null);
        this.scopeLoading.set(false);
        this.scopeError.set('The Area of Work buckets could not be loaded.');
      }
    });
  }

  // @akili-spec changes/results-aow-column-filter (RAC-T-3, R-7)
  /**
   * Loads this programme's AoW display names for the Section filter's option labels (R-7,
   * SHOULD). Token-guarded like `load()`/`loadScope()`, but FAIL-SOFT where those two are not:
   * an empty/failed response just leaves `unitNames` at `{}` — every option label falls back to
   * its bare code, nothing else in the tab observes this signal. Same request the Overview
   * already makes for its scope breakdown (`dashboard-lab.component.ts` `cacheAows`), by the
   * programme's official code — no phase dimension, so callers need not refetch on phase change.
   */
  loadUnits(programId: string): void {
    const code = text(programId);
    const token = ++this.unitsRequestToken;

    if (!code) {
      this.unitNames.set(new Map());
      return;
    }

    (this.api.resultsSE.GET_ClarisaGlobalUnits(code) as Observable<ClarisaGlobalUnitsEnvelope>).subscribe({
      next: envelope => {
        if (token !== this.unitsRequestToken) return;

        const units = envelope?.response?.units ?? [];
        const map = new Map<string, string>();
        for (const unit of units) {
          const code = text(unit?.code).toUpperCase();
          const name = text(unit?.name);
          if (code && name) map.set(code, name);
        }
        this.unitNames.set(map);
      },
      error: () => {
        if (token !== this.unitsRequestToken) return;
        this.unitNames.set(new Map());
      }
    });
  }
}
