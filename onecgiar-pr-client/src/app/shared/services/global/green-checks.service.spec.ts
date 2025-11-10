import { TestBed } from '@angular/core/testing';
import { GreenChecksService } from './green-checks.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiService } from '../api/api.service';
import { ResultsApiService } from '../api/results-api.service';

describe('GreenChecksService', () => {
  let service: GreenChecksService;
  let apiService: ApiService;
  let resultsApiService: ResultsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GreenChecksService);
    apiService = TestBed.inject(ApiService);
    resultsApiService = TestBed.inject(ResultsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update green checks when currentResultId exists', done => {
    resultsApiService.currentResultId = 123;
    const mockResponse = {
      response: {
        green_checks: { test: true },
        submit: true
      }
    };

    jest.spyOn(apiService.resultsSE, 'PATCH_greenChecksByResultId').mockReturnValue(of(mockResponse));

    service.updateGreenChecks();

    setTimeout(() => {
      expect(apiService.resultsSE.PATCH_greenChecksByResultId).toHaveBeenCalled();
      expect(apiService.dataControlSE.green_checks).toEqual({ test: true });
      expect(service.submit).toBe(true);
      done();
    }, 20);
  });

  it('should not update green checks when currentResultId is null', done => {
    resultsApiService.currentResultId = null;
    jest.spyOn(apiService.resultsSE, 'PATCH_greenChecksByResultId');

    service.updateGreenChecks();

    setTimeout(() => {
      expect(apiService.resultsSE.PATCH_greenChecksByResultId).not.toHaveBeenCalled();
      done();
    }, 20);
  });

  it('should get green checks when currentResultId exists', done => {
    resultsApiService.currentResultId = 123;
    const mockResponse = {
      response: {
        green_checks: { test: false }
      }
    };

    jest.spyOn(apiService.resultsSE, 'GET_greenChecksByResultId').mockReturnValue(of(mockResponse));

    service.getGreenChecks();

    setTimeout(() => {
      expect(apiService.resultsSE.GET_greenChecksByResultId).toHaveBeenCalled();
      expect(apiService.dataControlSE.green_checks).toEqual({ test: false });
      done();
    }, 20);
  });

  it('should not get green checks when currentResultId is null', done => {
    resultsApiService.currentResultId = null;
    jest.spyOn(apiService.resultsSE, 'GET_greenChecksByResultId');

    service.getGreenChecks();

    setTimeout(() => {
      expect(apiService.resultsSE.GET_greenChecksByResultId).not.toHaveBeenCalled();
      done();
    }, 20);
  });
});
