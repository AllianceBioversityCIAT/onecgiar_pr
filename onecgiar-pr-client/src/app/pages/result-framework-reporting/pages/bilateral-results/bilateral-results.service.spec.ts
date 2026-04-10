import { TestBed } from '@angular/core/testing';
import { BilateralResultsService } from './bilateral-results.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { of } from 'rxjs';

describe('BilateralResultsService', () => {
  let service: BilateralResultsService;
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        GET_ClarisaGlobalUnits: jest.fn().mockReturnValue(of({ response: { initiative: { name: 'Test' } } })),
        GET_ResultToReview: jest.fn().mockReturnValue(of({ response: [] }))
      }
    };

    TestBed.configureTestingModule({
      providers: [
        BilateralResultsService,
        { provide: ApiService, useValue: mockApiService }
      ]
    });

    service = TestBed.inject(BilateralResultsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('indicatorCategoryOptions computed', () => {
    it('should return unique sorted indicator categories filtering out falsy values', () => {
      service.tableResults.set([
        { indicator_category: 'Zeta', status_name: '', lead_center: '' } as any,
        { indicator_category: 'Alpha', status_name: '', lead_center: '' } as any,
        { indicator_category: 'Alpha', status_name: '', lead_center: '' } as any,
        { indicator_category: null, status_name: '', lead_center: '' } as any,
        { indicator_category: '', status_name: '', lead_center: '' } as any
      ]);

      const result = service.indicatorCategoryOptions();
      expect(result).toEqual(['Alpha', 'Zeta']);
    });

    it('should return empty array when no results', () => {
      service.tableResults.set([]);
      expect(service.indicatorCategoryOptions()).toEqual([]);
    });
  });

  describe('statusOptions computed', () => {
    it('should return unique sorted status names filtering out falsy values', () => {
      service.tableResults.set([
        { status_name: 'Submitted', indicator_category: '', lead_center: '' } as any,
        { status_name: 'Editing', indicator_category: '', lead_center: '' } as any,
        { status_name: 'Submitted', indicator_category: '', lead_center: '' } as any,
        { status_name: null, indicator_category: '', lead_center: '' } as any
      ]);

      const result = service.statusOptions();
      expect(result).toEqual(['Editing', 'Submitted']);
    });
  });

  describe('leadCenterOptions computed', () => {
    it('should return unique sorted lead centers filtering out falsy values', () => {
      service.tableResults.set([
        { lead_center: 'CIAT', indicator_category: '', status_name: '' } as any,
        { lead_center: 'IFPRI', indicator_category: '', status_name: '' } as any,
        { lead_center: 'CIAT', indicator_category: '', status_name: '' } as any,
        { lead_center: undefined, indicator_category: '', status_name: '' } as any,
        { lead_center: '', indicator_category: '', status_name: '' } as any
      ]);

      const result = service.leadCenterOptions();
      expect(result).toEqual(['CIAT', 'IFPRI']);
    });
  });

  describe('pendingCountByAcronym computed', () => {
    it('should count pending results (status_id == 5) grouped by lead_center', () => {
      service.allResultsForCounts.set([
        { status_id: 5, lead_center: 'CIAT' } as any,
        { status_id: 5, lead_center: 'CIAT' } as any,
        { status_id: 5, lead_center: 'IFPRI' } as any,
        { status_id: 3, lead_center: 'CIAT' } as any
      ]);

      const result = service.pendingCountByAcronym();
      expect(result).toEqual({ CIAT: 2, IFPRI: 1 });
    });

    it('should skip results with falsy lead_center (the if(key) branch)', () => {
      service.allResultsForCounts.set([
        { status_id: 5, lead_center: '' } as any,
        { status_id: 5, lead_center: null } as any,
        { status_id: 5, lead_center: undefined } as any
      ]);

      const result = service.pendingCountByAcronym();
      expect(result).toEqual({});
    });

    it('should handle no pending results', () => {
      service.allResultsForCounts.set([
        { status_id: 1, lead_center: 'CIAT' } as any
      ]);

      const result = service.pendingCountByAcronym();
      expect(result).toEqual({});
    });

    it('should use nullish coalescing for lead_center defaulting to empty string', () => {
      service.allResultsForCounts.set([
        { status_id: 5 } as any
      ]);

      const result = service.pendingCountByAcronym();
      // lead_center is undefined, ?? '' makes it '', if ('') is false, so skipped
      expect(result).toEqual({});
    });
  });

  describe('totalPendingCount computed', () => {
    it('should count all results with status_id == 5', () => {
      service.allResultsForCounts.set([
        { status_id: 5 } as any,
        { status_id: 5 } as any,
        { status_id: 3 } as any
      ]);

      expect(service.totalPendingCount()).toBe(2);
    });

    it('should return 0 when no pending results', () => {
      service.allResultsForCounts.set([]);
      expect(service.totalPendingCount()).toBe(0);
    });
  });

  describe('centerAcronymsWithResults computed', () => {
    it('should return set of unique lead_center values filtering out falsy', () => {
      service.allResultsForCounts.set([
        { lead_center: 'CIAT' } as any,
        { lead_center: 'IFPRI' } as any,
        { lead_center: 'CIAT' } as any,
        { lead_center: null } as any,
        { lead_center: '' } as any
      ]);

      const result = service.centerAcronymsWithResults();
      expect(result.size).toBe(2);
      expect(result.has('CIAT')).toBe(true);
      expect(result.has('IFPRI')).toBe(true);
    });
  });

  describe('centersToShowInSidebar computed', () => {
    it('should return all centers when withResults is empty (size === 0)', () => {
      const allCenters = [
        { code: 'C1', acronym: 'CIAT' } as any,
        { code: 'C2', acronym: 'IFPRI' } as any
      ];
      service.centers.set(allCenters);
      service.allResultsForCounts.set([]);

      const result = service.centersToShowInSidebar();
      expect(result).toEqual(allCenters);
    });

    it('should filter centers that have results when withResults is not empty', () => {
      const allCenters = [
        { code: 'C1', acronym: 'CIAT' } as any,
        { code: 'C2', acronym: 'IFPRI' } as any,
        { code: 'C3', acronym: 'ICRISAT' } as any
      ];
      service.centers.set(allCenters);
      service.allResultsForCounts.set([
        { lead_center: 'CIAT' } as any,
        { lead_center: 'IFPRI' } as any
      ]);

      const result = service.centersToShowInSidebar();
      expect(result.length).toBe(2);
      expect(result.map(c => c.acronym)).toEqual(['CIAT', 'IFPRI']);
    });
  });

  describe('selectCenter', () => {
    it('should set all center codes when centerCode is null', () => {
      service.centers.set([
        { code: 'C1', acronym: 'CIAT' } as any,
        { code: 'C2', acronym: 'IFPRI' } as any
      ]);

      service.selectCenter(null);
      expect(service.currentCenterSelected()).toEqual(['C1', 'C2']);
    });

    it('should set single center code when centerCode is not null', () => {
      service.selectCenter('C1');
      expect(service.currentCenterSelected()).toEqual(['C1']);
    });
  });

  describe('refreshAllResultsForCounts', () => {
    it('should return early when entityId is empty', () => {
      service.entityId.set('');
      service.centers.set([{ code: 'C1' } as any]);

      service.refreshAllResultsForCounts();
      expect(mockApiService.resultsSE.GET_ResultToReview).not.toHaveBeenCalled();
    });

    it('should return early when allCodes is empty', () => {
      service.entityId.set('entity1');
      service.centers.set([]);

      service.refreshAllResultsForCounts();
      expect(mockApiService.resultsSE.GET_ResultToReview).not.toHaveBeenCalled();
    });

    it('should call API and set allResultsForCounts when entityId and codes are present', () => {
      const mockGrouped = [
        {
          project_id: 'p1',
          project_name: 'Project 1',
          results: [
            { id: 'r1', status_id: 5, lead_center: 'CIAT' }
          ]
        }
      ];
      mockApiService.resultsSE.GET_ResultToReview.mockReturnValue(of({ response: mockGrouped }));

      service.entityId.set('entity1');
      service.centers.set([
        { code: 'C1' } as any,
        { code: 'C2' } as any
      ]);

      service.refreshAllResultsForCounts();

      expect(mockApiService.resultsSE.GET_ResultToReview).toHaveBeenCalledWith('entity1', ['C1', 'C2']);
      expect(service.allResultsForCounts().length).toBe(1);
      expect(service.allResultsForCounts()[0].id).toBe('r1');
    });

    it('should handle null response using nullish coalescing', () => {
      mockApiService.resultsSE.GET_ResultToReview.mockReturnValue(of({ response: null }));

      service.entityId.set('entity1');
      service.centers.set([{ code: 'C1' } as any]);

      service.refreshAllResultsForCounts();

      expect(service.allResultsForCounts()).toEqual([]);
    });

    it('should handle grouped results with missing results array', () => {
      const mockGrouped = [
        { project_id: 'p1', project_name: 'Project 1' }
      ];
      mockApiService.resultsSE.GET_ResultToReview.mockReturnValue(of({ response: mockGrouped }));

      service.entityId.set('entity1');
      service.centers.set([{ code: 'C1' } as any]);

      service.refreshAllResultsForCounts();

      expect(service.allResultsForCounts()).toEqual([]);
    });
  });

  describe('getEntityDetails', () => {
    it('should call API and set entity details', () => {
      service.entityId.set('entity1');
      service.getEntityDetails();

      expect(mockApiService.resultsSE.GET_ClarisaGlobalUnits).toHaveBeenCalledWith('entity1');
      expect(service.entityDetails()).toEqual({ name: 'Test' });
    });
  });

  describe('clearBilateralTableFilters', () => {
    it('should reset all filter signals to empty arrays', () => {
      service.selectedIndicatorCategories.set(['cat1']);
      service.selectedStatus.set(['stat1']);
      service.selectedLeadCenters.set(['center1']);

      service.clearBilateralTableFilters();

      expect(service.selectedIndicatorCategories()).toEqual([]);
      expect(service.selectedStatus()).toEqual([]);
      expect(service.selectedLeadCenters()).toEqual([]);
    });
  });
});
