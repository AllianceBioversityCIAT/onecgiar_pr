import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ResultsApiService } from './results-api.service';
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
      resultsListSignal: { set: jest.fn() }
    };

    rolesServiceSpy = {
      validateReadOnly: jest.fn(),
      readOnly: false,
      isAdmin: false
    };

    titleServiceSpy = { setTitle: jest.fn() };

    fieldsManagerServiceSpy = {
      inIpsr: {
        set: jest.fn()
      }
    };

    resultsListServiceSpy = { showLoadingResultSpinner: false };

    resultsListFilterServiceSpy = { updateMyInitiatives: jest.fn() };

    ipsrListFilterServiceSpy = { updateMyInitiatives: jest.fn() };

    qaServiceSpy = { $qaFirstInitObserver: { next: jest.fn() } };

    ipsrDataControlServiceSpy = { initiative_id: null, resultInnovationPhase: null, detailData: null };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ResultsApiService, useValue: resultsApiServiceSpy },
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
      const mockInitiatives = [
        { initiative_id: 10, official_code: 'INIT-10', short_name: 'Init Ten' },
        { initiative_id: 20, official_code: 'INIT-20', short_name: 'Init Twenty' }
      ];
      const mockRoles = {
        response: {
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

      expect(dataControlServiceSpy.myInitiativesList).toEqual(mockInitiatives);
      expect(dataControlServiceSpy.myInitiativesLoaded).toBe(true);
      expect(mockInitiatives[0].role).toBe('Lead');
      expect(mockInitiatives[0].name).toBe('INIT-10');
      expect((mockInitiatives[0] as any).official_code_short_name).toBe('INIT-10 Init Ten');
      expect(mockInitiatives[1].role).toBe('Member');
      expect(resultsListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalledWith(mockInitiatives);
      expect(ipsrListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalledWith(mockInitiatives);
      expect(callback).toHaveBeenCalled();
    });

    it('should handle initiatives with no matching role', () => {
      const callback = jest.fn();
      const mockInitiatives = [
        { initiative_id: 99, official_code: 'INIT-99', short_name: 'No Match' }
      ];

      authServiceSpy.GET_allRolesByUser.mockReturnValue(of({ response: { initiative: [] } }));
      authServiceSpy.GET_initiativesByUser.mockReturnValue(of({ response: mockInitiatives }));
      authServiceSpy.GET_initiativesByUserByPortfolio.mockReturnValue(of({ response: { reporting: [], ipsr: [] } }));

      service.updateUserData(callback);

      expect(mockInitiatives[0].role).toBeUndefined();
      expect(callback).toHaveBeenCalled();
    });

    it('should handle error path in forkJoin subscribe', () => {
      const callback = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      authServiceSpy.GET_allRolesByUser.mockReturnValue(throwError(() => new Error('API error')));

      service.updateUserData(callback);

      expect(dataControlServiceSpy.myInitiativesLoaded).toBe(true);
      expect(resultsListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalled();
      expect(ipsrListFilterServiceSpy.updateMyInitiatives).toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
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

    it('should set readOnly to is_discontinued when is_phase_open is 1 and is_discontinued is truthy', () => {
      rolesServiceSpy.isAdmin = false;
      resultsApiServiceSpy.GETInnovationPackageDetail.mockReturnValue(
        of({
          response: {
            is_phase_open: 1,
            status_id: '1',
            is_discontinued: true,
            inititiative_id: 1,
            initiative_official_code: 'INIT-01'
          }
        })
      );

      service.GETInnovationPackageDetail();

      expect(rolesServiceSpy.readOnly).toBe(true);
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

      expect(resultsListServiceSpy.showLoadingResultSpinner).toBe(false);
    });

    it('should set full_status_name_html with in-qa-tag when inQA is truthy', () => {
      const items = [
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
      const items = [
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

      expect(window['Tawk_API']).toBeDefined();
      expect(window['Tawk_LoadStart']).toBeDefined();
      expect(typeof window['Tawk_API'].onLoad).toBe('function');
      expect(typeof window['Tawk_API'].onChatEnded).toBe('function');
    });

    it('should call setAttributes with user data when onLoad fires', () => {
      service.setTWKAttributes();

      const mockSetAttributes = jest.fn();
      window['Tawk_API'].setAttributes = mockSetAttributes;

      window['Tawk_API'].onLoad();

      expect(mockSetAttributes).toHaveBeenCalledWith(
        { name: 'Test User', email: 'test@example.com' },
        expect.any(Function)
      );
    });

    it('should call hideWidget and minimize when onChatEnded fires', () => {
      service.setTWKAttributes();

      window['Tawk_API'].hideWidget = jest.fn();
      window['Tawk_API'].minimize = jest.fn();

      window['Tawk_API'].onChatEnded();

      expect(window['Tawk_API'].hideWidget).toHaveBeenCalled();
      expect(window['Tawk_API'].minimize).toHaveBeenCalled();
    });

    it('should catch and log errors in setTWKAttributes', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      Object.defineProperty(window, 'Tawk_API', {
        get() {
          throw new Error('Tawk not available');
        },
        configurable: true
      });

      service.setTWKAttributes();

      expect(consoleSpy).toHaveBeenCalled();

      Object.defineProperty(window, 'Tawk_API', {
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
      window['Tawk_API'].setAttributes = setAttributesMock;

      window['Tawk_API'].onLoad();

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
