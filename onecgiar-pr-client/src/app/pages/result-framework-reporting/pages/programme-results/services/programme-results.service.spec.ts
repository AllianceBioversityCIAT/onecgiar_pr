import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ApiService } from '../../../../../shared/services/api/api.service';
// @akili-spec changes/my-work-board (MWB-T-2, MWB-DD-3)
import { ScienceProgramIdService } from '../../../services/science-program-id.service';
import {
  joinResultScope,
  PROGRAMME_RESULTS_PAGE_LIMIT,
  ProgrammeResultsService,
  ResultScope,
  toProgrammeResultRow
} from './programme-results.service';

/** One raw item as `GET /api/results/get/all/roles/filter/{userId}` really returns it. */
function rawResult(partial: Record<string, any> = {}): Record<string, any> {
  return {
    id: '8101',
    result_code: '5834',
    title: 'Breeding pipeline optimisation',
    result_type: 'Impact contribution',
    status_id: '1',
    status_name: 'Editing',
    created_date: '2025-08-29T16:37:46.000Z',
    create_first_name: 'Guest',
    create_last_name: 'Tester',
    source_name: 'W1/W2',
    lead_center: null,
    version_id: '34',
    submitter: 'SP01',
    submitter_id: 50,
    ...partial
  };
}

/**
 * `ScienceProgramIdService` moved this lookup out of `ProgrammeResultsService` (`MWB-T-2`,
 * `MWB-DD-3`) — the same code -> id table `progressResponse()` used to return, now served by a
 * stub `resolve()` instead of a mocked `GET_ScienceProgramsProgress`.
 */
const SP_CODE_TO_ID: Record<string, number> = { SP01: 50, SP06: 55 };

function resultsResponse(items: Record<string, any>[], total = items.length) {
  return { response: { items, meta: { total: String(total), page: 1, limit: PROGRAMME_RESULTS_PAGE_LIMIT, totalPages: 1 } } };
}

/** Envelope of `GET results-framework-reporting/results-scope` (RAC-T-1). */
function scopeResponse(buckets: Array<{ result_id: number | string; key: string; kind: 'aow' | 'outcome' | 'untagged'; codes: string[] }>) {
  return { response: { programId: 'SP01', versionId: 36, buckets } };
}

describe('ProgrammeResultsService', () => {
  let service: ProgrammeResultsService;
  let resolve: jest.Mock;
  let GET_AllResultsWithUseRole: jest.Mock;
  let GET_ResultsScope: jest.Mock;
  let localStorageUser: { id: number } | null;

  function build() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ProgrammeResultsService,
        {
          provide: ApiService,
          useValue: {
            resultsSE: { GET_AllResultsWithUseRole, GET_ResultsScope },
            authSE: {
              get localStorageUser() {
                return localStorageUser;
              }
            }
          }
        },
        { provide: ScienceProgramIdService, useValue: { resolve } }
      ]
    });
    service = TestBed.inject(ProgrammeResultsService);
  }

  beforeEach(() => {
    localStorageUser = { id: 2 };
    resolve = jest.fn((code: string) => of(SP_CODE_TO_ID[(code ?? '').trim().toUpperCase()] ?? null));
    GET_AllResultsWithUseRole = jest.fn().mockReturnValue(of(resultsResponse([rawResult()])));
    GET_ResultsScope = jest.fn().mockReturnValue(of(scopeResponse([])));
    build();
  });

  it('starts empty', () => {
    expect(service.rows()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
    expect(service.isPartial()).toBe(false);
    expect(service.totalReported()).toBe(0);
    expect(service.initiativeId()).toBeNull();
  });

  describe('load()', () => {
    it('resolves the official code to the numeric initiative id and asks for one big page', () => {
      service.load('SP01');

      expect(resolve).toHaveBeenCalledWith('SP01');
      expect(GET_AllResultsWithUseRole).toHaveBeenCalledWith(2, {
        submitter_id: '50',
        limit: PROGRAMME_RESULTS_PAGE_LIMIT,
        page: 1
      });
      expect(service.initiativeId()).toBe(50);
      expect(service.programmeCode()).toBe('SP01');
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('matches the programme code case-insensitively and ignores surrounding spaces', () => {
      service.load('  sp06 ');

      expect(service.initiativeId()).toBe(55);
      expect(GET_AllResultsWithUseRole).toHaveBeenCalledWith(2, expect.objectContaining({ submitter_id: '55' }));
    });

    it('maps every row to the table contract', () => {
      service.load('SP01');

      expect(service.rows()).toEqual([
        {
          id: 8101,
          code: '5834',
          title: 'Breeding pipeline optimisation',
          category: 'Impact contribution',
          statusId: 1,
          statusName: 'Editing',
          // @akili-spec changes/my-work-board (MWB-T-2, MWB-DD-4) — fixture never sets result_type_id.
          resultTypeId: null,
          createdBy: 'Guest Tester',
          created: '2025-08-29T16:37:46.000Z',
          origin: 'W1/W2',
          center: '',
          updated: '',
          indicator: '',
          // RAC-T-2 — `service.rows()` is the JOINED signal. `loadScope()` was never called in
          // this test, so `joinResultScope`'s fallback (no scope held, not loading) applies:
          // every row reads as the residual bucket, not as "unknown".
          section: 'UNTAGGED',
          aowCodes: [],
          sectionState: 'ready',
          sectionSort: '3_UNTAGGED',
          versionId: '34',
          phaseName: '',
          phaseYear: null,
          submitterCode: 'SP01',
          // P2-3508 — the untouched item rides along so the "Update result" eligibility rule and
          // the phase modal can read the same object the old Results list reads.
          raw: expect.objectContaining({ id: '8101', result_code: '5834' })
        }
      ]);
    });

    // P2-3508 — the eligibility rule reads fields this row does not map (initiative_entity_map,
    // initiative_entity_user). If `raw` ever stops being the whole item, "Update result" silently
    // disappears for everyone, which is exactly the bug the ticket reported.
    it('keeps the whole payload item on the row, not just the mapped fields', () => {
      service.load('SP01');

      const raw = service.rows()[0].raw;
      expect(raw).toBeDefined();
      expect(Object.keys(raw).length).toBeGreaterThan(10);
      expect(raw['submitter']).toBe('SP01');
    });

    it('errors when the programme code is not in the progress response, without asking for rows', () => {
      service.load('SP99');

      expect(GET_AllResultsWithUseRole).not.toHaveBeenCalled();
      expect(service.rows()).toEqual([]);
      expect(service.error()).toBe('Program "SP99" was not found.');
      expect(service.loading()).toBe(false);
    });

    it('errors on an empty code without calling the API at all', () => {
      service.load('   ');

      expect(resolve).not.toHaveBeenCalled();
      expect(service.error()).toBe('No program code was provided.');
    });

    it('errors when there is no logged-in user id', () => {
      localStorageUser = null;
      build();

      service.load('SP01');

      expect(resolve).not.toHaveBeenCalled();
      expect(service.error()).toBe('Your session could not be read. Please sign in again.');
    });

    it('surfaces a failed rows request and leaves no stale rows behind', () => {
      service.load('SP01');
      expect(service.rows()).toHaveLength(1);

      GET_AllResultsWithUseRole.mockReturnValue(throwError(() => new Error('boom')));
      service.load('SP01');

      expect(service.rows()).toEqual([]);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBe('The results of this program could not be loaded.');
    });

    it('tolerates a response with no items or meta', () => {
      GET_AllResultsWithUseRole.mockReturnValue(of({ response: {} }));

      service.load('SP01');

      expect(service.rows()).toEqual([]);
      expect(service.totalReported()).toBe(0);
      expect(service.isPartial()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('ignores a superseded response so a late programme cannot overwrite the current one', () => {
      const slowFirstCall = new Subject<any>();
      GET_AllResultsWithUseRole.mockReturnValueOnce(slowFirstCall.asObservable());

      service.load('SP01');
      service.load('SP06');

      // The first request answers only now, with the previous programme's rows.
      slowFirstCall.next(resultsResponse([rawResult({ result_code: '111' })], 999));
      slowFirstCall.complete();

      expect(service.programmeCode()).toBe('SP06');
      expect(service.initiativeId()).toBe(55);
      expect(service.rows()).toHaveLength(1);
      expect(service.rows()[0].code).toBe('5834');
      expect(service.isPartial()).toBe(false);
    });

    it('ignores a superseded error so a late failure cannot blank the current programme', () => {
      const slowFirstCall = new Subject<any>();
      GET_AllResultsWithUseRole.mockReturnValueOnce(slowFirstCall.asObservable());

      service.load('SP01');
      service.load('SP06');
      slowFirstCall.error(new Error('boom'));

      expect(service.rows()).toHaveLength(1);
      expect(service.error()).toBeNull();
    });
  });

  describe('partial-response guard', () => {
    it('stays complete when the server total equals what came back', () => {
      GET_AllResultsWithUseRole.mockReturnValue(of(resultsResponse([rawResult(), rawResult({ result_code: '2' })], 2)));

      service.load('SP01');

      expect(service.totalReported()).toBe(2);
      expect(service.loadedCount()).toBe(2);
      expect(service.isPartial()).toBe(false);
    });

    it('flags the list as partial when the server reports more rows than it sent', () => {
      GET_AllResultsWithUseRole.mockReturnValue(of(resultsResponse([rawResult()], 4761)));

      service.load('SP01');

      expect(service.isPartial()).toBe(true);
      expect(service.totalReported()).toBe(4761);
      expect(service.loadedCount()).toBe(1);
    });

    it('falls back to the row count when meta.total is missing', () => {
      GET_AllResultsWithUseRole.mockReturnValue(of({ response: { items: [rawResult()] } }));

      service.load('SP01');

      expect(service.totalReported()).toBe(1);
      expect(service.isPartial()).toBe(false);
    });
  });

  describe('derived option lists', () => {
    beforeEach(() => {
      GET_AllResultsWithUseRole.mockReturnValue(
        of(
          resultsResponse([
            rawResult({ status_name: 'Submitted', result_type: 'Innovation development', source_name: 'W3/Bilaterals', lead_center: 'IITA', phase_name: 'Reporting 2026 - P26' }),
            rawResult({ status_name: 'Editing', result_type: 'Capacity sharing', source_name: 'W1/W2', lead_center: 'IWMI', phase_name: 'Reporting 2024 - P24' }),
            rawResult({ status_name: 'Editing', result_type: 'Capacity sharing', source_name: 'W1/W2', lead_center: 'IWMI', phase_name: 'Reporting 2026 - P26' }),
            rawResult({ status_name: null, result_type: '', source_name: undefined, lead_center: '', phase_name: '' }),
            rawResult({ status_name: 'Editing', result_type: 'Capacity sharing', source_name: 'W1/W2', lead_center: null, phase_name: null })
          ])
        )
      );
      service.load('SP01');
    });

    it('derives sorted descending, de-duplicated phase options', () => {
      expect(service.phaseOptions()).toEqual(['Reporting 2026 - P26', 'Reporting 2024 - P24']);
    });

    it('derives sorted, de-duplicated status options', () => {
      expect(service.statusOptions()).toEqual(['Editing', 'Submitted']);
    });

    it('derives sorted, de-duplicated category options', () => {
      expect(service.categoryOptions()).toEqual(['Capacity sharing', 'Innovation development']);
    });

    it('derives sorted, de-duplicated origin options', () => {
      expect(service.originOptions()).toEqual(['W1/W2', 'W3/Bilaterals']);
    });

    it('derives sorted, de-duplicated center options, dropping empty-string and null centers', () => {
      expect(service.centerOptions()).toEqual(['IITA', 'IWMI']);
    });

    it('never offers an empty option', () => {
      const all = [
        ...service.phaseOptions(),
        ...service.statusOptions(),
        ...service.categoryOptions(),
        ...service.originOptions(),
        ...service.centerOptions(),
        ...service.createdByOptions()
      ];
      expect(all.every(option => option.length > 0)).toBe(true);
    });

    it('empties the option lists again on reset()', () => {
      service.reset();

      expect(service.phaseOptions()).toEqual([]);
      expect(service.statusOptions()).toEqual([]);
      expect(service.categoryOptions()).toEqual([]);
      expect(service.originOptions()).toEqual([]);
      expect(service.centerOptions()).toEqual([]);
      expect(service.createdByOptions()).toEqual([]);
      expect(service.rows()).toEqual([]);
      expect(service.initiativeId()).toBeNull();
    });
  });

  describe('createdByOptions (CBF-T-1)', () => {
    it('derives sorted, de-duplicated Created by options and drops blanks and missing names (CBF-R-1)', () => {
      GET_AllResultsWithUseRole.mockReturnValue(
        of(
          resultsResponse([
            rawResult({ create_first_name: 'Santiago', create_last_name: 'Sanchez' }),
            rawResult({ create_first_name: 'Angel', create_last_name: 'Jarrin' }),
            rawResult({ create_first_name: 'Angel', create_last_name: 'Jarrin' }),
            rawResult({ create_first_name: '', create_last_name: '' }),
            rawResult({ create_first_name: null, create_last_name: null })
          ])
        )
      );
      service.load('SP01');

      expect(service.createdByOptions()).toEqual(['Angel Jarrin', 'Santiago Sanchez']);
      expect(service.createdByOptions().some(option => option.trim() === '')).toBe(false);
    });
  });

  describe('loadScope() — Area of Work join (RAC-T-2)', () => {
    beforeEach(() => {
      // The shared fixture's `version_id` is '34' — buckets are fetched for that same phase
      // unless a test says otherwise (version-mismatch test below).
      service.load('SP01');
    });

    it('calls GET_ResultsScope with the programme code and the phase versionId', () => {
      service.loadScope('SP01', 36);
      expect(GET_ResultsScope).toHaveBeenCalledWith('SP01', 36);
    });

    it('joins a bucket by numeric result_id and carries every AoW code (RAC-R-1)', () => {
      GET_ResultsScope.mockReturnValue(of(scopeResponse([{ result_id: 8101, key: 'AOW01', kind: 'aow', codes: ['AOW01', 'AOW02'] }])));
      service.loadScope('SP01', 34);

      const row = service.rows()[0];
      expect(row.section).toBe('AOW01');
      expect(row.aowCodes).toEqual(['AOW01', 'AOW02']);
      expect(row.sectionState).toBe('ready');
      expect(row.sectionSort).toBe('0_AOW01');
    });

    it('normalises a string-keyed bucket result_id to join by Number', () => {
      GET_ResultsScope.mockReturnValue(of(scopeResponse([{ result_id: '8101', key: 'INTERMEDIATE', kind: 'outcome', codes: [] }])));
      service.loadScope('SP01', 34);

      expect(service.rows()[0].section).toBe('INTERMEDIATE');
      expect(service.rows()[0].sectionSort).toBe('1_INTERMEDIATE');
    });

    it('defaults an unmatched row (no bucket for its id) to UNTAGGED, not a silent blank', () => {
      // The bucket set is real, just for a DIFFERENT result — id 8101 (this row) has none.
      GET_ResultsScope.mockReturnValue(of(scopeResponse([{ result_id: 999999, key: 'AOW01', kind: 'aow', codes: ['AOW01'] }])));
      service.loadScope('SP01', 34);

      const row = service.rows()[0];
      expect(row.section).toBe('UNTAGGED');
      expect(row.aowCodes).toEqual([]);
      expect(row.sectionState).toBe('ready');
    });

    it('renders the loading state while the request is in flight — never a stale bucket (RAC-R-2.1)', () => {
      const slow = new Subject<any>();
      GET_ResultsScope.mockReturnValue(slow.asObservable());
      service.loadScope('SP01', 34);

      expect(service.scopeLoading()).toBe(true);
      const row = service.rows()[0];
      expect(row.sectionState).toBe('loading');
      expect(row.section).toBe('');
    });

    it('surfaces a failed scope request as section \'\' + sectionState \'error\' (RAC-R-2.1)', () => {
      GET_ResultsScope.mockReturnValue(throwError(() => new Error('boom')));
      service.loadScope('SP01', 34);

      expect(service.scopeError()).toBe('The Area of Work buckets could not be loaded.');
      const row = service.rows()[0];
      expect(row.sectionState).toBe('error');
      expect(row.section).toBe('');
    });

    it("flags a row as 'version-mismatch' when its phase differs from the loaded buckets' phase (A-1)", () => {
      GET_ResultsScope.mockReturnValue(of(scopeResponse([{ result_id: 8101, key: 'AOW01', kind: 'aow', codes: ['AOW01'] }])));
      // This programme's only row carries version_id '34' — fetch buckets for phase 36 instead.
      service.loadScope('SP01', 36);

      const row = service.rows()[0];
      expect(row.sectionState).toBe('version-mismatch');
      expect(row.section).toBe('');
    });

    it('ignores a superseded scope response so a stale call cannot overwrite the current one', () => {
      const slowFirst = new Subject<any>();
      GET_ResultsScope.mockReturnValueOnce(slowFirst.asObservable());
      GET_ResultsScope.mockReturnValueOnce(of(scopeResponse([{ result_id: 8101, key: 'AOW03', kind: 'aow', codes: ['AOW03'] }])));

      service.loadScope('SP01', 34);
      service.loadScope('SP01', 34);

      // The first request answers only now, with a bucket belonging to the superseded call.
      slowFirst.next(scopeResponse([{ result_id: 8101, key: 'AOW02', kind: 'aow', codes: ['AOW02'] }]));
      slowFirst.complete();

      expect(service.rows()[0].section).toBe('AOW03');
    });

    it('skips the request and clears any held scope when versionId is not resolved yet', () => {
      GET_ResultsScope.mockReturnValue(of(scopeResponse([{ result_id: 8101, key: 'AOW01', kind: 'aow', codes: ['AOW01'] }])));
      service.loadScope('SP01', 34);
      expect(service.scope()).not.toBeNull();

      service.loadScope('SP01', null);

      expect(GET_ResultsScope).toHaveBeenCalledTimes(1);
      expect(service.scope()).toBeNull();
      expect(service.scopeLoading()).toBe(false);
    });

    it('clears the scope state on reset()', () => {
      GET_ResultsScope.mockReturnValue(of(scopeResponse([{ result_id: 8101, key: 'AOW01', kind: 'aow', codes: ['AOW01'] }])));
      service.loadScope('SP01', 34);

      service.reset();

      expect(service.scope()).toBeNull();
      expect(service.scopeLoading()).toBe(false);
      expect(service.scopeError()).toBeNull();
    });
  });

  describe('joinResultScope() (RAC-T-2)', () => {
    const base = toProgrammeResultRow(rawResult({ id: '9006', version_id: '36' }));

    it('joins the bucket matching the row id when the versions agree', () => {
      const scope = new Map<number, ResultScope>([[9006, { key: 'AOW01', kind: 'aow', codes: ['AOW01', 'AOW02'] }]]);
      const joined = joinResultScope(base, scope, 36, false, null);
      expect(joined).toEqual(
        expect.objectContaining({ section: 'AOW01', aowCodes: ['AOW01', 'AOW02'], sectionState: 'ready', sectionSort: '0_AOW01' })
      );
    });

    it('prefers loading over a held scope', () => {
      const scope = new Map<number, ResultScope>([[9006, { key: 'AOW01', kind: 'aow', codes: ['AOW01'] }]]);
      const joined = joinResultScope(base, scope, 36, true, null);
      expect(joined.sectionState).toBe('loading');
      expect(joined.section).toBe('');
    });

    it('prefers a scope error over a held scope', () => {
      const scope = new Map<number, ResultScope>([[9006, { key: 'AOW01', kind: 'aow', codes: ['AOW01'] }]]);
      const joined = joinResultScope(base, scope, 36, false, 'boom');
      expect(joined.sectionState).toBe('error');
    });

    it("flags a version mismatch when the row's phase differs from the scope's (A-1)", () => {
      const scope = new Map<number, ResultScope>([[9006, { key: 'AOW01', kind: 'aow', codes: ['AOW01'] }]]);
      const joined = joinResultScope(base, scope, 35, false, null);
      expect(joined.sectionState).toBe('version-mismatch');
      expect(joined.section).toBe('');
    });

    it('defaults to UNTAGGED when the scope has no bucket for this row (unmatched row)', () => {
      const scope = new Map<number, ResultScope>();
      const joined = joinResultScope(base, scope, 36, false, null);
      expect(joined.section).toBe('UNTAGGED');
      expect(joined.sectionState).toBe('ready');
    });
  });

  describe('toProgrammeResultRow()', () => {
    it('keeps indicator and section empty even when the payload sneaks values in', () => {
      const row = toProgrammeResultRow(rawResult({ indicator: 'IND-1', section: 'AoW1', acronym: 'P25' } as any));

      expect(row.indicator).toBe('');
      expect(row.section).toBe('');
    });

    it('reads updated from last_updated_date when the backend starts sending it', () => {
      expect(toProgrammeResultRow(rawResult({ last_updated_date: '2026-08-20T10:00:00.000Z' })).updated).toBe('2026-08-20T10:00:00.000Z');
      expect(toProgrammeResultRow(rawResult()).updated).toBe('');
    });

    it('coerces the string ids the endpoint returns and nulls the unusable ones', () => {
      expect(toProgrammeResultRow(rawResult({ id: '8101', status_id: '5' })).statusId).toBe(5);
      expect(toProgrammeResultRow(rawResult({ status_id: null, id: null })).statusId).toBeNull();
      expect(toProgrammeResultRow(rawResult({ id: null })).id).toBeNull();
    });

    it('builds createdBy as first name then last name, tolerating a missing half', () => {
      expect(toProgrammeResultRow(rawResult()).createdBy).toBe('Guest Tester');
      expect(toProgrammeResultRow(rawResult({ create_first_name: null })).createdBy).toBe('Tester');
      expect(toProgrammeResultRow(rawResult({ create_first_name: null, create_last_name: null })).createdBy).toBe('');
    });

    it('keeps the raw fields the Open result route needs', () => {
      const row = toProgrammeResultRow(rawResult({ source_name: 'W3/Bilaterals', status_name: 'Pending Review' }));

      expect(row.id).toBe(8101);
      expect(row.code).toBe('5834');
      expect(row.versionId).toBe('34');
      expect(row.submitterCode).toBe('SP01');
      expect(row.origin).toBe('W3/Bilaterals');
      expect(row.statusName).toBe('Pending Review');
    });

    // @akili-spec changes/my-work-board (MWB-T-2, MWB-DD-4)
    it('coerces result_type_id, nulling it when absent or unusable', () => {
      expect(toProgrammeResultRow(rawResult({ result_type_id: '6' })).resultTypeId).toBe(6);
      expect(toProgrammeResultRow(rawResult()).resultTypeId).toBeNull();
      expect(toProgrammeResultRow(rawResult({ result_type_id: null })).resultTypeId).toBeNull();
    });

    // @akili-spec changes/my-work-board (MWB-T-2, MWB-R-8) — passthrough incl. an explicit null,
    // and no key at all when the caller never asked for the flag.
    it('passes completeness through verbatim, including an explicit null, and omits the key when absent', () => {
      const withCompleteness = toProgrammeResultRow(
        rawResult({ completeness: { complete: 2, total: 5, missing: ['geographic-location', 'contributor-partners', 'knowledge-product-info'] } })
      );
      expect(withCompleteness.completeness).toEqual({
        complete: 2,
        total: 5,
        missing: ['geographic-location', 'contributor-partners', 'knowledge-product-info']
      });

      const withNullCompleteness = toProgrammeResultRow(rawResult({ completeness: null }));
      expect(withNullCompleteness.completeness).toBeNull();
      expect(Object.prototype.hasOwnProperty.call(withNullCompleteness, 'completeness')).toBe(true);

      const withoutFlag = toProgrammeResultRow(rawResult());
      expect(Object.prototype.hasOwnProperty.call(withoutFlag, 'completeness')).toBe(false);
    });
  });
});
