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
        GET_contributionsToIndicatorsWPS: jest.fn().mockReturnValue(of({ response: [{ toc_results: ['result1', 'result2'] }] })),
        GET_contributionsToIndicatorsEOIS: jest.fn().mockReturnValue(of({ response: ['result1', 'result2'] })),
        GET_platformGlobalVariablesByCategoryId: jest.fn().mockReturnValue(of({ data: ['result1', 'result2'] }))
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

  it('should update indicator data and set loading to false in updateIndicatorData', () => {
    const response = { response: { someData: 'data', initiative_official_code: '123' } };
    component.updateIndicatorData(response);
    expect(component.indicatorDetailsService.indicatorData()).toEqual(response.response);
    expect(component.loading()).toBe(false);
  });

  it('should call getIndicatorDetailsResults in updateIndicatorData', () => {
    const response = { response: { someData: 'data' } };
    jest.spyOn(component.indicatorDetailsService, 'getIndicatorDetailsResults');
    component.updateIndicatorData(response);
    expect(component.indicatorDetailsService.getIndicatorDetailsResults).toHaveBeenCalled();
  });

  it('should update initiativeIdFilter and call getWorkPackagesData and getEOIsData after timeout when initiativeIdFilter is different', done => {
    const response = { response: { initiative_official_code: '456' } };
    component.outcomeIService.initiativeIdFilter = '123';
    component.indicatorDetailsService.indicatorData.set({ initiative_official_code: '456' } as any);
    jest.spyOn(component.outcomeIService, 'getWorkPackagesData');
    jest.spyOn(component.outcomeIService, 'getEOIsData');

    component.updateIndicatorData(response);

    setTimeout(() => {
      expect(component.outcomeIService.initiativeIdFilter).toBe('456');
      expect(component.outcomeIService.getWorkPackagesData).toHaveBeenCalled();
      expect(component.outcomeIService.getEOIsData).toHaveBeenCalled();
      done();
    }, 500);
  });

  it('should set loading to false after updating indicator data', () => {
    const response = { response: { someData: 'data' } };
    component.loading.set(true);
    component.updateIndicatorData(response);
    expect(component.loading()).toBe(false);
  });

  it('should not call getWorkPackagesData and getEOIsData if initiativeIdFilter is the same', () => {
    const response = { response: { someData: 'data', initiative_official_code: '123' } };
    component.outcomeIService.initiativeIdFilter = '123';
    jest.spyOn(component.outcomeIService, 'getWorkPackagesData');
    jest.spyOn(component.outcomeIService, 'getEOIsData');
    component.updateIndicatorData(response);
    expect(component.outcomeIService.getWorkPackagesData).not.toHaveBeenCalled();
    expect(component.outcomeIService.getEOIsData).not.toHaveBeenCalled();
  });

  it('should handle retryGetIndicatorData successfully', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    const response = { response: { someData: 'data' } };
    jest.spyOn(apiService.resultsSE, 'GET_contributionsToIndicators_indicator').mockReturnValue(of(response));
    jest.spyOn(component, 'updateIndicatorData');
    jest.spyOn(component, 'handleSaveIndicatorData');

    component.retryGetIndicatorData();

    expect(apiService.resultsSE.GET_contributionsToIndicators_indicator).toHaveBeenCalledWith('123');
    expect(component.updateIndicatorData).toHaveBeenCalledWith(response);
    expect(component.handleSaveIndicatorData).toHaveBeenCalled();
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
    const response = { response: { someData: 'data' } };
    component.updateIndicatorData(response);
    expect(component.indicatorDetailsService.indicatorData()).toEqual(response.response);
    expect(component.loading()).toBe(false);
  });

  it('should go back when goBack is called', () => {
    component.goBack();
    expect(location.back).toHaveBeenCalled();
  });

  it('should go back and set detail section title to "Work package outcome indicators list" when platformId is wps', () => {
    component.indicatorDetailsService.platformId.set('wps');
    component.goBack();
    expect(apiService.dataControlSE.detailSectionTitle).toHaveBeenCalledWith('Work package outcome indicators list');
  });

  it('should go back and set detail section title to "End of initiative outcome indicators list" when platformId is eoi', () => {
    component.indicatorDetailsService.platformId.set('eoi');
    component.goBack();
    expect(apiService.dataControlSE.detailSectionTitle).toHaveBeenCalledWith('End of initiative outcome indicators list');
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

  it('should call goBack when indicatorId is not set', () => {
    component.indicatorDetailsService.indicatorId.set(null);
    jest.spyOn(component, 'goBack');

    component.getIndicatorData();

    expect(component.goBack).toHaveBeenCalled();
  });

  it('should update indicator data on successful GET request', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    const response = { response: { someData: 'data' } };
    jest.spyOn(apiService.resultsSE, 'GET_contributionsToIndicators_indicator').mockReturnValue(of(response));
    jest.spyOn(component, 'updateIndicatorData');

    component.getIndicatorData();

    expect(component.updateIndicatorData).toHaveBeenCalledWith(response);
  });

  it('should handle 404 error by making POST request', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    const error404 = { status: 404 };
    jest.spyOn(apiService.resultsSE, 'GET_contributionsToIndicators_indicator').mockReturnValue(throwError(() => error404));
    jest.spyOn(apiService.resultsSE, 'POST_contributionsToIndicators').mockReturnValue(of({}));
    jest.spyOn(component, 'retryGetIndicatorData');

    component.getIndicatorData();

    expect(apiService.resultsSE.POST_contributionsToIndicators).toHaveBeenCalledWith('123');
    expect(component.retryGetIndicatorData).toHaveBeenCalled();
  });

  it('should handle non-404 error by calling handleError', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    const error500 = { status: 500 };
    jest.spyOn(apiService.resultsSE, 'GET_contributionsToIndicators_indicator').mockReturnValue(throwError(() => error500));
    jest.spyOn(component, 'handleError');

    component.getIndicatorData();

    expect(component.handleError).toHaveBeenCalledWith(error500);
  });

  it('should handle error in POST request after 404', () => {
    component.indicatorDetailsService.indicatorId.set('123');
    const error404 = { status: 404 };
    const postError = { message: 'POST Error' };

    jest.spyOn(apiService.resultsSE, 'GET_contributionsToIndicators_indicator').mockReturnValue(throwError(() => error404));
    jest.spyOn(apiService.resultsSE, 'POST_contributionsToIndicators').mockReturnValue(throwError(() => postError));
    jest.spyOn(component, 'handleError');

    component.getIndicatorData();

    expect(component.handleError).toHaveBeenCalledWith(postError);
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

  it('should update title on destroy', () => {
    const spy = jest.spyOn(apiService.dataControlSE, 'detailSectionTitle');

    component.ngOnDestroy();

    expect(spy).toHaveBeenCalledWith('Outcome indicator module');
  });
});
