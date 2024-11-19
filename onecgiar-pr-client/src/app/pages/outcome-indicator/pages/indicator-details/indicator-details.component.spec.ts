import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IndicatorDetailsComponent } from './indicator-details.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Location } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('IndicatorDetailsComponent', () => {
  let component: IndicatorDetailsComponent;
  let fixture: ComponentFixture<IndicatorDetailsComponent>;
  let apiService: ApiService;
  let location: Location;
  let activatedRoute: ActivatedRoute;

  beforeEach(async () => {
    const apiServiceMock = {
      resultsSE: {
        GET_contributionsToIndicators_indicator: jest.fn().mockReturnValue(of({})),
        POST_contributionsToIndicators: jest.fn().mockReturnValue(of({}))
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
        { provide: Location, useValue: locationMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IndicatorDetailsComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    location = TestBed.inject(Location);
    activatedRoute = TestBed.inject(ActivatedRoute);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get query params on init', () => {
    component.ngOnInit();
    expect(component.indicatorId).toBe('123');
  });

  it('should call getIndicatorData on init', () => {
    jest.spyOn(component, 'getIndicatorData');
    component.ngOnInit();
    expect(component.getIndicatorData).toHaveBeenCalled();
  });

  it('should handle getIndicatorData when indicatorId is not present', () => {
    component.indicatorId = '';
    jest.spyOn(component, 'goBack');
    component.getIndicatorData();
    expect(component.goBack).toHaveBeenCalled();
  });

  it('should handle getIndicatorData when indicatorId is present', () => {
    component.indicatorId = '123';
    jest.spyOn(apiService.resultsSE, 'GET_contributionsToIndicators_indicator').mockReturnValue(of({}));
    component.getIndicatorData();
    expect(apiService.resultsSE.GET_contributionsToIndicators_indicator).toHaveBeenCalledWith('123');
  });

  it('should handle error in getIndicatorData', () => {
    component.indicatorId = '123';
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

  it('should handle 404 response in handleGetIndicatorResponse', () => {
    component.indicatorId = '123';
    const response = { status: 404 };
    jest.spyOn(apiService.resultsSE, 'POST_contributionsToIndicators').mockReturnValue(of({}));
    jest.spyOn(component, 'retryGetIndicatorData');
    component.handleGetIndicatorResponse(response);
    expect(apiService.resultsSE.POST_contributionsToIndicators).toHaveBeenCalledWith('123');
    expect(component.retryGetIndicatorData).toHaveBeenCalled();
  });

  it('should handle error in handleGetIndicatorResponse', () => {
    component.indicatorId = '123';
    const error = { message: 'Error' };
    jest.spyOn(apiService.resultsSE, 'POST_contributionsToIndicators').mockReturnValue(throwError(() => error));
    jest.spyOn(component, 'handleError');
    component.handleGetIndicatorResponse({ status: 404 });
    expect(component.handleError).toHaveBeenCalledWith(error);
  });

  it('should handle error in retryGetIndicatorData', () => {
    component.indicatorId = '123';
    const error = { message: 'Error' };
    jest.spyOn(apiService.resultsSE, 'GET_contributionsToIndicators_indicator').mockReturnValue(throwError(() => error));
    jest.spyOn(component, 'handleError');
    component.retryGetIndicatorData();
    expect(component.handleError).toHaveBeenCalledWith(error);
  });

  it('should update indicator data in updateIndicatorData', () => {
    const response = { contributionToIndicator: { someData: 'data' } };
    component.updateIndicatorData(response);
    expect(component.indicatorData).toEqual(response.contributionToIndicator);
    expect(component.loading).toBe(false);
  });

  it('should go back when goBack is called', () => {
    component.goBack();
    expect(location.back).toHaveBeenCalled();
  });

  it('should open new page when openInNewPage is called', () => {
    const result_code = 'result123';
    const version_id = 'version123';
    const url = `/result/result-detail/${result_code}/general-information?phase=${version_id}`;
    jest.spyOn(window, 'open');
    component.openInNewPage(result_code, version_id);
    expect(window.open).toHaveBeenCalledWith(url, '_blank');
  });
});
