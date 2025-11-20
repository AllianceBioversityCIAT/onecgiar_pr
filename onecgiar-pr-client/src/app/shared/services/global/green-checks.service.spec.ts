import { TestBed } from '@angular/core/testing';
import { GreenChecksService } from './green-checks.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiService } from '../api/api.service';
import { ResultsApiService } from '../api/results-api.service';
import { FieldsManagerService } from '../fields-manager.service';

describe('GreenChecksService', () => {
  let service: GreenChecksService;
  let apiService: ApiService;
  let resultsApiService: ResultsApiService;
  let fieldsManagerService: FieldsManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GreenChecksService);
    apiService = TestBed.inject(ApiService);
    resultsApiService = TestBed.inject(ResultsApiService);
    fieldsManagerService = TestBed.inject(FieldsManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get green checks for P25 when currentResultId exists and is P25', done => {
    resultsApiService.currentResultId = 123;
    const mockResponse = {
      response: {
        green_checks: { test: false },
        submit: true
      }
    };

    jest.spyOn(fieldsManagerService, 'isP25').mockReturnValue(true);
    jest.spyOn(apiService.resultsSE, 'GET_p25GreenChecksByResultId').mockReturnValue(of(mockResponse));

    service.getGreenChecks();

    setTimeout(() => {
      expect(apiService.resultsSE.GET_p25GreenChecksByResultId).toHaveBeenCalled();
      expect(apiService.dataControlSE.green_checks).toEqual({ test: false });
      expect(service.submit).toBe(true);
      done();
    }, 20);
  });

  it('should get green checks for P22 when currentResultId exists and is not P25', done => {
    resultsApiService.currentResultId = 123;
    const mockResponse = {
      response: {
        green_checks: { test: false },
        submit: false
      }
    };

    jest.spyOn(fieldsManagerService, 'isP25').mockReturnValue(false);
    jest.spyOn(apiService.resultsSE, 'GET_greenChecksByResultId').mockReturnValue(of(mockResponse));

    service.getGreenChecks();

    setTimeout(() => {
      expect(apiService.resultsSE.GET_greenChecksByResultId).toHaveBeenCalled();
      expect(apiService.dataControlSE.green_checks).toEqual({ test: false });
      expect(service.submit).toBe(false);
      done();
    }, 20);
  });

  it('should not get green checks when currentResultId is null', done => {
    resultsApiService.currentResultId = null;
    jest.spyOn(apiService.resultsSE, 'GET_greenChecksByResultId');
    jest.spyOn(apiService.resultsSE, 'GET_p25GreenChecksByResultId');

    service.getGreenChecks();

    setTimeout(() => {
      expect(apiService.resultsSE.GET_greenChecksByResultId).not.toHaveBeenCalled();
      expect(apiService.resultsSE.GET_p25GreenChecksByResultId).not.toHaveBeenCalled();
      done();
    }, 20);
  });
});
