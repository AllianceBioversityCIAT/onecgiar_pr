import { TestBed } from '@angular/core/testing';
import { TocInitiativeOutcomeListsService } from './toc-initiative-outcome-lists.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { FieldsManagerService } from '../../../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../../../shared/services/data-control.service';

describe('TocInitiativeOutcomeListsService', () => {
  let service: TocInitiativeOutcomeListsService;
  let mockApiService: any;
  let mockFieldsManagerService: any;
  let mockDataControlService: any;
  const mockResponse = [
    { toc_level_id: 1, name: 'Level 1' },
    { toc_level_id: 2, name: 'Level 2' },
    { toc_level_id: 3, name: 'Level 3' },
    { toc_level_id: 4, name: 'Level 4' }
  ];

  beforeEach(() => {
    mockApiService = {
      tocApiSE: {
        GET_AllTocLevels: jest.fn().mockReturnValue(of({ response: mockResponse }))
      }
    };

    mockFieldsManagerService = {
      isP25: jest.fn().mockReturnValue(false)
    };

    mockDataControlService = {
      currentResultSignal: jest.fn().mockReturnValue({ portfolio: 'P1' })
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TocInitiativeOutcomeListsService,
        { provide: ApiService, useValue: mockApiService },
        { provide: FieldsManagerService, useValue: mockFieldsManagerService },
        { provide: DataControlService, useValue: mockDataControlService }
      ]
    });
    service = TestBed.inject(TocInitiativeOutcomeListsService);
  });

  it('should populate outcomeLevelList with levels 2 and 3', done => {
    const spy = jest.spyOn(mockApiService.tocApiSE, 'GET_AllTocLevels');

    // The effect runs automatically when the service is created
    // Wait a bit for the effect to complete
    setTimeout(() => {
      expect(spy).toHaveBeenCalledWith(false);
      expect(service.outcomeLevelList.length).toBe(2);
      expect(service.outcomeLevelList[0].toc_level_id).toBe(2);
      expect(service.outcomeLevelList[1].toc_level_id).toBe(3);
      done();
    }, 100);
  });

  it('should handle GET_AllTocLevels error', done => {
    const spyConsoleError = jest.spyOn(console, 'error');
    const errorMessage = 'Error message';

    // Create a new service instance with error response
    const errorApiService = {
      tocApiSE: {
        GET_AllTocLevels: jest.fn().mockReturnValue(throwError(errorMessage))
      }
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TocInitiativeOutcomeListsService,
        { provide: ApiService, useValue: errorApiService },
        { provide: FieldsManagerService, useValue: mockFieldsManagerService },
        { provide: DataControlService, useValue: mockDataControlService }
      ]
    });

    TestBed.inject(TocInitiativeOutcomeListsService);

    setTimeout(() => {
      expect(spyConsoleError).toHaveBeenCalledWith(errorMessage);
      done();
    }, 100);
  });

  describe('tocResultList computed signal', () => {
    it('should return full list when currentResult is null', () => {
      mockDataControlService.currentResultSignal.mockReturnValue(null);
      const result = service.tocResultList();
      expect(result).toEqual([]);
      expect(result.length).toBe(4);
    });

    it('should return full list when currentResult is undefined', () => {
      mockDataControlService.currentResultSignal.mockReturnValue(undefined);
      const result = service.tocResultList();
      expect(result).toEqual([]);
      expect(result.length).toBe(4);
    });

    it('should return full list when result_type_id is undefined', () => {
      mockDataControlService.currentResultSignal.mockReturnValue({ portfolio: 'P1' });
      const result = service.tocResultList();
      expect(result).toEqual([]);
      expect(result.length).toBe(4);
    });

    it('should return full list when result_type_id is null', () => {
      mockDataControlService.currentResultSignal.mockReturnValue({
        portfolio: 'P1',
        result_type_id: null
      });
      const result = service.tocResultList();
      expect(result).toEqual([]);
      expect(result.length).toBe(4);
    });

    it('should filter to levels 2 and 3 when result_type_id is 2', () => {
      mockDataControlService.currentResultSignal.mockReturnValue({
        portfolio: 'P1',
        result_type_id: 2
      });
      const result = service.tocResultList();
      expect(result.length).toBe(0);
    });

    it('should filter to levels 2 and 3 when result_type_id is 1', () => {
      mockDataControlService.currentResultSignal.mockReturnValue({
        portfolio: 'P1',
        result_type_id: 1
      });
      const result = service.tocResultList();
      expect(result.length).toBe(0);
    });

    it('should filter to levels 2 and 3 when result_type_id is 5', () => {
      mockDataControlService.currentResultSignal.mockReturnValue({
        portfolio: 'P1',
        result_type_id: 5
      });
      const result = service.tocResultList();
      expect(result.length).toBe(0);
    });

    it('should return full list when result_type_id is other value', () => {
      mockDataControlService.currentResultSignal.mockReturnValue({
        portfolio: 'P1',
        result_type_id: 99
      });
      const result = service.tocResultList();
      expect(result).toEqual([]);
      expect(result.length).toBe(4);
    });
  });

  describe('onChangePortfolio effect', () => {
    it('should not call API when portfolio is undefined', done => {
      const spy = jest.spyOn(mockApiService.tocApiSE, 'GET_AllTocLevels');

      const noPortfolioDataControlService = {
        currentResultSignal: jest.fn().mockReturnValue({ portfolio: undefined })
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          TocInitiativeOutcomeListsService,
          { provide: ApiService, useValue: mockApiService },
          { provide: FieldsManagerService, useValue: mockFieldsManagerService },
          { provide: DataControlService, useValue: noPortfolioDataControlService }
        ]
      });

      TestBed.inject(TocInitiativeOutcomeListsService);

      setTimeout(() => {
        expect(spy).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should call API with isP25 true when isP25 returns true', done => {
      const spy = jest.spyOn(mockApiService.tocApiSE, 'GET_AllTocLevels');
      const trueFieldsManagerService = {
        isP25: jest.fn().mockReturnValue(true)
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          TocInitiativeOutcomeListsService,
          { provide: ApiService, useValue: mockApiService },
          { provide: FieldsManagerService, useValue: trueFieldsManagerService },
          { provide: DataControlService, useValue: mockDataControlService }
        ]
      });

      TestBed.inject(TocInitiativeOutcomeListsService);

      setTimeout(() => {
        expect(spy).toHaveBeenCalledWith(true);
        done();
      }, 100);
    });
  });
});
