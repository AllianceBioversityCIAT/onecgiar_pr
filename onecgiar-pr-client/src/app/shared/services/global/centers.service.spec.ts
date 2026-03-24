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
    await expect(service.getData()).rejects.toThrow('fail');
  });
});
