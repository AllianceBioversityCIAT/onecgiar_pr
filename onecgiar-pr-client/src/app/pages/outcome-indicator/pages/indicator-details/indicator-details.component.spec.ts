import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IndicatorDetailsComponent } from './indicator-details.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Location } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../../../../shared/services/api/auth.service';

describe('IndicatorDetailsComponent', () => {
  let component: IndicatorDetailsComponent;
  let fixture: ComponentFixture<IndicatorDetailsComponent>;
  let apiService: ApiService;
  let location: Location;
  let authService: AuthService;
  let activatedRoute: ActivatedRoute;

  beforeEach(async () => {
    const apiServiceMock = {
      resultsSE: {
        GET_contributionsToIndicators_indicator: jest.fn().mockReturnValue(of({})),
        POST_contributionsToIndicators: jest.fn().mockReturnValue(of({})),
        PATCH_contributionsToIndicators: jest.fn().mockReturnValue(of({})),
        POST_contributionsToIndicatorsSubmit: jest.fn().mockReturnValue(of({})),
        GET_contributionsToIndicatorsWPS: jest.fn().mockReturnValue(of({ data: [{ toc_results: ['result1', 'result2'] }] })),
        GET_contributionsToIndicatorsEOIS: jest.fn().mockReturnValue(of({ data: ['result1', 'result2'] }))
      },
      alertsFe: {
        show: jest.fn().mockImplementationOnce((config, callback) => {
          callback();
        })
      },
      dataControlSE: {
        detailSectionTitle: jest.fn()
      }
    };

    const authServiceMock = {
      localStorageUser: {
        id: 1
      }
    };

    const activatedRouteMock = {
      queryParams: of({ indicatorId: '123' })
    };

    const locationMock = {
      back: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [IndicatorDetailsComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Location, useValue: locationMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IndicatorDetailsComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    location = TestBed.inject(Location);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get query params on init', () => {
    component.ngOnInit();
    expect(component.indicatorDetailsService.indicatorId()).toBe('123');
  });

  it('should call getIndicatorData on init', () => {
    jest.spyOn(component, 'getIndicatorData');
    component.ngOnInit();
    expect(component.getIndicatorData).toHaveBeenCalled();
  });

  it('should handle getIndicatorData when indicatorId is not present', () => {
    component.indicatorDetailsService.indicatorId.set('');
    jest.spyOn(component, 'goBack');
    component.getIndicatorData();
    expect(component.goBack).toHaveBeenCalled();
  });

  it('should handle getIndicatorData when indicatorId is present', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    jest.spyOn(apiService.resultsSE, 'GET_contributionsToIndicators_indicator').mockReturnValue(of({}));
    component.getIndicatorData();
    expect(apiService.resultsSE.GET_contributionsToIndicators_indicator).toHaveBeenCalledWith('123');
  });

  it('should handle error in getIndicatorData', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    const error = { message: 'Error' };
    jest.spyOn(apiService.resultsSE, 'GET_contributionsToIndicators_indicator').mockReturnValue(throwError(() => error));
    jest.spyOn(component, 'handleError');
    component.getIndicatorData();
    expect(component.handleError).toHaveBeenCalledWith(error);
  });

  it('should handle successful response in handleGetIndicatorResponse', () => {
    const response = { contributionToIndicator: { someData: 'data' } };
    jest.spyOn(component, 'updateIndicatorData');
    component.handleGetIndicatorResponse(response);
    expect(component.updateIndicatorData).toHaveBeenCalledWith(response);
  });

  it('should update indicator data and set loading to false in updateIndicatorData', () => {
    const response = { contributionToIndicator: { someData: 'data', initiative_official_code: '123' } };
    component.updateIndicatorData(response);
    expect(component.indicatorDetailsService.indicatorData()).toEqual(response.contributionToIndicator);
    expect(component.loading()).toBe(false);
  });

  it('should not call getWorkPackagesData and getEOIsData if initiativeIdFilter is the same', () => {
    const response = { contributionToIndicator: { someData: 'data', initiative_official_code: '123' } };
    component.outcomeIService.initiativeIdFilter = '123';
    jest.spyOn(component.outcomeIService, 'getWorkPackagesData');
    jest.spyOn(component.outcomeIService, 'getEOIsData');
    component.updateIndicatorData(response);
    expect(component.outcomeIService.getWorkPackagesData).not.toHaveBeenCalled();
    expect(component.outcomeIService.getEOIsData).not.toHaveBeenCalled();
  });

  it('should handle 404 response in handleGetIndicatorResponse', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    const response = { status: 404 };
    jest.spyOn(apiService.resultsSE, 'POST_contributionsToIndicators').mockReturnValue(of({}));
    jest.spyOn(component, 'retryGetIndicatorData');
    component.handleGetIndicatorResponse(response);
    expect(apiService.resultsSE.POST_contributionsToIndicators).toHaveBeenCalledWith('123');
    expect(component.retryGetIndicatorData).toHaveBeenCalled();
  });

  it('should handle error in handleGetIndicatorResponse', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    const error = { message: 'Error' };
    jest.spyOn(apiService.resultsSE, 'POST_contributionsToIndicators').mockReturnValue(throwError(() => error));
    jest.spyOn(component, 'handleError');
    component.handleGetIndicatorResponse({ status: 404 });
    expect(component.handleError).toHaveBeenCalledWith(error);
  });

  it('should handle error in retryGetIndicatorData', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    const error = { message: 'Error' };
    jest.spyOn(apiService.resultsSE, 'GET_contributionsToIndicators_indicator').mockReturnValue(throwError(() => error));
    jest.spyOn(component, 'handleError');
    component.retryGetIndicatorData();
    expect(component.handleError).toHaveBeenCalledWith(error);
  });

  it('should update indicator data in updateIndicatorData', () => {
    const response = { contributionToIndicator: { someData: 'data' } };
    component.updateIndicatorData(response);
    expect(component.indicatorDetailsService.indicatorData()).toEqual(response.contributionToIndicator);
    expect(component.loading()).toBe(false);
  });

  it('should go back when goBack is called', () => {
    component.goBack();
    expect(location.back).toHaveBeenCalled();
  });

  it('should handle save indicator data successfully', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    component.indicatorDetailsService.indicatorData.set({ someData: 'data' } as any);
    jest.spyOn(apiService.resultsSE, 'PATCH_contributionsToIndicators').mockReturnValue(of({ someData: 'data' }));
    jest.spyOn(component, 'getIndicatorData');
    jest.spyOn(component.messageService, 'add');

    component.handleSaveIndicatorData();

    expect(component.getIndicatorData).toHaveBeenCalled();
    expect(component.messageService.add).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Success',
      detail: 'Indicator data saved successfully',
      key: 'br'
    });
  });

  it('should handle save indicator data successfully when platformId is eoi', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    component.indicatorDetailsService.indicatorData.set({ someData: 'data' } as any);
    component.indicatorDetailsService.platformId.set('eoi');
    jest.spyOn(apiService.resultsSE, 'PATCH_contributionsToIndicators').mockReturnValue(of({ someData: 'data' }));
    jest.spyOn(component, 'getIndicatorData');
    jest.spyOn(component.outcomeIService, 'getEOIsData');
    jest.spyOn(component.messageService, 'add');

    component.handleSaveIndicatorData();

    expect(component.getIndicatorData).toHaveBeenCalled();
    expect(component.outcomeIService.getEOIsData).toHaveBeenCalled();
  });

  it('should handle save indicator data successfully when platformId is wps', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    component.indicatorDetailsService.indicatorData.set({ someData: 'data' } as any);
    component.indicatorDetailsService.platformId.set('wps');
    jest.spyOn(apiService.resultsSE, 'PATCH_contributionsToIndicators').mockReturnValue(of({ someData: 'data' }));
    jest.spyOn(component, 'getIndicatorData');
    jest.spyOn(component.outcomeIService, 'getWorkPackagesData');
    jest.spyOn(component.messageService, 'add');

    component.handleSaveIndicatorData();

    expect(component.getIndicatorData).toHaveBeenCalled();
    expect(component.outcomeIService.getWorkPackagesData).toHaveBeenCalled();
  });

  it('should handle error when saving indicator data', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    component.indicatorDetailsService.indicatorData.set({ someData: 'data' } as any);
    const error = { message: 'Error' };
    jest.spyOn(apiService.resultsSE, 'PATCH_contributionsToIndicators').mockReturnValue(throwError(() => error));
    jest.spyOn(component, 'handleError');

    component.handleSaveIndicatorData();

    expect(apiService.resultsSE.PATCH_contributionsToIndicators).toHaveBeenCalledWith(component.indicatorDetailsService.indicatorData(), '123');
    expect(component.handleError).toHaveBeenCalledWith(error);
  });

  it('should handle submit indicator successfully', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    component.indicatorDetailsService.indicatorData.set({
      someData: 'data',
      submission_status: '0',
      achieved_in_2024: '10',
      narrative_achieved_in_2024: 'Testing narrative',
      contributing_results: [{ result_id: '1' } as any]
    } as any);
    jest.spyOn(apiService.resultsSE, 'PATCH_contributionsToIndicators').mockReturnValue(of({}));
    jest.spyOn(apiService.resultsSE, 'POST_contributionsToIndicatorsSubmit').mockReturnValue(of({}));
    jest.spyOn(component, 'getIndicatorData');
    jest.spyOn(component.messageService, 'add');

    component.handleSubmitIndicator();

    expect(apiService.resultsSE.PATCH_contributionsToIndicators).toHaveBeenCalled();
    expect(apiService.resultsSE.POST_contributionsToIndicatorsSubmit).toHaveBeenCalledWith('123');
    expect(component.getIndicatorData).toHaveBeenCalled();
    expect(component.messageService.add).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Success',
      detail: 'Indicator submitted successfully',
      key: 'br'
    });
  });

  it('should handle error when submitting indicator', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    component.indicatorDetailsService.indicatorData.set({ someData: 'data' } as any);
    const error = { message: 'Error' };
    jest.spyOn(apiService.resultsSE, 'PATCH_contributionsToIndicators').mockReturnValue(throwError(() => error));
    jest.spyOn(component, 'handleError');

    component.handleSubmitIndicator();

    expect(apiService.resultsSE.PATCH_contributionsToIndicators).toHaveBeenCalledWith(component.indicatorDetailsService.indicatorData(), '123');
    expect(component.handleError).toHaveBeenCalledWith(error);
  });

  it('should return if there indicatorData?.submission_status == 0 and isSubmitDisabled is true', () => {
    component.indicatorDetailsService.indicatorData.set({ submission_status: '0' } as any);
    jest.spyOn(component, 'isSubmitDisabled').mockReturnValue(true);
    component.handleSubmitIndicator();
    expect(apiService.resultsSE.PATCH_contributionsToIndicators).not.toHaveBeenCalled();
  });

  it('should handle unsubmit indicator successfully', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    component.indicatorDetailsService.indicatorData.set({
      someData: 'data',
      submission_status: '0',
      achieved_in_2024: '10',
      narrative_achieved_in_2024: 'Testing narrative',
      contributing_results: [{ result_id: '1' } as any]
    } as any);
    const spyShow = jest.spyOn(apiService.alertsFe, 'show');

    jest.spyOn(apiService.resultsSE, 'POST_contributionsToIndicatorsSubmit').mockReturnValue(of({}));
    jest.spyOn(component, 'getIndicatorData');
    jest.spyOn(component.messageService, 'add');

    component.handleUnsubmitIndicator();

    expect(spyShow).toHaveBeenCalled();
    expect(apiService.resultsSE.POST_contributionsToIndicatorsSubmit).toHaveBeenCalledWith('123');
    expect(component.messageService.add).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Success',
      detail: 'Indicator un-submitted successfully',
      key: 'br'
    });
  });

  it('should handle error when unsubmitting indicator', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    const error = { message: 'Error' };
    const spyShow = jest.spyOn(apiService.alertsFe, 'show');

    jest.spyOn(apiService.resultsSE, 'POST_contributionsToIndicatorsSubmit').mockReturnValue(throwError(() => error));
    jest.spyOn(component, 'handleError');

    component.handleUnsubmitIndicator();

    expect(spyShow).toHaveBeenCalled();
    expect(apiService.resultsSE.POST_contributionsToIndicatorsSubmit).toHaveBeenCalled();
    expect(component.handleError).toHaveBeenCalledWith(error);
  });

  it('should disable submit button when required fields are missing', () => {
    component.indicatorDetailsService.indicatorData.set({
      achieved_in_2024: null,
      narrative_achieved_in_2024: '',
      contributing_results: []
    } as any);

    expect(component.isSubmitDisabled()).toBe(true);
  });

  it('should enable submit button when required fields are present', () => {
    component.indicatorDetailsService.indicatorData.set({
      achieved_in_2024: 10,
      narrative_achieved_in_2024: 'Some narrative',
      contributing_results: [{ id: 1 }]
    } as any);

    expect(component.isSubmitDisabled()).toBe(false);
  });
});
