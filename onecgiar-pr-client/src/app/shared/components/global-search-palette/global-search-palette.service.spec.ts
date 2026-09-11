import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { ApiService } from '../../services/api/api.service';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { GlobalSearchPaletteService, PALETTE_DEBOUNCE_MS, toPaletteResultRow } from './global-search-palette.service';

const sp = (id: number, code: string, name: string) => ({ initiativeId: id, initiativeCode: code, initiativeName: name }) as any;

const item = (over: Record<string, unknown> = {}) => ({
  id: '10',
  result_code: '5844',
  title: 'Maize resilience in East Africa',
  submitter: 'SP01',
  status_id: '1',
  status_name: 'Editing',
  version_id: '12',
  ...over
});

describe('GlobalSearchPaletteService', () => {
  let service: GlobalSearchPaletteService;
  let getAll: jest.Mock;
  let homeMock: any;

  const advance = (ms = PALETTE_DEBOUNCE_MS + 5) => {
    jest.advanceTimersByTime(ms);
    TestBed.tick();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    getAll = jest.fn().mockReturnValue(of({ response: { items: [item()] } }));
    homeMock = {
      mySPsList: signal([sp(1, 'SP01', 'Sustainable Farming')]),
      otherSPsList: signal([sp(2, 'SP02', 'Nutritious Diets')]),
      otherProjectsList: signal([sp(41, 'SGP-02', 'AVISA')])
    };

    TestBed.configureTestingModule({
      providers: [
        GlobalSearchPaletteService,
        {
          provide: ApiService,
          useValue: { authSE: { localStorageUser: { id: 7 } }, resultsSE: { GET_AllResultsWithUseRole: getAll } }
        },
        { provide: ResultFrameworkReportingHomeService, useValue: homeMock }
      ]
    });
    service = TestBed.inject(GlobalSearchPaletteService);
  });

  afterEach(() => jest.useRealTimers());

  // ── programs: synchronous, no request ───────────────────────────────────────────────────────────
  describe('programs group', () => {
    it('filters synchronously on the first character, with no request', () => {
      service.query.set('s');
      expect(service.programHits().map((p) => p.code)).toEqual(['SP01', 'SP02', 'SGP-02']);
      expect(getAll).not.toHaveBeenCalled();
    });

    it('matches case-insensitively on both the code and the name', () => {
      service.query.set('nutritious');
      expect(service.programHits().map((p) => p.code)).toEqual(['SP02']);

      service.query.set('sp01');
      expect(service.programHits().map((p) => p.code)).toEqual(['SP01']);
    });

    it('returns nothing for an empty query and for a miss', () => {
      service.query.set('');
      expect(service.programHits()).toEqual([]);
      service.query.set('zzzz');
      expect(service.programHits()).toEqual([]);
    });

    it('offers every programme as a scope option', () => {
      expect(service.scopeOptions().map((o) => o.id)).toEqual([1, 2, 41]);
    });
  });

  // ── results: debounce, minimum length, cancellation ─────────────────────────────────────────────
  describe('results group', () => {
    it('issues no request below the 2-character minimum, and says so', () => {
      service.query.set('m');
      advance();
      expect(getAll).not.toHaveBeenCalled();
      expect(service.resultsTooShort()).toBe(true);
    });

    it('never calls the endpoint with an empty title', () => {
      service.query.set('ma');
      advance();
      service.query.set('');
      advance();
      expect(getAll).toHaveBeenCalledTimes(1);
      expect(getAll.mock.calls[0][1].title).toBe('ma');
      expect(service.resultsIdle()).toBe(true);
    });

    it('requests once after the debounce, with the limit the design implies', () => {
      service.query.set('maize');
      advance();
      expect(getAll).toHaveBeenCalledTimes(1);
      expect(getAll).toHaveBeenCalledWith(7, { title: 'maize', limit: 5, page: 1 });
      expect(service.resultRows()).toHaveLength(1);
    });

    it('collapses a burst of keystrokes into a single request for the final query', () => {
      for (const q of ['m', 'ma', 'mai', 'maiz', 'maize']) {
        service.query.set(q);
        jest.advanceTimersByTime(40);
      }
      advance();
      expect(getAll).toHaveBeenCalledTimes(1);
      expect(getAll.mock.calls[0][1].title).toBe('maize');
    });

    it('trims the query before sending it', () => {
      service.query.set('  maize  ');
      advance();
      expect(getAll.mock.calls[0][1].title).toBe('maize');
    });

    it('maps the payload onto the row the design draws', () => {
      service.query.set('maize');
      advance();
      expect(service.resultRows()[0]).toEqual({
        id: 10,
        code: 5844,
        title: 'Maize resilience in East Africa',
        submitterCode: 'SP01',
        statusId: 1,
        statusName: 'Editing',
        versionId: 12
      });
    });

    it('cancels a superseded request and renders only the last response', () => {
      const first = new Subject<any>();
      const second = new Subject<any>();
      getAll.mockReturnValueOnce(first).mockReturnValueOnce(second);

      service.query.set('maize');
      advance();
      service.query.set('cassava');
      advance();

      // The stale response must be ignored even if the server answers it late.
      first.next({ response: { items: [item({ title: 'STALE' })] } });
      second.next({ response: { items: [item({ title: 'FRESH' })] } });
      TestBed.tick();

      expect(service.resultRows().map((r) => r.title)).toEqual(['FRESH']);
    });

    it('keeps the previous rows visible while the next request is in flight', () => {
      service.query.set('maize');
      advance();
      expect(service.resultRows()).toHaveLength(1);

      getAll.mockReturnValueOnce(new Subject<any>());
      service.query.set('maizes');
      advance();

      expect(service.resultsLoading()).toBe(true);
      expect(service.resultRows()).toHaveLength(1);
    });

    it('reports an empty result set without claiming an error', () => {
      getAll.mockReturnValue(of({ response: { items: [] } }));
      service.query.set('zzz');
      advance();
      expect(service.resultsEmpty()).toBe(true);
      expect(service.resultsError()).toBe(false);
    });

    it('treats the endpoint 404 as EMPTY, not as an error', () => {
      // prtest returns 404 "Results Not Found" for a query that matches nothing, rather than 200
      // with an empty items array. Verified live 2026-08-21.
      getAll.mockReturnValueOnce(throwError(() => ({ status: 404, message: 'Results Not Found' })));
      service.query.set('zzqqxx');
      advance();
      expect(service.resultsEmpty()).toBe(true);
      expect(service.resultsError()).toBe(false);
      expect(service.resultRows()).toEqual([]);
    });

    it('still reports a real server failure as an error', () => {
      getAll.mockReturnValueOnce(throwError(() => ({ status: 500 })));
      service.query.set('maize');
      advance();
      expect(service.resultsError()).toBe(true);
      expect(service.resultsEmpty()).toBe(false);
    });

    it('surfaces an error and stays alive for the next keystroke', () => {
      getAll.mockReturnValueOnce(throwError(() => ({ status: 500, message: 'boom' })));
      service.query.set('maize');
      advance();
      expect(service.resultsError()).toBe(true);
      expect(service.resultsLoading()).toBe(false);

      getAll.mockReturnValueOnce(of({ response: { items: [item()] } }));
      service.query.set('cassava');
      advance();
      expect(service.resultsError()).toBe(false);
      expect(service.resultRows()).toHaveLength(1);
    });

    it('does not leave a stuck spinner when a request is cancelled', () => {
      getAll.mockReturnValueOnce(new Subject<any>());
      service.query.set('maize');
      advance();
      expect(service.resultsLoading()).toBe(true);

      service.query.set('cassava');
      advance();
      expect(service.resultsLoading()).toBe(false);
    });
  });

  // ── scope: the bug that keying the stream fixes ─────────────────────────────────────────────────
  describe('programme scope', () => {
    it('omits submitter_id for the All programs default', () => {
      service.query.set('maize');
      advance();
      expect(getAll.mock.calls[0][1].submitter_id).toBeUndefined();
    });

    it('passes submitter_id when scoped to one programme', () => {
      service.scope.set(2);
      service.query.set('maize');
      advance();
      expect(getAll.mock.calls[0][1].submitter_id).toBe('2');
    });

    it('RE-REQUESTS when only the scope changes — the query is unchanged', () => {
      service.query.set('maize');
      advance();
      expect(getAll).toHaveBeenCalledTimes(1);

      service.scope.set(2);
      advance();

      // If `scope` were read inside the switchMap instead of being part of the stream key, this
      // would still be 1 and the user would keep seeing another programme's rows.
      expect(getAll).toHaveBeenCalledTimes(2);
      expect(getAll.mock.calls[1][1]).toEqual({ title: 'maize', limit: 5, page: 1, submitter_id: '2' });
    });

    it('clears the previous rows immediately on a scope change — they are the wrong corpus', () => {
      service.query.set('maize');
      advance();
      expect(service.resultRows()).toHaveLength(1);

      getAll.mockReturnValueOnce(new Subject<any>());
      service.scope.set(2);
      advance();

      expect(service.resultsLoading()).toBe(true);
      expect(service.resultRows()).toEqual([]);
    });

    it('does not re-request when neither the query nor the scope actually changed', () => {
      service.query.set('maize');
      advance();
      service.query.set('maize');
      advance();
      expect(getAll).toHaveBeenCalledTimes(1);
    });

    it('leaves the programs group unscoped', () => {
      service.scope.set(1);
      service.query.set('s');
      expect(service.programHits()).toHaveLength(3);
    });
  });

  it('reset clears the query and the scope', () => {
    service.query.set('maize');
    service.scope.set(2);
    service.reset();
    expect(service.query()).toBe('');
    expect(service.scope()).toBeNull();
  });

  describe('toPaletteResultRow', () => {
    it('coerces the numeric strings the API returns', () => {
      const row = toPaletteResultRow(item());
      expect(row.id).toBe(10);
      expect(row.code).toBe(5844);
      expect(row.statusId).toBe(1);
      expect(row.versionId).toBe(12);
    });

    it('tolerates a missing payload without throwing', () => {
      const row = toPaletteResultRow({});
      expect(row.title).toBe('');
      expect(row.submitterCode).toBe('');
      expect(row.statusName).toBe('');
    });
  });
});
