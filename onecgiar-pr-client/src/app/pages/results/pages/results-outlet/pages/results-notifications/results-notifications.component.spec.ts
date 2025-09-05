import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { of } from 'rxjs';
import { ResultsNotificationsComponent } from './results-notifications.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from './results-notifications.service';
import { StatusPhaseEnum, ModuleTypeEnum } from '../../../../../../shared/enum/api.enum';

describe('ResultsNotificationsComponent', () => {
  let component: ResultsNotificationsComponent;
  let fixture;
  let apiServiceMock: any;
  let shareRequestModalServiceMock: any;
  let resultsNotificationsServiceMock: any;
  let routerMock: any;
  let activatedRouteMock: any;

  beforeEach(async () => {
    apiServiceMock = {
      rolesSE: { isAdmin: true },
      dataControlSE: { myInitiativesList: [], getCurrentPhases: jest.fn(() => of({})) },
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_versioning: jest.fn().mockReturnValue(of({ response: [] }))
      },
      updateUserData: jest.fn(callback => callback())
    };

    shareRequestModalServiceMock = {
      inNotifications: false
    };

    resultsNotificationsServiceMock = {
      get_section_information: jest.fn(),
      get_sent_notifications: jest.fn(),
      resetNotificationInformation: jest.fn(),
      resetFilters: jest.fn(),
      phaseFilter: null,
      initiativeIdFilter: null,
      searchFilter: null
    };

    routerMock = {
      navigate: jest.fn()
    };

    activatedRouteMock = {
      snapshot: {
        queryParams: {}
      }
    };

    await TestBed.configureTestingModule({
      declarations: [ResultsNotificationsComponent],
      imports: [RouterOutlet],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ShareRequestModalService, useValue: shareRequestModalServiceMock },
        { provide: ResultsNotificationsService, useValue: resultsNotificationsServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsNotificationsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct data on ngOnInit', () => {
    activatedRouteMock.snapshot.queryParams['phase'] = 'somePhase';
    activatedRouteMock.snapshot.queryParams['init'] = 'someInit';
    activatedRouteMock.snapshot.queryParams['search'] = 'someSearch';

    component.ngOnInit();

    expect(component.phaseList).toEqual([]);
    expect(shareRequestModalServiceMock.inNotifications).toBe(true);
    expect(resultsNotificationsServiceMock.phaseFilter).toBe('somePhase');
    expect(resultsNotificationsServiceMock.initiativeIdFilter).toBe('someInit');
    expect(resultsNotificationsServiceMock.searchFilter).toBe('someSearch');
  });

  it('should update query params', () => {
    component.updateQueryParams();

    expect(routerMock.navigate).toHaveBeenCalledWith([], {
      relativeTo: activatedRouteMock,
      queryParams: {
        init: resultsNotificationsServiceMock.initiativeIdFilter,
        phase: resultsNotificationsServiceMock.phaseFilter,
        search: resultsNotificationsServiceMock.searchFilter
      },
      queryParamsHandling: 'merge'
    });
  });

  it('should call resetFilters if initiativeIdFilter is set', () => {
    resultsNotificationsServiceMock.initiativeIdFilter = 'someInitiative';
    component.clearFilters();
    expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
  });

  it('should call resetFilters if searchFilter is set', () => {
    resultsNotificationsServiceMock.searchFilter = 'someSearch';
    component.clearFilters();
    expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
  });

  it('should not call resetFilters if neither initiativeIdFilter nor searchFilter is set', () => {
    resultsNotificationsServiceMock.initiativeIdFilter = null;
    resultsNotificationsServiceMock.searchFilter = null;
    component.clearFilters();
    expect(resultsNotificationsServiceMock.resetFilters).not.toHaveBeenCalled();
  });

  it('should GET all initiatives if admin', () => {
    component.GET_AllInitiatives();
    expect(apiServiceMock.resultsSE.GET_AllInitiatives).toHaveBeenCalled();
    expect(component.allInitiatives).toEqual([]);
  });

  it('should not GET all initiatives if not admin', () => {
    apiServiceMock.rolesSE.isAdmin = false;
    component.GET_AllInitiatives();
    expect(apiServiceMock.resultsSE.GET_AllInitiatives).not.toHaveBeenCalled();
  });

  it('should get all phases', () => {
    component.getAllPhases();
    expect(apiServiceMock.resultsSE.GET_versioning).toHaveBeenCalledWith(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING);
    expect(component.phaseList).toEqual([]);
  });
});
