import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ResultsApiService } from './results-api.service';
import { DataControlService } from '../data-control.service';
import { RolesService } from '../global/roles.service';
import { Title } from '@angular/platform-browser';
import { FieldsManagerService } from '../fields-manager.service';

describe('ApiService', () => {
  let service: ApiService;
  let authServiceSpy;
  let resultsApiServiceSpy;
  let dataControlServiceSpy;
  let rolesServiceSpy;
  let titleServiceSpy;
  let fieldsManagerServiceSpy;

  beforeEach(() => {
    authServiceSpy = {
      GET_allRolesByUser: jest.fn().mockReturnValue(of({ response: { initiative: [] } })),
      GET_initiativesByUser: jest.fn().mockReturnValue(of({ response: [] })),
      GET_initiativesByUserByPortfolio: jest.fn().mockReturnValue(of({ response: { reporting: [], ipsr: [] } })),
      localStorageUser: { id: 1 }
    };

    resultsApiServiceSpy = {
      GETInnovationPackageDetail: jest.fn().mockReturnValue(of({ response: {} }))
    };

    dataControlServiceSpy = {
      currentResultSignal: {
        set: jest.fn()
      },
      currentResult: null,
      myInitiativesList: [],
      myInitiativesListReportingByPortfolio: [],
      myInitiativesListIPSRByPortfolio: [],
      myInitiativesLoaded: false
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
        { provide: 'ResultsListService', useValue: { showLoadingResultSpinner: false } },
        { provide: 'CustomizedAlertsFsService', useValue: {} },
        { provide: 'QualityAssuranceService', useValue: { $qaFirstInitObserver: { next: jest.fn() } } },
        { provide: 'CustomizedAlertsFeService', useValue: {} },
        { provide: 'ResultsListFilterService', useValue: { updateMyInitiatives: jest.fn() } },
        { provide: 'WordCounterService', useValue: {} },
        { provide: 'TocApiService', useValue: {} },
        { provide: 'IpsrListFilterService', useValue: { updateMyInitiatives: jest.fn() } },
        { provide: 'GlobalVariablesService', useValue: {} },
        { provide: 'IpsrDataControlService', useValue: { initiative_id: null, resultInnovationPhase: null, detailData: null } }
      ]
    });

    service = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call updateUserData', async () => {
    service.updateUserData(() => {
      expect(authServiceSpy.GET_allRolesByUser).toHaveBeenCalled();
      expect(authServiceSpy.GET_initiativesByUser).toHaveBeenCalled();
    });
  });

  it('should call GETInnovationPackageDetail', () => {
    service.GETInnovationPackageDetail();
    expect(resultsApiServiceSpy.GETInnovationPackageDetail).toHaveBeenCalled();
  });

  it('should call clearAll', () => {
    service.clearAll();
    expect(service.dataControlSE.myInitiativesList.length).toBe(0);
  });

  it('should call setTitle', () => {
    service.setTitle('Test Title');
    expect(titleServiceSpy.setTitle).toHaveBeenCalledWith('Test Title');
  });

  // Agrega más pruebas para otros métodos
});
