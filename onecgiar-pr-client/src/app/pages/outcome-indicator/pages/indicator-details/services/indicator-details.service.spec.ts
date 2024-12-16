import { TestBed } from '@angular/core/testing';
import { IndicatorDetailsService } from './indicator-details.service';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { AuthService } from '../../../../../shared/services/api/auth.service';
import { of } from 'rxjs';
import { IndicatorData } from '../models/indicator-data.model';

jest.mock('../../../../../shared/services/api/results-api.service');
jest.mock('../../../../../shared/services/api/auth.service');

describe('IndicatorDetailsService', () => {
  let service: IndicatorDetailsService;
  let resultsApiServiceMock: any;
  let authServiceMock: any;

  beforeEach(() => {
    authServiceMock = {
      localStorageUser: {
        id: 123,
        user_name: 'test',
        email: 'test@test.com'
      }
    };

    resultsApiServiceMock = {
      GET_contributionsDetailsResults: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        IndicatorDetailsService,
        { provide: ResultsApiService, useValue: resultsApiServiceMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });

    service = TestBed.inject(IndicatorDetailsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch indicator details results and update indicatorResults', () => {
    const mockResponse = {
      response: [
        { id: 'result1', is_added: false, is_saved: false },
        { id: 'result2', is_added: false, is_saved: false }
      ]
    };

    resultsApiServiceMock.GET_contributionsDetailsResults.mockReturnValue(of(mockResponse));

    service.indicatorData.set({
      contributing_results: [{ result_id: 'result1' }]
    } as IndicatorData);

    service.getIndicatorDetailsResults('initiative123');

    expect(resultsApiServiceMock.GET_contributionsDetailsResults).toHaveBeenCalledWith(123, 'initiative123');
    expect(service.indicatorResults().length).toBe(2);
    expect(service.indicatorResults()[0].is_added).toBe(true);
    expect(service.indicatorResults()[0].is_saved).toBe(true);
    expect(service.indicatorResults()[1].is_added).toBe(false);
    expect(service.indicatorResults()[1].is_saved).toBe(false);
  });
});
