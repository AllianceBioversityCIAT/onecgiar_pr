import { OutcomeIndicatorService } from './outcome-indicator.service';

describe('OutcomeIndicatorService', () => {
  let service: OutcomeIndicatorService;
  let apiServiceMock: any;

  beforeEach(() => {
    apiServiceMock = {
      resultsSE: {
        GET_contributionsToIndicatorsEOIS: jest.fn()
      }
    };

    service = new OutcomeIndicatorService(apiServiceMock);
  });

  it('should set loading to true and call GET_contributionsToIndicatorsEOIS', () => {
    const subscribeMock = jest.fn();
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsEOIS.mockReturnValue({ subscribe: subscribeMock });

    service.getEOIsData();

    expect(service.loading()).toBe(true);
    expect(apiServiceMock.resultsSE.GET_contributionsToIndicatorsEOIS).toHaveBeenCalledWith(service.initiativeIdFilter);
    expect(subscribeMock).toHaveBeenCalled();
  });

  it('should set eoisData and loading to false on successful response', () => {
    const response = { data: [{ toc_results: ['result1', 'result2'] }] };
    const subscribeMock = jest.fn(({ next }) => next(response));
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsEOIS.mockReturnValue({ subscribe: subscribeMock });

    service.getEOIsData();

    expect(service.eoisData).toEqual(['result1', 'result2']);
    expect(service.loading()).toBe(false);
  });

  it('should set loading to false on error response', () => {
    const error = new Error('Test error');
    const subscribeMock = jest.fn(({ error }) => error(error));
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsEOIS.mockReturnValue({ subscribe: subscribeMock });

    service.getEOIsData();

    expect(service.loading()).toBe(false);
  });
});
