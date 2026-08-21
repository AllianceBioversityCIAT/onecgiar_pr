import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { PROGRAMME_RESULTS_PAGE_LIMIT, ProgrammeResultsService, toProgrammeResultRow } from './programme-results.service';

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

function progressResponse() {
  return {
    response: {
      mySciencePrograms: [
        { initiativeId: 41, initiativeCode: 'SGP-02', initiativeName: 'AVISA' },
        { initiativeId: 50, initiativeCode: 'SP01', initiativeName: 'Breeding for Tomorrow' }
      ],
      otherSciencePrograms: [{ initiativeId: 55, initiativeCode: 'SP06', initiativeName: 'Climate Action' }]
    }
  };
}

function resultsResponse(items: Record<string, any>[], total = items.length) {
  return { response: { items, meta: { total: String(total), page: 1, limit: PROGRAMME_RESULTS_PAGE_LIMIT, totalPages: 1 } } };
}

describe('ProgrammeResultsService', () => {
  let service: ProgrammeResultsService;
  let GET_ScienceProgramsProgress: jest.Mock;
  let GET_AllResultsWithUseRole: jest.Mock;
  let localStorageUser: { id: number } | null;

  function build() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ProgrammeResultsService,
        {
          provide: ApiService,
          useValue: {
            resultsSE: { GET_ScienceProgramsProgress, GET_AllResultsWithUseRole },
            authSE: {
              get localStorageUser() {
                return localStorageUser;
              }
            }
          }
        }
      ]
    });
    service = TestBed.inject(ProgrammeResultsService);
  }

  beforeEach(() => {
    localStorageUser = { id: 2 };
    GET_ScienceProgramsProgress = jest.fn().mockReturnValue(of(progressResponse()));
    GET_AllResultsWithUseRole = jest.fn().mockReturnValue(of(resultsResponse([rawResult()])));
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

      expect(GET_ScienceProgramsProgress).toHaveBeenCalledTimes(1);
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
          createdBy: 'Guest Tester',
          created: '2025-08-29T16:37:46.000Z',
          origin: 'W1/W2',
          center: '',
          updated: '',
          indicator: '',
          section: '',
          versionId: '34',
          submitterCode: 'SP01'
        }
      ]);
    });

    it('errors when the programme code is not in the progress response, without asking for rows', () => {
      service.load('SP99');

      expect(GET_AllResultsWithUseRole).not.toHaveBeenCalled();
      expect(service.rows()).toEqual([]);
      expect(service.error()).toBe('Programme "SP99" was not found.');
      expect(service.loading()).toBe(false);
    });

    it('errors on an empty code without calling the API at all', () => {
      service.load('   ');

      expect(GET_ScienceProgramsProgress).not.toHaveBeenCalled();
      expect(service.error()).toBe('No programme code was provided.');
    });

    it('errors when there is no logged-in user id', () => {
      localStorageUser = null;
      build();

      service.load('SP01');

      expect(GET_ScienceProgramsProgress).not.toHaveBeenCalled();
      expect(service.error()).toBe('Your session could not be read. Please sign in again.');
    });

    it('surfaces a failed rows request and leaves no stale rows behind', () => {
      service.load('SP01');
      expect(service.rows()).toHaveLength(1);

      GET_AllResultsWithUseRole.mockReturnValue(throwError(() => new Error('boom')));
      service.load('SP01');

      expect(service.rows()).toEqual([]);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBe('The results of this programme could not be loaded.');
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
            rawResult({ status_name: 'Submitted', result_type: 'Innovation development', source_name: 'W3/Bilaterals' }),
            rawResult({ status_name: 'Editing', result_type: 'Capacity sharing', source_name: 'W1/W2' }),
            rawResult({ status_name: 'Editing', result_type: 'Capacity sharing', source_name: 'W1/W2' }),
            rawResult({ status_name: null, result_type: '', source_name: undefined })
          ])
        )
      );
      service.load('SP01');
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

    it('never offers an empty option', () => {
      const all = [...service.statusOptions(), ...service.categoryOptions(), ...service.originOptions()];
      expect(all.every(option => option.length > 0)).toBe(true);
    });

    it('empties the option lists again on reset()', () => {
      service.reset();

      expect(service.statusOptions()).toEqual([]);
      expect(service.categoryOptions()).toEqual([]);
      expect(service.originOptions()).toEqual([]);
      expect(service.rows()).toEqual([]);
      expect(service.initiativeId()).toBeNull();
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
  });
});
