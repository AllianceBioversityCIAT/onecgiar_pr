import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { ApiService } from '../../services/api/api.service';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { SPProgress } from '../../interfaces/SP-progress.interface';

/** Below this, no request is issued — a 1-char `LIKE '%a%'` scans effectively the whole table. */
export const PALETTE_MIN_QUERY = 2;
/** The design draws no pagination and no "load more"; the Results Center list is the "see all". */
export const PALETTE_RESULT_LIMIT = 5;
/**
 * 250 ms, deliberately NOT the 500 ms used by the two field-level lookups
 * (`report-result-form.component.ts:396`, `lead-contact-person-field.component.ts:49`). Those are
 * form fields where a pause is expected; a palette is a navigation control where 500 ms reads as lag.
 */
export const PALETTE_DEBOUNCE_MS = 250;

export interface PaletteResultRow {
  id: number;
  code: number;
  title: string;
  /** Submitter official code — `SP01` for 2026 science programmes, `INIT-01` for legacy portfolios. */
  submitterCode: string;
  statusId: number;
  statusName: string;
  versionId: number;
}

export interface PaletteProgramRow {
  id: number;
  code: string;
  name: string;
}

export type PaletteResultsState =
  | { kind: 'idle' }
  | { kind: 'too-short' }
  | { kind: 'loading'; rows: PaletteResultRow[] }
  | { kind: 'loaded'; rows: PaletteResultRow[] }
  | { kind: 'error' };

/**
 * Search state for the global palette. Provided by the palette COMPONENT, not `root`: closing the
 * palette must drop the query, the scope and the rows rather than leak them into the next open.
 */
@Injectable()
export class GlobalSearchPaletteService {
  private readonly api = inject(ApiService);
  private readonly homeSE = inject(ResultFrameworkReportingHomeService);

  readonly query = signal('');
  /** `null` = the design's default `All programs`. Otherwise a science programme `initiativeId`. */
  readonly scope = signal<number | null>(null);

  /** Every programme the user can see, in the sidebar's own order. Already in memory — no request. */
  readonly programs = computed<SPProgress[]>(() => [
    ...this.homeSE.mySPsList(),
    ...this.homeSE.otherSPsList(),
    ...this.homeSE.otherProjectsList()
  ]);

  readonly scopeOptions = computed(() =>
    this.programs().map((sp) => ({ id: sp.initiativeId, code: sp.initiativeCode, name: sp.initiativeName }))
  );

  /**
   * Programmes filter SYNCHRONOUSLY, from the first character, with no debounce and no request —
   * the list is already in memory, so making the user wait 250 ms for it would be theatre.
   */
  readonly programHits = computed<PaletteProgramRow[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    return this.programs()
      .filter(
        (sp) =>
          (sp.initiativeCode ?? '').toLowerCase().includes(q) || (sp.initiativeName ?? '').toLowerCase().includes(q)
      )
      .map((sp) => ({ id: sp.initiativeId, code: sp.initiativeCode, name: sp.initiativeName }));
  });

  /**
   * The query and the scope are ONE stream key. Reading `scope()` inside the `switchMap` projector
   * instead would mean a scope change with an unchanged query emits nothing — leaving rows from the
   * wrong programme on screen. A request-generation token does not fix that; keying the stream does.
   */
  private readonly queryAndScope = computed(() => ({ q: this.query().trim(), scope: this.scope() }));

  private readonly resultsState = toSignal(
    toObservable(this.queryAndScope).pipe(
      debounceTime(PALETTE_DEBOUNCE_MS),
      distinctUntilChanged((a, b) => a.q === b.q && a.scope === b.scope),
      switchMap(({ q, scope }) => {
        if (!q) return of<PaletteResultsState>({ kind: 'idle' });
        if (q.length < PALETTE_MIN_QUERY) return of<PaletteResultsState>({ kind: 'too-short' });

        // Keep the rows already on screen while the next response is in flight, so typing does not
        // flash an empty list — but only for the SAME scope. A scope change is a different corpus,
        // so its stale rows are cleared instead of carried over.
        const carried = scope === this._lastScope ? this._lastRows : [];
        this._lastScope = scope;
        this._lastRows = carried;

        return this.fetchResults(q, scope).pipe(
          map((rows) => {
            this._lastRows = rows;
            return { kind: 'loaded', rows } as PaletteResultsState;
          }),
          // Inside the projector on purpose: on the outer pipe, one 500 would terminate the whole
          // type-ahead until the component remounted.
          catchError((err) => {
            this._lastRows = [];
            // ⚠️ The endpoint answers **404 "Results Not Found"** when nothing matches, instead of
            // 200 with an empty `items` array (verified on prtest 2026-08-21: `?title=zzqqxx` →
            // 404, `?title=maize` → 200 with 5 items). A 404 here is an EMPTY RESULT, not a
            // failure — reporting it as an error told the user the search broke when it simply
            // found nothing.
            if (err?.status === 404) return of<PaletteResultsState>({ kind: 'loaded', rows: [] });
            return of<PaletteResultsState>({ kind: 'error' });
          }),
          startWith({ kind: 'loading', rows: carried } as PaletteResultsState)
        );
      }),
      takeUntilDestroyed()
    ),
    { initialValue: { kind: 'idle' } as PaletteResultsState }
  );

  /**
   * Plain fields, not signals: they are read and written INSIDE the `switchMap` projector, and
   * reading the `resultsState` signal there would be a circular read of the very signal this
   * pipeline feeds.
   */
  private _lastScope: number | null = null;
  private _lastRows: PaletteResultRow[] = [];

  readonly resultRows = computed<PaletteResultRow[]>(() => {
    const s = this.resultsState();
    return s.kind === 'loaded' || s.kind === 'loading' ? s.rows : [];
  });
  readonly resultsLoading = computed(() => this.resultsState().kind === 'loading');
  readonly resultsError = computed(() => this.resultsState().kind === 'error');
  readonly resultsTooShort = computed(() => this.resultsState().kind === 'too-short');
  readonly resultsIdle = computed(() => this.resultsState().kind === 'idle');
  readonly resultsEmpty = computed(() => this.resultsState().kind === 'loaded' && this.resultRows().length === 0);

  private fetchResults(title: string, scope: number | null) {
    const userId = this.api.authSE.localStorageUser?.id;
    return this.api.resultsSE
      .GET_AllResultsWithUseRole(userId, {
        title,
        limit: PALETTE_RESULT_LIMIT,
        page: 1,
        ...(scope !== null ? { submitter_id: String(scope) } : {})
      })
      .pipe(map((resp: any) => (resp?.response?.items ?? []).map(toPaletteResultRow)));
  }

  reset(): void {
    this.query.set('');
    this.scope.set(null);
    this._lastScope = null;
    this._lastRows = [];
  }
}

export function toPaletteResultRow(item: any): PaletteResultRow {
  return {
    id: Number(item?.id),
    code: Number(item?.result_code),
    title: item?.title ?? '',
    submitterCode: item?.submitter ?? '',
    statusId: Number(item?.status_id),
    statusName: item?.status_name ?? '',
    versionId: Number(item?.version_id)
  };
}
