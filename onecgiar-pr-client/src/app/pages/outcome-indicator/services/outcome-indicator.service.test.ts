import { of } from 'rxjs';
import { OutcomeIndicatorService } from './outcome-indicator.service';

describe('OutcomeIndicatorService', () => {
  let service: OutcomeIndicatorService;
  let apiServiceMock: any;
  let typeOneReportServiceMock: any;

  beforeEach(() => {
    apiServiceMock = {
      resultsSE: {
        GET_contributionsToIndicatorsEOIS: jest.fn(),
        GET_contributionsToIndicatorsWPS: jest.fn(),
        GET_AllInitiatives: jest.fn()
      }
    };

    typeOneReportServiceMock = {
      initiativeSelected: '123'
    };

    service = new OutcomeIndicatorService(apiServiceMock, typeOneReportServiceMock);
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
    const response = { response: ['result1', 'result2'] };
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

  it('should set loading to true and call GET_contributionsToIndicatorsEOIS with typeOneReportServiceMock.initiativeSelected', () => {
    const subscribeMock = jest.fn();
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsEOIS.mockReturnValue({ subscribe: subscribeMock });

    service.getEOIsData(true);

    expect(service.loading()).toBe(true);
    expect(apiServiceMock.resultsSE.GET_contributionsToIndicatorsEOIS).toHaveBeenCalledWith(typeOneReportServiceMock.initiativeSelected);
    expect(subscribeMock).toHaveBeenCalled();
  });

  it('should set eoisData with empty indicators array when indicators are null', () => {
    const response = { response: [{ indicators: null }] };
    const subscribeMock = jest.fn(({ next }) => next(response));
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsEOIS.mockReturnValue({ subscribe: subscribeMock });

    service.getEOIsData();

    expect(service.eoisData[0].indicators).toEqual([]);
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
    const response = { response: [{ toc_results: ['result1', 'result2'] }] };
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
    const response = { response: [{ toc_results: [{ indicators: null }] }] };
    const subscribeMock = jest.fn(({ next }) => next(response));
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsWPS.mockReturnValue({ subscribe: subscribeMock });

    service.getWorkPackagesData();
  });

  it('should set loadingWPs to true and call GET_contributionsToIndicatorsWPS with typeOneReportServiceMock.initiativeSelected', () => {
    const subscribeMock = jest.fn();
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsWPS.mockReturnValue({ subscribe: subscribeMock });

    service.getWorkPackagesData(true);

    expect(service.loadingWPs()).toBe(true);
    expect(apiServiceMock.resultsSE.GET_contributionsToIndicatorsWPS).toHaveBeenCalledWith(typeOneReportServiceMock.initiativeSelected);
    expect(subscribeMock).toHaveBeenCalled();
  });

  it('should sort workpackages by short name', () => {
    const response = {
      response: [
        { workpackage_short_name: 'WP2', toc_results: [] },
        { workpackage_short_name: 'WP1', toc_results: [] },
        { workpackage_short_name: 'WP3', toc_results: [] }
      ]
    };
    const subscribeMock = jest.fn(({ next }) => next(response));
    apiServiceMock.resultsSE.GET_contributionsToIndicatorsWPS.mockReturnValue({ subscribe: subscribeMock });

    service.getWorkPackagesData();

    expect(service.wpsData[0].workpackage_short_name).toBe('WP1');
    expect(service.wpsData[1].workpackage_short_name).toBe('WP2');
    expect(service.wpsData[2].workpackage_short_name).toBe('WP3');
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

  it('should load all initiatives', () => {
    const mockResponse = ['initiative1', 'initiative2'];
    jest.spyOn(apiServiceMock.resultsSE, 'GET_AllInitiatives').mockReturnValue(of({ response: mockResponse }));

    service.loadAllInitiatives();

    expect(service.allInitiatives()).toEqual(mockResponse);
  });
});
