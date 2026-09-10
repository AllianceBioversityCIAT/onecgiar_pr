import { of, throwError } from 'rxjs';
import { CentersService } from './centers.service';

describe('CentersService', () => {
  let mockApi: any;
  let service: CentersService;

  const mockResponse = [
    { id: 1, name: 'Center A', code: 'CA', financial_code: 'FCA', institutionId: 10, acronym: 'CA' },
    { id: 2, name: 'Center B', code: 'CB', financial_code: 'FCB', institutionId: 20, acronym: 'CB' }
  ];

  beforeEach(() => {
    mockApi = {
      resultsSE: {
        GET_AllCLARISACenters: jest.fn(() => of({ response: mockResponse }))
      }
    };
    service = new CentersService(mockApi as any);
  });

  it('should request centers on construction and populate centersList', async () => {
    // getData is called in constructor; ensure populated
    const data = await service.getData();
    expect(mockApi.resultsSE.GET_AllCLARISACenters).toHaveBeenCalled();
    expect(service.centersList).toEqual(mockResponse);
    expect(data).toEqual(mockResponse);
  });

  it('P2-3190: publishes the catalogue on the `centers` signal so late consumers can react', async () => {
    // Fresh instance: the signal must start empty and be filled by the same response that fills `centersList`.
    const freshApi = { resultsSE: { GET_AllCLARISACenters: jest.fn(() => of({ response: mockResponse })) } };
    const fresh = new CentersService(freshApi as any);
    await fresh.getData();
    expect(fresh.centers()).toEqual(mockResponse);
    expect(fresh.centers()).toEqual(fresh.centersList);
  });

  it('should emit loadedCenters=true after successful load', done => {
    // Ensure it does not use cache so it emits from API path
    service.centersList = [];
    service.loadedCenters.subscribe(flag => {
      expect(flag).toBe(true);
      done();
    });
    service.getData();
  });

  it('should return cached data without calling API when centersList already present', async () => {
    // Seed cache
    service.centersList = mockResponse.slice() as any;
    const prevCalls = mockApi.resultsSE.GET_AllCLARISACenters.mock.calls.length;
    const data = await service.getData();
    expect(mockApi.resultsSE.GET_AllCLARISACenters.mock.calls.length).toBe(prevCalls);
    expect(data).toEqual(mockResponse);
  });

  it('should reject when API errors', async () => {
    const errorApi = {
      resultsSE: {
        GET_AllCLARISACenters: jest.fn(() => throwError(() => new Error('fail')))
      }
    };
    // Clear cache to force API path and then swap API to failing one
    service.centersList = [];
    (service as any).api = errorApi;
    // P2-3554: the request is retried before giving up, so the backoff is shortened for the spec.
    (service as any).retryDelayMs = 0;
    await expect(service.getData()).rejects.toThrow('fail');
  });

  /**
   * P2-3554 — QA reported the "Contributing CGIAR Centers" dropdown returning no option ever, on any search
   * term, while the very same control worked on another result. Measured against the live environment: one
   * failing response to `clarisa/centers/get/all` is enough to leave EVERY centers dropdown (the mandatory
   * "Lead center" included) showing "No information found" for the rest of the session, because the request
   * used to be fired exactly once at bootstrap with no retry and no way back.
   */
  describe('P2-3554: the catalogue request survives a transient failure', () => {
    /** Builds a service whose request fails `failures` times before answering, with no waiting in the spec. */
    const serviceThatFails = (failures: number, finalResponse: any = mockResponse) => {
      let calls = 0;
      const api = {
        resultsSE: {
          GET_AllCLARISACenters: jest.fn(() => {
            calls++;
            return calls <= failures ? throwError(() => new Error('transient')) : of({ response: finalResponse });
          })
        }
      };
      const svc = new CentersService(api as any);
      (svc as any).retryDelayMs = 0;
      // The constructor already consumed the first attempt(s); start from a clean slate for the assertion.
      svc.centersList = [];
      svc.centers.set([]);
      (svc as any).inFlight = null;
      api.resultsSE.GET_AllCLARISACenters.mockClear();
      calls = 0;
      return { svc, api };
    };

    it('retries and still publishes the catalogue when the first response fails', async () => {
      const { svc, api } = serviceThatFails(1);

      await svc.getData();

      expect(api.resultsSE.GET_AllCLARISACenters).toHaveBeenCalledTimes(2);
      expect(svc.centers()).toEqual(mockResponse);
      expect(svc.centersList).toEqual(mockResponse);
    });

    it('treats a 200 with an empty catalogue as a failed attempt instead of caching it', async () => {
      let calls = 0;
      const api = {
        resultsSE: {
          GET_AllCLARISACenters: jest.fn(() => {
            calls++;
            return of({ response: calls === 1 ? [] : mockResponse });
          })
        }
      };
      const svc = new CentersService(api as any);
      (svc as any).retryDelayMs = 0;
      svc.centersList = [];
      svc.centers.set([]);
      (svc as any).inFlight = null;
      api.resultsSE.GET_AllCLARISACenters.mockClear();
      calls = 0;

      await svc.getData();

      expect(api.resultsSE.GET_AllCLARISACenters).toHaveBeenCalledTimes(2);
      expect(svc.centers()).toEqual(mockResponse);
    });

    it('lets a later caller recover the session after every attempt failed', async () => {
      const failing = { resultsSE: { GET_AllCLARISACenters: jest.fn(() => throwError(() => new Error('down'))) } };
      const svc = new CentersService(failing as any);
      (svc as any).retryDelayMs = 0;
      (svc as any).inFlight = null;

      await expect(svc.getData()).rejects.toThrow('down');
      expect(svc.centers()).toEqual([]);

      // The environment comes back and a screen asks for the list again — this is the recovery path that did
      // not exist: the old code kept no in-flight latch, but nothing ever re-requested either.
      (svc as any).api = { resultsSE: { GET_AllCLARISACenters: jest.fn(() => of({ response: mockResponse })) } };
      await svc.getData();

      expect(svc.centers()).toEqual(mockResponse);
    });

    it('rejects instead of hanging forever when the API service is not wired yet', async () => {
      const svc = new CentersService({ resultsSE: undefined } as any);
      (svc as any).retryDelayMs = 0;
      (svc as any).inFlight = null;

      await expect(svc.getData()).rejects.toThrow('CLARISA centers request is unavailable');
    });
  });
});
