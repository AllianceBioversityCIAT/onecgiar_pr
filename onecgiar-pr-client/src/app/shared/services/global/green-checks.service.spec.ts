import { TestBed } from '@angular/core/testing';
import { GreenChecksService } from './green-checks.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../api/api.service';
import { ResultsApiService } from '../api/results-api.service';
import { FieldsManagerService } from '../fields-manager.service';

describe('GreenChecksService', () => {
  let service: GreenChecksService;
  let apiService: ApiService;
  let resultsApiService: ResultsApiService;
  let fieldsManagerService: FieldsManagerService;

  /**
   * The portfolio is what decides which endpoint may answer, so every test that expects a request has to
   * put it on `currentResultSignal` first — the same way `GET_resultById` does in the app.
   */
  const openResultWithPortfolio = (portfolio: string) => apiService.dataControlSE.currentResultSignal.set({ portfolio } as any);

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GreenChecksService);
    apiService = TestBed.inject(ApiService);
    resultsApiService = TestBed.inject(ResultsApiService);
    fieldsManagerService = TestBed.inject(FieldsManagerService);
    apiService.dataControlSE.currentResultSignal.set({} as any);
    apiService.dataControlSE.green_checks = null;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get green checks for P25 when currentResultId exists and is P25', done => {
    resultsApiService.currentResultId = 123;
    openResultWithPortfolio('P25');
    const mockResponse = {
      response: {
        green_checks: { test: false },
        submit: true
      }
    };

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
    openResultWithPortfolio('P22');
    const mockResponse = {
      response: {
        green_checks: { test: false },
        submit: false
      }
    };

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
    openResultWithPortfolio('P25');
    jest.spyOn(apiService.resultsSE, 'GET_greenChecksByResultId');
    jest.spyOn(apiService.resultsSE, 'GET_p25GreenChecksByResultId');

    service.getGreenChecks();

    setTimeout(() => {
      expect(apiService.resultsSE.GET_greenChecksByResultId).not.toHaveBeenCalled();
      expect(apiService.resultsSE.GET_p25GreenChecksByResultId).not.toHaveBeenCalled();
      done();
    }, 20);
  });

  describe('P2-3552 — nothing is requested until the portfolio is known', () => {
    /**
     * The regression this suite exists for: `result-detail.component.ts` calls `getGreenChecks()` from
     * `getData()`, right after `currentResultSignal.set({})`. Back then `isP25()` was `false` for an
     * `undefined` portfolio, so the v1/P22 endpoint was hit for a P25 result on every single load.
     */
    it('requests NEITHER endpoint while the portfolio is unknown', done => {
      resultsApiService.currentResultId = 123;
      jest.spyOn(apiService.resultsSE, 'GET_greenChecksByResultId');
      jest.spyOn(apiService.resultsSE, 'GET_p25GreenChecksByResultId');

      service.getGreenChecks();

      setTimeout(() => {
        expect(apiService.resultsSE.GET_greenChecksByResultId).not.toHaveBeenCalled();
        expect(apiService.resultsSE.GET_p25GreenChecksByResultId).not.toHaveBeenCalled();
        done();
      }, 20);
    });

    it('clears the previous result checks when the portfolio is unknown, so they do not survive navigation', () => {
      resultsApiService.currentResultId = 456;
      apiService.dataControlSE.green_checks = [{ section_name: 'general-information', validation: 1 }];
      service.submit = true as any;

      service.getGreenChecks();

      expect(apiService.dataControlSE.green_checks).toBeNull();
      expect(service.submit).toBeNull();
    });

    it('never asks the v1 endpoint for a P25 result', done => {
      resultsApiService.currentResultId = 123;
      openResultWithPortfolio('P25');
      jest.spyOn(apiService.resultsSE, 'GET_greenChecksByResultId');
      jest.spyOn(apiService.resultsSE, 'GET_p25GreenChecksByResultId').mockReturnValue(of({ response: { green_checks: [], submit: false } }));

      service.getGreenChecks();

      setTimeout(() => {
        expect(apiService.resultsSE.GET_greenChecksByResultId).not.toHaveBeenCalled();
        expect(apiService.resultsSE.GET_p25GreenChecksByResultId).toHaveBeenCalled();
        done();
      }, 20);
    });
  });

  describe('P2-3552 — a failed or stale response cannot paint the rail', () => {
    it('drops to unknown instead of keeping the previous checks when the request fails', done => {
      resultsApiService.currentResultId = 123;
      openResultWithPortfolio('P25');
      apiService.dataControlSE.green_checks = [{ section_name: 'general-information', validation: 1 }];
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      jest.spyOn(apiService.resultsSE, 'GET_p25GreenChecksByResultId').mockReturnValue(throwError(() => new Error('404')));

      service.getGreenChecks();

      setTimeout(() => {
        expect(apiService.dataControlSE.green_checks).toBeNull();
        expect(service.submit).toBeNull();
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
        done();
      }, 20);
    });

    it('ignores a response that belongs to a result the user already left', done => {
      const slowResponse = { response: { green_checks: [{ section_name: 'general-information', validation: 1 }], submit: true } };
      // One captured `next` per call, so the FIRST result's response can be emitted after the second call.
      const nexts: ((value: unknown) => void)[] = [];
      jest.spyOn(apiService.resultsSE, 'GET_p25GreenChecksByResultId').mockReturnValue({
        subscribe: ({ next }: any) => {
          nexts.push(next);
          return { unsubscribe: () => undefined };
        }
      } as any);

      resultsApiService.currentResultId = 111;
      openResultWithPortfolio('P25');
      service.getGreenChecks();

      // The user opens another result before 111 answers.
      resultsApiService.currentResultId = 222;
      openResultWithPortfolio('P25');
      service.getGreenChecks();

      expect(nexts).toHaveLength(2);
      nexts[0](slowResponse);

      setTimeout(() => {
        expect(apiService.dataControlSE.green_checks).toBeNull();
        done();
      }, 20);
    });
  });
});
