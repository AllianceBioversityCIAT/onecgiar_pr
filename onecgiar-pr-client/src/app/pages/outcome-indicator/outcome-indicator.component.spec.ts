import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OutcomeIndicatorComponent } from './outcome-indicator.component';
import { RouterTestingModule } from '@angular/router/testing';
import { CustomFieldsModule } from '../../custom-fields/custom-fields.module';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('OutcomeIndicatorComponent', () => {
  let component: OutcomeIndicatorComponent;
  let fixture: ComponentFixture<OutcomeIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OutcomeIndicatorComponent],
      imports: [RouterTestingModule, CustomFieldsModule, HttpClientTestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OutcomeIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize component for admin user', async () => {
    component.api.rolesSE.isAdmin = true;
    jest.spyOn(component, 'loadAllInitiatives');
    jest.spyOn(component.api.dataControlSE, 'getCurrentPhases');

    await component.initializeComponent();

    expect(component.api.dataControlSE.getCurrentPhases).toHaveBeenCalled();
    expect(component.loadAllInitiatives).toHaveBeenCalled();
  });

  it('should initialize component for non-admin user', async () => {
    component.api.rolesSE.isAdmin = false;
    jest.spyOn(component.api, 'updateUserData');
    jest.spyOn(component.api.dataControlSE, 'getCurrentPhases');

    await component.initializeComponent();

    expect(component.api.dataControlSE.getCurrentPhases).toHaveBeenCalled();
    expect(component.api.updateUserData).toHaveBeenCalled();
  });

  it('should set default initiative for non-admin user', () => {
    const mockInitiative = { official_code: 'TEST1' };
    component.api.dataControlSE.myInitiativesList = [mockInitiative];
    jest.spyOn(component, 'updateQueryParams');
    jest.spyOn(component.outcomeIService, 'getEOIsData');
    jest.spyOn(component.outcomeIService, 'getWorkPackagesData');

    component.setDefaultInitiativeForNonAdmin();

    expect(component.outcomeIService.initiativeIdFilter).toBe('TEST1');
    expect(component.updateQueryParams).toHaveBeenCalled();
    expect(component.outcomeIService.getEOIsData).toHaveBeenCalled();
    expect(component.outcomeIService.getWorkPackagesData).toHaveBeenCalled();
  });

  it('should set default initiative for non-admin user when query param exists', () => {
    component.api.rolesSE.isAdmin = false;
    component.api.dataControlSE.myInitiativesList = [{ official_code: 'TEST1' }, { official_code: 'TEST2' }];
    component.activatedRoute.snapshot.queryParams = { init: 'TEST2' };
    jest.spyOn(component, 'updateQueryParams');
    jest.spyOn(component.outcomeIService, 'getEOIsData');
    jest.spyOn(component.outcomeIService, 'getWorkPackagesData');

    component.setDefaultInitiativeForNonAdmin();

    expect(component.outcomeIService.initiativeIdFilter).toBe('TEST2');
    expect(component.updateQueryParams).toHaveBeenCalled();
    expect(component.outcomeIService.getEOIsData).toHaveBeenCalled();
    expect(component.outcomeIService.getWorkPackagesData).toHaveBeenCalled();
  });

  it('should load all initiatives', async () => {
    const mockResponse = { response: [{ official_code: 'TEST1' }] };
    jest.spyOn(component.api.resultsSE, 'GET_AllInitiatives').mockReturnValue(of(mockResponse));
    jest.spyOn(component, 'handleInitiativeQueryParam');

    await component.loadAllInitiatives();

    expect(component.allInitiatives).toEqual(mockResponse.response);
    expect(component.handleInitiativeQueryParam).toHaveBeenCalled();
  });

  it('should handle error when loading initiatives', () => {
    jest.spyOn(console, 'error');
    jest.spyOn(component.api.resultsSE, 'GET_AllInitiatives').mockReturnValue(throwError(() => 'Test error'));

    component.loadAllInitiatives();

    expect(console.error).toHaveBeenCalledWith('Error loading initiatives:', 'Test error');
  });

  it('should handle initiative query param when param exists', () => {
    const mockQueryParams = { init: 'test1' };
    component.activatedRoute.snapshot.queryParams = mockQueryParams;
    jest.spyOn(component.outcomeIService, 'getEOIsData');
    jest.spyOn(component.outcomeIService, 'getWorkPackagesData');

    component.handleInitiativeQueryParam();

    expect(component.outcomeIService.initiativeIdFilter).toBe('TEST1');
    expect(component.outcomeIService.getEOIsData).toHaveBeenCalled();
    expect(component.outcomeIService.getWorkPackagesData).toHaveBeenCalled();
  });

  it('should update query params', () => {
    component.outcomeIService.initiativeIdFilter = 'TEST1';
    jest.spyOn(component.router, 'navigate');

    component.updateQueryParams();

    expect(component.router.navigate).toHaveBeenCalledWith([], {
      relativeTo: component.activatedRoute,
      queryParams: { init: 'TEST1' },
      queryParamsHandling: 'merge'
    });
  });

  it('should handle initiative change', () => {
    jest.spyOn(component, 'updateQueryParams');
    jest.spyOn(component.outcomeIService, 'getEOIsData');
    jest.spyOn(component.outcomeIService, 'getWorkPackagesData');
    jest.spyOn(component.outcomeIService.searchText, 'set');

    component.handleInitiativeChange();

    expect(component.updateQueryParams).toHaveBeenCalled();
    expect(component.outcomeIService.getEOIsData).toHaveBeenCalled();
    expect(component.outcomeIService.getWorkPackagesData).toHaveBeenCalled();
    expect(component.outcomeIService.searchText.set).toHaveBeenCalledWith('');
  });

  it('should update query params when not in indicator details route', () => {
    component.outcomeIService.initiativeIdFilter = 'TEST1';
    jest.spyOn(component.router, 'navigate');
    jest.spyOn(component.router, 'url', 'get').mockReturnValue('/outcome-indicator-module');

    component.updateQueryParams();

    expect(component.router.navigate).toHaveBeenCalledWith([], {
      relativeTo: component.activatedRoute,
      queryParams: { init: 'TEST1' },
      queryParamsHandling: 'merge'
    });
  });

  it('should not update query params when in indicator details route', () => {
    component.outcomeIService.initiativeIdFilter = 'TEST1';
    jest.spyOn(component.router, 'navigate');
    jest.spyOn(component.router, 'url', 'get').mockReturnValue('/outcome-indicator-module/indicator-details');

    component.updateQueryParams();

    expect(component.router.navigate).not.toHaveBeenCalled();
  });
});
