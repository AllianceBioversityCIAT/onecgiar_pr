import { OutcomeIndicatorService } from './outcome-indicator.service';

describe('OutcomeIndicatorService', () => {
  let service: OutcomeIndicatorService;
  let apiServiceMock: any;

  beforeEach(() => {
    apiServiceMock = {
      resultsSE: {
        GET_contributionsToIndicatorsEOIS: jest.fn(),
        GET_contributionsToIndicatorsWPS: jest.fn()
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
    const response = { data: ['result1', 'result2'] };
    const subscribeMock = jest.fn(({ next }) => next(response));
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsEOIS.mockReturnValue({ subscribe: subscribeMock });

    service.getEOIsData();

    expect(service.eoisData).toEqual(['result1', 'result2']);
    expect(service.loading()).toBe(false);
  });

  it('should set loading to false on error response', () => {
    const subscribeMock = jest.fn(({ error }) => error(error));
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsEOIS.mockReturnValue({ subscribe: subscribeMock });

    service.getEOIsData();

    expect(service.loading()).toBe(false);
  });

  it('should set loadingWPs to true and call GET_contributionsToIndicatorsWPS', () => {
    const subscribeMock = jest.fn();
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsWPS.mockReturnValue({ subscribe: subscribeMock });

    service.getWorkPackagesData();

    expect(service.loadingWPs()).toBe(true);
    expect(apiServiceMock.resultsSE.GET_contributionsToIndicatorsWPS).toHaveBeenCalledWith(service.initiativeIdFilter);
    expect(subscribeMock).toHaveBeenCalled();
  });

  it('should set wpsData and loadingWPs to false on successful response', () => {
    const response = { data: [{ toc_results: ['result1', 'result2'] }] };
    const subscribeMock = jest.fn(({ next }) => next(response));
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsWPS.mockReturnValue({ subscribe: subscribeMock });

    service.getWorkPackagesData();

    expect(service.wpsData).toEqual([{ toc_results: ['result1', 'result2'] }]);
    expect(service.loadingWPs()).toBe(false);
  });

  it('should set loadingWPs to false on error response', () => {
    const subscribeMock = jest.fn(({ error }) => error(error));
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsWPS.mockReturnValue({ subscribe: subscribeMock });

    service.getWorkPackagesData();

    expect(service.loadingWPs()).toBe(false);
  });

  it('should set wpsData with indicators when indicators are null', () => {
    const response = { data: [{ toc_results: [{ indicators: null }] }] };
    const subscribeMock = jest.fn(({ next }) => next(response));
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsWPS.mockReturnValue({ subscribe: subscribeMock });

    service.getWorkPackagesData();
  });

  it('should return true when achievedTarget is greater than or equal to expectedTarget', () => {
    const expectedTarget = 10;
    const achievedTarget = 15;
    expect(service.achievedStatus(expectedTarget, achievedTarget)).toBe(true);
  });

  it('should return false when achievedTarget is less than expectedTarget', () => {
    const expectedTarget = 10;
    const achievedTarget = 5;
    expect(service.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
  });

  it('should return false when expectedTarget is null', () => {
    const expectedTarget = null;
    const achievedTarget = 10;
    expect(service.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
  });

  it('should return false when achievedTarget is null', () => {
    const expectedTarget = 10;
    const achievedTarget = null;
    expect(service.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
  });

  it('should return false when both expectedTarget and achievedTarget are null', () => {
    const expectedTarget = null;
    const achievedTarget = null;
    expect(service.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
  });

  it('should return false when achievedTarget is NaN', () => {
    const expectedTarget = 10;
    const achievedTarget = NaN;
    expect(service.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
  });

  it('should return false when expectedTarget is NaN', () => {
    const expectedTarget = NaN;
    const achievedTarget = 10;
    expect(service.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
  });

  it('should return false when both expectedTarget and achievedTarget are NaN', () => {
    const expectedTarget = NaN;
    const achievedTarget = NaN;
    expect(service.achievedStatus(expectedTarget, achievedTarget)).toBe(false);
  });

  it('should expand all rows', () => {
    service.wpsData = [{ workpackage_short_name: 'WP1' }, { workpackage_short_name: 'WP2' }, { workpackage_short_name: 'WP3' }];

    service.expandAll();

    expect(service.expandedRows).toEqual({
      WP1: true,
      WP2: true,
      WP3: true
    });
  });

  it('should not expand any rows if wpsData is empty', () => {
    service.wpsData = [];

    service.expandAll();

    expect(service.expandedRows).toEqual({});
  });

  it('should collapse all rows', () => {
    service.wpsData = [{ workpackage_short_name: 'WP1' }, { workpackage_short_name: 'WP2' }, { workpackage_short_name: 'WP3' }];
    service.expandedRows = {
      WP1: true,
      WP2: true,
      WP3: true
    };

    service.collapseAll();

    expect(service.expandedRows).toEqual({});
  });

  it('should keep expandedRows empty if wpsData is empty', () => {
    service.wpsData = [];
    service.expandedRows = {};

    service.collapseAll();

    expect(service.expandedRows).toEqual({});
  });
});
