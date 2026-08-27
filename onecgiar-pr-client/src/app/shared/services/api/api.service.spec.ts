import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ResultsApiService } from './results-api.service';
import { BilateralApiService } from './bilateral-api.service';
import { DataControlService } from '../data-control.service';
import { RolesService } from '../global/roles.service';
import { Title } from '@angular/platform-browser';
import { FieldsManagerService } from '../fields-manager.service';
import { ResultsListService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list.service';
import { ResultsListFilterService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { IpsrListFilterService } from '../../../pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/services/ipsr-list-filter.service';
import { QualityAssuranceService } from '../../../pages/quality-assurance/quality-assurance.service';
import { IpsrDataControlService } from '../../../pages/ipsr/services/ipsr-data-control.service';
import { CurrentResult } from '../../interfaces/current-result.interface';

/** ApiService.updateUserData assigns these on each initiative row. */
type MockMyInitiativeRow = {
  initiative_id: number;
  official_code: string;
  short_name: string;
  role?: string;
  name?: string;
  official_code_short_name?: string;
};

/** ApiService.updateResultsList assigns full_status_name_html on each item. */
type MockResultsListItem = {
  status_name: string;
  inQA: boolean;
  full_status_name_html?: string;
};

describe('ApiService', () => {
  let service: ApiService;
  let authServiceSpy: any;
  let resultsApiServiceSpy: any;
  let dataControlServiceSpy: any;
  let rolesServiceSpy: any;
  let titleServiceSpy: any;
  let fieldsManagerServiceSpy: any;
  let resultsListServiceSpy: any;
  let resultsListFilterServiceSpy: any;
  let ipsrListFilterServiceSpy: any;
  let qaServiceSpy: any;
  let ipsrDataControlServiceSpy: any;

  beforeEach(() => {
    authServiceSpy = {
      GET_allRolesByUser: jest.fn().mockReturnValue(of({ response: { initiative: [] } })),
      GET_initiativesByUser: jest.fn().mockReturnValue(of({ response: [] })),
      GET_initiativesByUserByPortfolio: jest.fn().mockReturnValue(of({ response: { reporting: [], ipsr: [] } })),
      localStorageUser: { id: 1, user_name: 'Test User', email: 'test@example.com' }
    };

    resultsApiServiceSpy = {
      GETInnovationPackageDetail: jest.fn().mockReturnValue(of({ response: {} })),
      GET_AllResultsWithUseRole: jest.fn().mockReturnValue(of({ response: { items: [] } }))
    };

    dataControlServiceSpy = {
      currentResultSignal: {
        set: jest.fn()
      },
      currentResult: null,
      myInitiativesList: [],
      myInitiativesListReportingByPortfolio: [],
      myInitiativesListIPSRByPortfolio: [],
      myInitiativesLoaded: false,
      resultsList: [],
      resultsListSignal: { set: jest.fn() },
      resultsListNoDataMessage: { set: jest.fn() }
    };

    rolesServiceSpy = {
      validateReadOnly: jest.fn(),
      applyRolesResponse: jest.fn(function (this: { roles: unknown; isAdmin: boolean }, response: { application?: { role_id: number } }) {
        if (!response) return;
        this.roles = response;
        this.isAdmin = response?.application?.role_id == 1;
      }),
      readOnly: false,
      isAdmin: false,
      getMyCenters: jest.fn(() => [] as any[]),
      roles: null,
      getIsAdminValue: jest.fn(function (this: { roles: { application?: { role_id: number } } | null; isAdmin: boolean }) {
        this.isAdmin = this.roles?.application?.role_id == 1;
      })
    };

    titleServiceSpy = { setTitle: jest.fn() };

    fieldsManagerServiceSpy = {
      inIpsr: {
        set: jest.fn()
      }
    };

    resultsListServiceSpy = { showLoadingResultSpinner: false };

    resultsListFilterServiceSpy = {
      updateMyInitiatives: jest.fn(),
      selectedPhases: jest.fn().mockReturnValue([]),
      filterCreatedByMe: jest.fn().mockReturnValue(false),
      filterSubmittedByMe: jest.fn().mockReturnValue(false)
    };

    ipsrListFilterServiceSpy = { updateMyInitiatives: jest.fn() };

    qaServiceSpy = { $qaFirstInitObserver: { next: jest.fn() } };

    ipsrDataControlServiceSpy = { initiative_id: null, resultInnovationPhase: null, detailData: null };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ResultsApiService, useValue: resultsApiServiceSpy },
        { provide: BilateralApiService, useValue: {} },
        { provide: DataControlService, useValue: dataControlServiceSpy },
        { provide: RolesService, useValue: rolesServiceSpy },
        { provide: Title, useValue: titleServiceSpy },
        { provide: FieldsManagerService, useValue: fieldsManagerServiceSpy },
        { provide: 'EndpointsService', useValue: {} },
        { provide: ResultsListService, useValue: resultsListServiceSpy },
        { provide: 'CustomizedAlertsFsService', useValue: {} },
        { provide: QualityAssuranceService, useValue: qaServiceSpy },
        { provide: 'CustomizedAlertsFeService', useValue: {} },
        { provide: ResultsListFilterService, useValue: resultsListFilterServiceSpy },
        { provide: 'WordCounterService', useValue: {} },
        { provide: 'TocApiService', useValue: {} },
        { provide: IpsrListFilterService, useValue: ipsrListFilterServiceSpy },
        { provide: 'GlobalVariablesService', useValue: {} },
        { provide: IpsrDataControlService, useValue: ipsrDataControlServiceSpy }
      ]
    });

    service = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('updateUserData', () => {
    it('should return early when localStorageUser has no id', () => {
      authServiceSpy.localStorageUser = { id: null };
      const callback = jest.fn();

      service.updateUserData(callback);

      expect(authServiceSpy.GET_allRolesByUser).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return early when localStorageUser is null', () => {
      authServiceSpy.localStorageUser = null;
      const callback = jest.fn();

      service.updateUserData(callback);

      expect(authServiceSpy.GET_allRolesByUser).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should process initiatives on success and call callback', () => {
      const callback = jest.fn();
      const mockInitiatives: MockMyInitiativeRow[] = [
        { initiative_id: 10, official_code: 'INIT-10', short_name: 'Init Ten' },
        { initiative_id: 20, official_code: 'INIT-20', short_name: 'Init Twenty' }
      ];
      const mockRoles = {
        response: {
          application: { role_id: 1 },
          initiative: [
            { initiative_id: 10, description: 'Lead' },
            { initiative_id: 20, description: 'Member' }
          ]
        }
      };
      const mockReporting = [
        { initiative_id: 20 },
        { initiative_id: 10 }
      ];
      const mockIpsr = [
        { initiative_id: 30 },
        { initiative_id: 5 }
      ];

      authServiceSpy.GET_allRolesByUser.mockReturnValue(of(mockRoles));
      authServiceSpy.GET_initiativesByUser.mockReturnValue(of({ response: mockInitiatives }));
      authServiceSpy.GET_initiativesByUserByPortfolio.mockReturnValue(
        of({ response: { reporting: mockReporting, ipsr: mockIpsr } })
      );

      service.updateUserData(callback);

      expect(rolesServiceSpy.applyRolesResponse).toHaveBeenCalledWith(mockRoles.response);
      expect(rolesServiceSpy.roles).toEqual(mockRoles.response);
      expect(rolesServiceSpy.isAdmin).toBe(true);
      expect(dataControlServiceSpy.myInitiativesList).toEqual(mockInitiatives);
      expect(dataControlServiceSpy.myInitiativesLoaded).toBe(true);
      expect(mockInitiatives[0].role).toBe('Lead');
      expect(mockInitiatives[0].name).toBe('INIT-10');
      expect(mockInitiatives[0].official_code_short_name).toBe('INIT-10 Init Ten');
      expect(mockInitiatives[1].role).toBe('Member');
      expect(resultsListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalledWith(mockInitiatives);
      // IPF-T-1: the IPSR filter reads the Science-Program-scoped list
      // (`myInitiativesListIPSRByPortfolio`, sorted by initiative_id ascending), not the flat
      // `myInitiativesList` that `resultsListFilterSE` above still reads.
      expect(ipsrListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalledWith(
        [...mockIpsr].sort((a, b) => a.initiative_id - b.initiative_id)
      );
      expect(callback).toHaveBeenCalled();
    });

    // IPF-T-1 (docs/specs/bugfix/ipsr-initiative-filter-removal): regression test for the
    // Innovation Packages filter incorrectly showing legacy Initiatives instead of only
    // Science Programs. `GET_initiativesByUser()` returns the flat, mixed INI-*/SP-* list
    // (`myInitiativesList`); `GET_initiativesByUserByPortfolio().ipsr` returns the
    // Science-Program-scoped split (`myInitiativesListIPSRByPortfolio`). The IPSR filter
    // MUST be wired to the scoped list, never the flat one — the Results module filter
    // (`resultsListFilterSE`) MUST stay wired to the flat list (IPF-R-10).
    describe('IPF-T-1: IPSR filter repointed to Science-Program-scoped list', () => {
      const mixedInitiatives: MockMyInitiativeRow[] = [
        { initiative_id: 1, official_code: 'INI-1', short_name: 'Legacy Initiative One' },
        { initiative_id: 2, official_code: 'SP-1', short_name: 'Science Program One' },
        { initiative_id: 3, official_code: 'INI-2', short_name: 'Legacy Initiative Two' }
      ];
      const scopedIpsr = [
        { initiative_id: 2, official_code: 'SP-1', short_name: 'Science Program One' }
      ];

      it('success branch: calls ipsrListFilterService.updateMyInitiatives with the SP-scoped array, not the flat list', () => {
        const callback = jest.fn();

        authServiceSpy.GET_allRolesByUser.mockReturnValue(of({ response: { initiative: [] } }));
        authServiceSpy.GET_initiativesByUser.mockReturnValue(of({ response: mixedInitiatives }));
        authServiceSpy.GET_initiativesByUserByPortfolio.mockReturnValue(
          of({ response: { reporting: [], ipsr: scopedIpsr } })
        );

        service.updateUserData(callback);

        // The flat, mixed list is still what Results reads from — untouched (IPF-R-10).
        expect(resultsListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalledWith(mixedInitiatives);
        // The IPSR filter must receive only the SP-scoped array.
        expect(ipsrListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalledWith(scopedIpsr);
        expect(ipsrListFilterServiceSpy.updateMyInitiatives).not.toHaveBeenCalledWith(mixedInitiatives);
        expect(callback).toHaveBeenCalled();
      });

      // The `error:` callback of `forkJoin(...).subscribe({ next, error })` is, in the current
      // implementation, unreachable dead code — verified empirically, not assumed:
      //  1. Each of the three source observables (`GET_allRolesByUser`, `GET_initiativesByUser`,
      //     `GET_initiativesByUserByPortfolio`) is individually wrapped in its own `catchError`
      //     that swallows any error and resolves with a fallback value, so no combination of
      //     mocked GET_* responses can make the outer `forkJoin` itself error — confirmed by the
      //     pre-existing "should handle error path in forkJoin subscribe" test above, which
      //     mocks ALL THREE to `throwError(...)` and still asserts `callback` WAS called, i.e.
      //     it exercises `next`, not `error`, despite its name.
      //  2. A synchronous throw inside the `next` handler itself does NOT route to `error` in
      //     RxJS 7 (unlike RxJS <6) — it is re-thrown via `reportUnhandledError` instead. Verified
      //     with a minimal standalone repro: `forkJoin([of(1), of(2)]).subscribe({ next: () => {
      //     throw new Error('boom') }, error: (e) => console.log('called') })` never logs
      //     'called'; the error surfaces as an uncaught exception instead.
      // Given both paths are closed, this task applies the same one-line fix to the `error`
      // branch for parity/defensive-correctness (per design.md §6.2). **Correction (`IPF-T-1`
      // rework, Reviewer FAIL):** this comment previously claimed no behavioral test could ever
      // exercise the `undefined`-spread hazard because the `error` branch is unreachable — that
      // reasoning only covered the `error` branch. It missed that the `next` branch's own
      // assignment (`GET_initiativesByUserByPortfolio?.response?.ipsr?.sort(...)`) is reachable
      // and evaluates to `undefined` whenever a 200 response omits the `ipsr` key (or returns it
      // `null`), which then flowed into `ipsrListFilterService.updateMyInitiatives(undefined)`
      // and threw inside its unguarded `[...header, ...initiatives]` spread — a real, reachable
      // `TypeError` that killed `callback()` and the whole session bootstrap. Fixed at the
      // assignment site in `api.service.ts` (`?? []`) and covered by the test below, which is RED
      // against the pre-fix code and GREEN after it.
    });

    it('success branch: normalizes a missing `ipsr` key to [] so updateMyInitiatives never receives undefined', () => {
      const callback = jest.fn();

      authServiceSpy.GET_allRolesByUser.mockReturnValue(of({ response: { initiative: [] } }));
      authServiceSpy.GET_initiativesByUser.mockReturnValue(of({ response: [] }));
      // 200 response missing the `ipsr` key entirely (IPF-OQ-1 case).
      authServiceSpy.GET_initiativesByUserByPortfolio.mockReturnValue(of({ response: { reporting: [] } }));

      expect(() => service.updateUserData(callback)).not.toThrow();

      expect(ipsrListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalledWith([]);
      expect(callback).toHaveBeenCalled();
    });

    // Screenshot-confirmed defect (IPF-T-1 rework, attempt 3): on /ipsr/list/innovation-list the
    // "Submitter(s)" filter chips rendered as blank pills because the enrichment loop below (which
    // sets `.name`/`.official_code_short_name`/`.role`) ran only over `myInitiativesList`, never over
    // `myInitiativesListIPSRByPortfolio` — the array IPF-T-1 repointed the IPSR filter to. The chip
    // template reads `{{option.name}}`, so every IPSR chip rendered undefined. This asserts the
    // array actually passed to `ipsrListFilterService.updateMyInitiatives(...)` carries a populated,
    // non-empty `.name` (and `.official_code_short_name`) on every item — not just array identity —
    // which is the evidence that closes the real rendering bug.
    it('enriches the IPSR-scoped array with .name/.official_code_short_name/.role before handing it to ipsrListFilterService (real server shape: no .name/.official_code_short_name on the raw ipsr rows)', () => {
      const callback = jest.fn();

      const rawIpsrRows: MockMyInitiativeRow[] = [
        { initiative_id: 2, official_code: 'SP-1', short_name: 'Science Program One' },
        { initiative_id: 5, official_code: 'SP-2', short_name: 'Science Program Two' }
      ];

      authServiceSpy.GET_allRolesByUser.mockReturnValue(
        of({
          response: {
            initiative: [
              { initiative_id: 2, description: 'Lead' },
              { initiative_id: 5, description: 'Member' }
            ]
          }
        })
      );
      authServiceSpy.GET_initiativesByUser.mockReturnValue(of({ response: [] }));
      authServiceSpy.GET_initiativesByUserByPortfolio.mockReturnValue(
        of({ response: { reporting: [], ipsr: rawIpsrRows } })
      );

      service.updateUserData(callback);

      const passedArray = ipsrListFilterServiceSpy.updateMyInitiatives.mock.calls[0][0] as MockMyInitiativeRow[];

      expect(passedArray.length).toBe(2);
      passedArray.forEach(item => {
        expect(item.name).toBeTruthy();
        expect(item.official_code_short_name).toBeTruthy();
      });

      const sp1 = passedArray.find(i => i.initiative_id === 2);
      const sp2 = passedArray.find(i => i.initiative_id === 5);
      expect(sp1?.name).toBe('SP-1');
      expect(sp1?.official_code_short_name).toBe('SP-1 Science Program One');
      expect(sp1?.role).toBe('Lead');
      expect(sp2?.name).toBe('SP-2');
      expect(sp2?.official_code_short_name).toBe('SP-2 Science Program Two');
      expect(sp2?.role).toBe('Member');

      expect(callback).toHaveBeenCalled();
    });

    it('should handle initiatives with no matching role', () => {
      const callback = jest.fn();
      const mockInitiatives: MockMyInitiativeRow[] = [
        { initiative_id: 99, official_code: 'INIT-99', short_name: 'No Match' }
      ];

      authServiceSpy.GET_allRolesByUser.mockReturnValue(of({ response: { initiative: [] } }));
      authServiceSpy.GET_initiativesByUser.mockReturnValue(of({ response: mockInitiatives }));
      authServiceSpy.GET_initiativesByUserByPortfolio.mockReturnValue(of({ response: { reporting: [], ipsr: [] } }));

      service.updateUserData(callback);

      expect(mockInitiatives[0].role).toBeUndefined();
      expect(callback).toHaveBeenCalled();
    });

    it('should still call callback when roles API fails', () => {
      const callback = jest.fn();
      authServiceSpy.GET_allRolesByUser.mockReturnValue(throwError(() => new Error('roles API error')));
      authServiceSpy.GET_initiativesByUser.mockReturnValue(of({ response: [] }));
      authServiceSpy.GET_initiativesByUserByPortfolio.mockReturnValue(of({ response: { reporting: [], ipsr: [] } }));

      service.updateUserData(callback);

      expect(callback).toHaveBeenCalled();
      expect(rolesServiceSpy.applyRolesResponse).toHaveBeenCalledWith(undefined);
    });

    it('should handle error path in forkJoin subscribe', () => {
      const callback = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      authServiceSpy.GET_allRolesByUser.mockReturnValue(throwError(() => new Error('API error')));
      authServiceSpy.GET_initiativesByUser.mockReturnValue(throwError(() => new Error('API error')));
      authServiceSpy.GET_initiativesByUserByPortfolio.mockReturnValue(throwError(() => new Error('API error')));

      service.updateUserData(callback);

      expect(dataControlServiceSpy.myInitiativesLoaded).toBe(true);
      expect(resultsListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalled();
      expect(ipsrListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('GETInnovationPackageDetail', () => {
    it('should set inIpsr and currentResultSignal to null before subscribing', () => {
      service.GETInnovationPackageDetail();

      expect(fieldsManagerServiceSpy.inIpsr.set).toHaveBeenCalledWith(true);
      expect(dataControlServiceSpy.currentResultSignal.set).toHaveBeenCalledWith(null);
    });

    it('should set readOnly based on isAdmin when is_phase_open is 0 and user is not admin', () => {
      rolesServiceSpy.isAdmin = false;
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 0,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(rolesServiceSpy.readOnly).toBe(true);
    });

    it('should set readOnly to false when is_phase_open is 0 and user is admin', () => {
      rolesServiceSpy.isAdmin = true;
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 0,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(rolesServiceSpy.readOnly).toBe(false);
    });

    it('should set readOnly true when is_phase_open is 1, status_id is not "1", and user is not admin', () => {
      rolesServiceSpy.isAdmin = false;
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 1,
            status_id: '2',
            is_discontinued: false,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(rolesServiceSpy.readOnly).toBe(true);
    });

    it('should not set readOnly true when is_phase_open is 1 and status_id is "1"', () => {
      rolesServiceSpy.isAdmin = false;
      rolesServiceSpy.readOnly = false;
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 1,
            status_id: '1',
            is_discontinued: false,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(rolesServiceSpy.readOnly).toBe(false);
    });

    it('should not set readOnly true when is_phase_open is 1 and user is admin even if status_id is not "1"', () => {
      rolesServiceSpy.isAdmin = true;
      rolesServiceSpy.readOnly = false;
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 1,
            status_id: '2',
            is_discontinued: false,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(rolesServiceSpy.readOnly).toBe(false);
    });

    it('should set readOnly to is_discontinued when is_phase_open is 1 and is_discontinued is truthy (non innovation dev/use)', () => {
      rolesServiceSpy.isAdmin = false;
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 1,
            status_id: '1',
            result_type_id: 5,
            is_discontinued: true,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(rolesServiceSpy.readOnly).toBe(true);
    });

    it('should not force readOnly from is_discontinued for innovation development or innovation use (types 7 and 2)', () => {
      rolesServiceSpy.isAdmin = false;
      rolesServiceSpy.readOnly = false;
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 1,
            status_id: '1',
            result_type_id: 2,
            is_discontinued: true,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(rolesServiceSpy.readOnly).toBe(false);
    });

    it('should not change readOnly when is_phase_open is 1 and is_discontinued is falsy', () => {
      rolesServiceSpy.isAdmin = false;
      rolesServiceSpy.readOnly = false;
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 1,
            status_id: '1',
            is_discontinued: false,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(rolesServiceSpy.readOnly).toBe(false);
    });

    it('should not enter any switch case when is_phase_open is neither 0 nor 1', () => {
      rolesServiceSpy.readOnly = false;
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 2,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(rolesServiceSpy.readOnly).toBe(false);
    });

    it('should call onDetailLoaded callback when provided', () => {
      const onDetailLoaded = jest.fn();
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 2,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail(onDetailLoaded);

      expect(onDetailLoaded).toHaveBeenCalled();
    });

    it('should not throw when onDetailLoaded is undefined', () => {
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 2,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      expect(() => service.GETInnovationPackageDetail()).not.toThrow();
    });

    it('should set ipsrDataControlSE properties from response', () => {
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 2,
            inititiative_id: 42,
            initiative_official_code: 'INIT-42',
            version_id: 'v3'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(ipsrDataControlServiceSpy.initiative_id).toBe(42);
      expect(ipsrDataControlServiceSpy.resultInnovationPhase).toBe('v3');
    });
  });

  describe('clearAll', () => {
    it('should reset myInitiativesList to empty array', () => {
      service.dataControlSE.myInitiativesList = [{ id: 1 }] as any;
      service.clearAll();
      expect(service.dataControlSE.myInitiativesList.length).toBe(0);
    });
  });

  describe('updateResultsList', () => {
    it('should set showLoadingResultSpinner to true then false on success', () => {
      resultsApiServiceSpy.GET_AllResultsWithUseRole.mockReturnValue(
        of({ response: { items: [] } })
      );

      service.updateResultsList();

      expect(resultsApiServiceSpy.GET_AllResultsWithUseRole).toHaveBeenCalledWith(1, undefined);
      expect(resultsListServiceSpy.showLoadingResultSpinner).toBe(false);
      expect(dataControlServiceSpy.resultsListNoDataMessage.set).toHaveBeenCalledWith(null);
    });

    it('should set full_status_name_html with in-qa-tag when inQA is truthy', () => {
      const items: MockResultsListItem[] = [
        { status_name: 'Submitted', inQA: true }
      ];
      resultsApiServiceSpy.GET_AllResultsWithUseRole.mockReturnValue(
        of({ response: { items } })
      );

      service.updateResultsList();

      expect(items[0].full_status_name_html).toContain('in-qa-tag');
      expect(items[0].full_status_name_html).toContain('In QA');
    });

    it('should set full_status_name_html without in-qa-tag when inQA is falsy', () => {
      const items: MockResultsListItem[] = [
        { status_name: 'Draft', inQA: false }
      ];
      resultsApiServiceSpy.GET_AllResultsWithUseRole.mockReturnValue(
        of({ response: { items } })
      );

      service.updateResultsList();

      expect(items[0].full_status_name_html).not.toContain('in-qa-tag');
    });

    it('should handle error and set showLoadingResultSpinner to false', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      resultsApiServiceSpy.GET_AllResultsWithUseRole.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      service.updateResultsList();

      expect(resultsListServiceSpy.showLoadingResultSpinner).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should clear list and set no-data message on 404', () => {
      resultsApiServiceSpy.GET_AllResultsWithUseRole.mockReturnValue(
        throwError(() => ({ status: 404 }))
      );

      service.updateResultsList();

      expect(resultsListServiceSpy.showLoadingResultSpinner).toBe(false);
      expect(service.dataControlSE.resultsList).toEqual([]);
      expect(dataControlServiceSpy.resultsListSignal.set).toHaveBeenCalledWith([]);
      expect(dataControlServiceSpy.resultsListNoDataMessage.set).toHaveBeenCalledWith(
        expect.stringContaining('No results match')
      );
    });

    it('should pass searchParams to GET_AllResultsWithUseRole', () => {
      const params = { limit: 10, page: 1, status_id: '2' };
      resultsApiServiceSpy.GET_AllResultsWithUseRole.mockReturnValue(
        of({ response: { items: [] } })
      );

      service.updateResultsList(params);

      expect(resultsApiServiceSpy.GET_AllResultsWithUseRole).toHaveBeenCalledWith(1, params);
    });
  });

  describe('setTWKAttributes', () => {
    it('should set Tawk_API attributes and handlers', () => {
      service.setTWKAttributes();

      expect(globalThis['Tawk_API']).toBeDefined();
      expect(globalThis['Tawk_LoadStart']).toBeDefined();
      expect(typeof globalThis['Tawk_API'].onLoad).toBe('function');
      expect(typeof globalThis['Tawk_API'].onChatEnded).toBe('function');
    });

    it('should call setAttributes with user data when onLoad fires', () => {
      service.setTWKAttributes();

      const mockSetAttributes = jest.fn();
      globalThis['Tawk_API'].setAttributes = mockSetAttributes;

      globalThis['Tawk_API'].onLoad();

      expect(mockSetAttributes).toHaveBeenCalledWith(
        { name: 'Test User', email: 'test@example.com' },
        expect.any(Function)
      );
    });

    it('should call hideWidget and minimize when onChatEnded fires', () => {
      service.setTWKAttributes();

      globalThis['Tawk_API'].hideWidget = jest.fn();
      globalThis['Tawk_API'].minimize = jest.fn();

      globalThis['Tawk_API'].onChatEnded();

      expect(globalThis['Tawk_API'].hideWidget).toHaveBeenCalled();
      expect(globalThis['Tawk_API'].minimize).toHaveBeenCalled();
    });

    it('should catch and log errors in setTWKAttributes', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      Object.defineProperty(globalThis, 'Tawk_API', {
        get() {
          throw new Error('Tawk not available');
        },
        configurable: true
      });

      service.setTWKAttributes();

      expect(consoleSpy).toHaveBeenCalled();

      Object.defineProperty(globalThis, 'Tawk_API', {
        value: undefined,
        writable: true,
        configurable: true
      });

      consoleSpy.mockRestore();
    });

    it('should log error in setAttributes error callback', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      service.setTWKAttributes();

      const setAttributesMock = jest.fn((attrs, errorCallback) => {
        errorCallback('attribute error');
      });
      globalThis['Tawk_API'].setAttributes = setAttributesMock;

      globalThis['Tawk_API'].onLoad();

      expect(consoleSpy).toHaveBeenCalledWith('attribute error');

      consoleSpy.mockRestore();
    });
  });

  describe('setTitle', () => {
    it('should call titleService.setTitle with given title', () => {
      service.setTitle('Test Title');
      expect(titleServiceSpy.setTitle).toHaveBeenCalledWith('Test Title');
    });
  });

  // P2-3229. Deliberately not `shouldShowUpdate`: bilaterals answer to the lead CENTRE, not to
  // the initiative map, and they also require the result to be approved.
  describe('canUpdateBilateral', () => {
    const currentPhase = { phaseYear: 2024 };
    const approvedBilateral = (overrides: any = {}): any => ({
      phase_year: 2023,
      status_name: 'Approved',
      lead_center: 'CIAT (Alliance)',
      ...overrides
    });

    beforeEach(() => {
      rolesServiceSpy.isAdmin = false;
      rolesServiceSpy.getMyCenters = jest.fn(() => [{ center_id: 'CENTER-03', center_acronym: 'CIAT (Alliance)' }]);
    });

    it('allows a user of the lead centre on an approved past-phase result', () => {
      expect(service.canUpdateBilateral(approvedBilateral(), currentPhase)).toBe(true);
    });

    it('refuses a user who belongs to another centre', () => {
      rolesServiceSpy.getMyCenters = jest.fn(() => [{ center_id: 'CENTER-11', center_acronym: 'IITA' }]);
      expect(service.canUpdateBilateral(approvedBilateral(), currentPhase)).toBe(false);
    });

    it.each(['Editing', 'Submitted', 'Pending Review', 'Rejected'])('refuses a result that is %s', status => {
      expect(service.canUpdateBilateral(approvedBilateral({ status_name: status }), currentPhase)).toBe(false);
    });

    it('refuses a result already in the current phase', () => {
      expect(service.canUpdateBilateral(approvedBilateral({ phase_year: 2024 }), currentPhase)).toBe(false);
    });

    it('refuses when the result has no lead centre', () => {
      expect(service.canUpdateBilateral(approvedBilateral({ lead_center: null }), currentPhase)).toBe(false);
    });

    it('allows an admin regardless of centre membership', () => {
      rolesServiceSpy.isAdmin = true;
      rolesServiceSpy.getMyCenters = jest.fn(() => []);
      expect(service.canUpdateBilateral(approvedBilateral(), currentPhase)).toBe(true);
    });

    // The list reports `lead_center` as the CLARISA ACRONYM. Comparing it against `center_id`,
    // which is the code, matches nothing — the action would never appear and nothing would say why.
    it('matches on the centre acronym, not on the centre code', () => {
      rolesServiceSpy.getMyCenters = jest.fn(() => [{ center_id: 'CENTER-03', center_acronym: 'CIAT (Alliance)' }]);
      expect(service.canUpdateBilateral(approvedBilateral({ lead_center: 'CENTER-03' }), currentPhase)).toBe(false);
      expect(service.canUpdateBilateral(approvedBilateral({ lead_center: 'CIAT (Alliance)' }), currentPhase)).toBe(true);
    });
  });

  describe('shouldShowUpdate', () => {
    const currentPhase = { phaseYear: 2024 };

    it('should return true when admin, has initiatives, and is past phase', () => {
      rolesServiceSpy.isAdmin = true;
      const result: CurrentResult = {
        initiative_entity_map: [{ entityId: 1 }],
        phase_year: 2023
      };

      expect(service.shouldShowUpdate(result, currentPhase)).toBe(true);
    });

    it('should return false when admin, has no initiatives, even if past phase', () => {
      rolesServiceSpy.isAdmin = true;
      const result: CurrentResult = {
        initiative_entity_map: [],
        phase_year: 2023
      };

      expect(service.shouldShowUpdate(result, currentPhase)).toBe(false);
    });

    it('should return false when admin, has initiatives, but not past phase', () => {
      rolesServiceSpy.isAdmin = true;
      const result: CurrentResult = {
        initiative_entity_map: [{ entityId: 1 }],
        phase_year: 2024
      };

      expect(service.shouldShowUpdate(result, currentPhase)).toBe(false);
    });

    it('should return true when non-admin, user is in initiative, and is past phase', () => {
      rolesServiceSpy.isAdmin = false;
      const result: CurrentResult = {
        initiative_entity_map: [{ entityId: 10 }],
        initiative_entity_user: [{ initiative_id: 10 }],
        phase_year: 2023
      };

      expect(service.shouldShowUpdate(result, currentPhase)).toBe(true);
    });

    it('should return false when non-admin, user is NOT in any initiative', () => {
      rolesServiceSpy.isAdmin = false;
      const result: CurrentResult = {
        initiative_entity_map: [{ entityId: 10 }],
        initiative_entity_user: [{ initiative_id: 99 }],
        phase_year: 2023
      };

      expect(service.shouldShowUpdate(result, currentPhase)).toBe(false);
    });

    it('should return false when non-admin and not past phase', () => {
      rolesServiceSpy.isAdmin = false;
      const result: CurrentResult = {
        initiative_entity_map: [{ entityId: 10 }],
        initiative_entity_user: [{ initiative_id: 10 }],
        phase_year: 2025
      };

      expect(service.shouldShowUpdate(result, currentPhase)).toBe(false);
    });

    it('should handle result with initiative_entity_map as non-array', () => {
      rolesServiceSpy.isAdmin = true;
      const result: CurrentResult = {
        initiative_entity_map: null,
        phase_year: 2023
      };

      expect(service.shouldShowUpdate(result, currentPhase)).toBe(false);
    });

    it('should handle undefined initiative_entity_map', () => {
      rolesServiceSpy.isAdmin = true;
      const result: CurrentResult = {
        phase_year: 2023
      };

      expect(service.shouldShowUpdate(result, currentPhase)).toBe(false);
    });
  });

  describe('isPastReportingPhase', () => {
    it('should return true when phase_year is less than currentPhase.phaseYear', () => {
      const result: CurrentResult = { phase_year: 2022 };
      expect(service.isPastReportingPhase(result, { phaseYear: 2024 })).toBe(true);
    });

    it('should return false when phase_year equals currentPhase.phaseYear', () => {
      const result: CurrentResult = { phase_year: 2024 };
      expect(service.isPastReportingPhase(result, { phaseYear: 2024 })).toBe(false);
    });

    it('should return false when phase_year is greater than currentPhase.phaseYear', () => {
      const result: CurrentResult = { phase_year: 2025 };
      expect(service.isPastReportingPhase(result, { phaseYear: 2024 })).toBe(false);
    });

    it('should return false when phase_year is not a number', () => {
      const result: CurrentResult = { phase_year: undefined };
      expect(service.isPastReportingPhase(result, { phaseYear: 2024 })).toBe(false);
    });

    it('should return false when phaseYear is not a number', () => {
      const result: CurrentResult = { phase_year: 2022 };
      expect(service.isPastReportingPhase(result, { phaseYear: undefined as any })).toBe(false);
    });

    it('should return false when result is null', () => {
      expect(service.isPastReportingPhase(null as any, { phaseYear: 2024 })).toBe(false);
    });

    it('should return false when currentPhase is null', () => {
      const result: CurrentResult = { phase_year: 2022 };
      expect(service.isPastReportingPhase(result, null as any)).toBe(false);
    });
  });

  describe('isUserIncludedInAnyInitiative', () => {
    it('should return true when user initiative_id matches an entityId in the map', () => {
      const result: CurrentResult = {
        initiative_entity_map: [{ entityId: 10 }, { entityId: 20 }],
        initiative_entity_user: [{ initiative_id: 20 }]
      };

      expect(service.isUserIncludedInAnyInitiative(result)).toBe(true);
    });

    it('should return false when no matching ids exist', () => {
      const result: CurrentResult = {
        initiative_entity_map: [{ entityId: 10 }],
        initiative_entity_user: [{ initiative_id: 99 }]
      };

      expect(service.isUserIncludedInAnyInitiative(result)).toBe(false);
    });

    it('should return false when both arrays are empty', () => {
      const result: CurrentResult = {
        initiative_entity_map: [],
        initiative_entity_user: []
      };

      expect(service.isUserIncludedInAnyInitiative(result)).toBe(false);
    });

    it('should return false when initiative_entity_map is not an array', () => {
      const result: CurrentResult = {
        initiative_entity_map: 'not-array',
        initiative_entity_user: [{ initiative_id: 10 }]
      };

      expect(service.isUserIncludedInAnyInitiative(result)).toBe(false);
    });
  });

  describe('getInitiativeIdsFromMap', () => {
    it('should extract entityIds from initiative_entity_map array', () => {
      const result: CurrentResult = {
        initiative_entity_map: [{ entityId: 1 }, { entityId: 2 }, { entityId: 3 }]
      };

      expect(service.getInitiativeIdsFromMap(result)).toEqual([1, 2, 3]);
    });

    it('should return empty array when initiative_entity_map is not an array', () => {
      const result: CurrentResult = { initiative_entity_map: 'invalid' };
      expect(service.getInitiativeIdsFromMap(result)).toEqual([]);
    });

    it('should return empty array when initiative_entity_map is undefined', () => {
      const result: CurrentResult = {};
      expect(service.getInitiativeIdsFromMap(result)).toEqual([]);
    });

    it('should filter out null and undefined entityIds', () => {
      const result: CurrentResult = {
        initiative_entity_map: [{ entityId: 1 }, { entityId: null }, { entityId: undefined }, { entityId: 3 }]
      };

      expect(service.getInitiativeIdsFromMap(result)).toEqual([1, 3]);
    });

    it('should handle items without entityId property', () => {
      const result: CurrentResult = {
        initiative_entity_map: [{ other: 'value' }, { entityId: 5 }]
      };

      expect(service.getInitiativeIdsFromMap(result)).toEqual([5]);
    });
  });

  describe('getUserInitiativeIds', () => {
    it('should extract initiative_ids from initiative_entity_user array', () => {
      const result: CurrentResult = {
        initiative_entity_user: [{ initiative_id: 10 }, { initiative_id: 20 }]
      };

      expect(service.getUserInitiativeIds(result)).toEqual([10, 20]);
    });

    it('should return empty array when initiative_entity_user is not an array', () => {
      const result: CurrentResult = { initiative_entity_user: null };
      expect(service.getUserInitiativeIds(result)).toEqual([]);
    });

    it('should return empty array when initiative_entity_user is undefined', () => {
      const result: CurrentResult = {};
      expect(service.getUserInitiativeIds(result)).toEqual([]);
    });

    it('should filter out null and undefined initiative_ids', () => {
      const result: CurrentResult = {
        initiative_entity_user: [{ initiative_id: 10 }, { initiative_id: null }, { initiative_id: undefined }, { initiative_id: 30 }]
      };

      expect(service.getUserInitiativeIds(result)).toEqual([10, 30]);
    });

    it('should handle items without initiative_id property', () => {
      const result: CurrentResult = {
        initiative_entity_user: [{ other: 'value' }, { initiative_id: 15 }]
      };

      expect(service.getUserInitiativeIds(result)).toEqual([15]);
    });
  });
});
