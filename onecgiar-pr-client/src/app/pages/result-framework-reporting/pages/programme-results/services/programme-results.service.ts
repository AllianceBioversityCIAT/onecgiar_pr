import { computed, inject, Injectable, signal } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { SPProgress } from '../../../../../shared/interfaces/SP-progress.interface';

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
   * The SECTION column (AoW code + name). ALWAYS EMPTY: this endpoint has no AoW field,
   * and the only endpoint that does (`by-program-and-centers`) is server-hard-filtered to
   * the bilateral review queue. Known, ticketed gap — P2-3399.
   */
  section: string;

  // --- raw fields the "Open result" route needs -------------------------------------
  // Mirrors results-list.component.ts:634 `getResultRoute()`, whose branch reads exactly
  // result_code, version_id, status_name, source_name, submitter and id. Kept raw here so
  // the route helper can stay a pure function of the row.
  /** `version_id` — `?phase=` on the result-detail route. */
  versionId: string;
  /** `submitter` — the programme official code (e.g. `SP01`) in the review-drawer route. */
  submitterCode: string;
}

/** Envelope of `GET /api/results/get/all/roles/filter/{userId}` (paginated). */
interface AllResultsEnvelope {
  response?: {
    items?: Record<string, any>[];
    meta?: { total?: string | number; page?: number; limit?: number; totalPages?: number };
  };
}

/** Envelope of `GET /api/results-framework-reporting/get/science-programs/progress`. */
interface ScienceProgramsEnvelope {
  response?: { mySciencePrograms?: SPProgress[]; otherSciencePrograms?: SPProgress[] };
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

/** Maps one raw payload item to the row the table renders. Exported for the spec. */
export function toProgrammeResultRow(raw: Record<string, any>): ProgrammeResultRow {
  const firstName = text(raw?.['create_first_name']);
  const lastName = text(raw?.['create_last_name']);

  return {
    id: num(raw?.['id']),
    code: text(raw?.['result_code']),
    title: text(raw?.['title']),
    category: text(raw?.['result_type']),
    statusId: num(raw?.['status_id']),
    statusName: text(raw?.['status_name']),
    createdBy: [firstName, lastName].filter(Boolean).join(' '),
    created: text(raw?.['created_date']),
    origin: text(raw?.['source_name']),
    center: text(raw?.['lead_center']),
    updated: text(raw?.['last_updated_date'] ?? raw?.['updated_date']),
    indicator: '',
    section: '',
    versionId: text(raw?.['version_id']),
    submitterCode: text(raw?.['submitter'])
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

  /** Discards a late response when `load()` was called again with a different programme. */
  private requestToken = 0;

  /** The programme code (official code, e.g. `SP01`) the current rows belong to. */
  readonly programmeCode = signal<string>('');
  /** The resolved numeric initiative id used as `submitter_id`. */
  readonly initiativeId = signal<number | null>(null);

  readonly rows = signal<ProgrammeResultRow[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  /** `meta.total` as reported by the server for this programme (already a number). */
  readonly totalReported = signal<number>(0);
  /** True when the server holds more rows than the single page we asked for. */
  readonly isPartial = signal<boolean>(false);

  /** How many rows we actually hold. */
  readonly loadedCount = computed(() => this.rows().length);

  // Option lists are DERIVED from the rows we hold (bilateral-results.service.ts:57-71),
  // never hardcoded, so a dropdown can only ever offer a value that matches something.
  readonly statusOptions = computed(() => optionsOf(this.rows(), row => row.statusName));
  readonly categoryOptions = computed(() => optionsOf(this.rows(), row => row.category));
  readonly originOptions = computed(() => optionsOf(this.rows(), row => row.origin));

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

    this.resolveInitiativeId(code)
      .pipe(
        switchMap(initiativeId => {
          if (token !== this.requestToken) return of(null);
          if (initiativeId === null) return of(null);

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
            // resolveInitiativeId already decided what went wrong.
            this.rows.set([]);
            this.totalReported.set(0);
            this.isPartial.set(false);
            this.loading.set(false);
            if (!this.error()) this.error.set(`Program "${code}" was not found.`);
            return;
          }

          const items = envelope?.response?.items ?? [];
          const total = num(envelope?.response?.meta?.total) ?? items.length;

          this.rows.set(items.map(toProgrammeResultRow));
          this.totalReported.set(total);
          this.isPartial.set(total > items.length);
          this.loading.set(false);
        },
        error: () => {
          if (token !== this.requestToken) return;
          this.rows.set([]);
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
    this.rows.set([]);
    this.initiativeId.set(null);
    this.totalReported.set(0);
    this.isPartial.set(false);
    this.loading.set(false);
    this.error.set(null);
  }

  /**
   * Official code (`SP01`) -> numeric initiative id (`50`). Emits `null` when the code is
   * not in the response, and records why in `error`.
   */
  private resolveInitiativeId(code: string): Observable<number | null> {
    const wanted = code.toUpperCase();

    return (this.api.resultsSE.GET_ScienceProgramsProgress() as Observable<ScienceProgramsEnvelope>).pipe(
      switchMap(envelope => {
        const programmes = [...(envelope?.response?.mySciencePrograms ?? []), ...(envelope?.response?.otherSciencePrograms ?? [])];
        const match = programmes.find(programme => text(programme?.initiativeCode).toUpperCase() === wanted);
        const id = num(match?.initiativeId);

        if (id === null) this.error.set(`Program "${code}" was not found.`);
        return of(id);
      })
    );
  }
}
