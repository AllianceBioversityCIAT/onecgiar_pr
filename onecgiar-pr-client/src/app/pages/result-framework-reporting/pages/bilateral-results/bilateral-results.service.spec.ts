import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralResultsService } from './bilateral-results.service';

function result(partial: Record<string, any> = {}): any {
  return {
    id: '1',
    project_id: 'p1',
    project_name: 'Project 1',
    result_code: '100',
    result_title: 'Title',
    indicator_category: 'Innovation',
    status_name: 'Submitted',
    acronym: 'ABC',
    toc_title: 'ToC',
    indicator: 'IND',
    submission_date: '2026-01-01',
    ...partial
  };
}

describe('BilateralResultsService', () => {
  let service: BilateralResultsService;
  let GET_ClarisaGlobalUnits: jest.Mock;
  let GET_ResultToReview: jest.Mock;

  beforeEach(() => {
    GET_ClarisaGlobalUnits = jest.fn().mockReturnValue(of({ response: { initiative: { id: 9, name: 'Unit' } } }));
    GET_ResultToReview = jest.fn().mockReturnValue(of({ response: [] }));

    TestBed.configureTestingModule({
      providers: [BilateralResultsService, { provide: ApiService, useValue: { resultsSE: { GET_ClarisaGlobalUnits, GET_ResultToReview } } }]
    });

    service = TestBed.inject(BilateralResultsService);
  });

  it('is created with the seed table row', () => {
    expect(service).toBeTruthy();
    expect(service.tableData()).toHaveLength(1);
    expect(service.entityId()).toBe('');
    expect(service.showReviewDrawer()).toBe(false);
    expect(service.currentResultToReview()).toBeNull();
  });

  describe('filter option computeds', () => {
    it('are empty while there are no results', () => {
      expect(service.indicatorCategoryOptions()).toEqual([]);
      expect(service.statusOptions()).toEqual([]);
      expect(service.leadCenterOptions()).toEqual([]);
    });

    it('derive sorted unique values and drop the empty ones', () => {
      service.tableResults.set([
        result({ indicator_category: 'Policy', status_name: 'Editing', lead_center: 'CIAT' }),
        result({ indicator_category: 'Innovation', status_name: 'Submitted', lead_center: 'ABC' }),
        result({ indicator_category: 'Innovation', status_name: 'Submitted', lead_center: 'ABC' }),
        result({ indicator_category: '', status_name: null, lead_center: undefined })
      ]);

      expect(service.indicatorCategoryOptions()).toEqual(['Innovation', 'Policy']);
      expect(service.statusOptions()).toEqual(['Editing', 'Submitted']);
      expect(service.leadCenterOptions()).toEqual(['ABC', 'CIAT']);
    });
  });

  describe('pending counts', () => {
    it('are zero without results', () => {
      expect(service.pendingCountByAcronym()).toEqual({});
      expect(service.totalPendingCount()).toBe(0);
      expect(service.centerAcronymsWithResults().size).toBe(0);
    });

    it('counts only status 5 and groups by lead center', () => {
      service.allResultsForCounts.set([
        result({ status_id: 5, lead_center: 'CIAT' }),
        result({ status_id: 5, lead_center: 'CIAT' }),
        result({ status_id: 5, lead_center: 'IRRI' }),
        result({ status_id: 1, lead_center: 'IRRI' })
      ]);

      expect(service.pendingCountByAcronym()).toEqual({ CIAT: 2, IRRI: 1 });
      expect(service.totalPendingCount()).toBe(3);
      expect([...service.centerAcronymsWithResults()].sort()).toEqual(['CIAT', 'IRRI']);
    });

    it('skips pending results without a lead center', () => {
      service.allResultsForCounts.set([result({ status_id: 5, lead_center: null }), result({ status_id: 5, lead_center: '' })]);
      expect(service.pendingCountByAcronym()).toEqual({});
      expect(service.totalPendingCount()).toBe(2);
    });
  });

  describe('centersToShowInSidebar', () => {
    const centers = [
      { code: '1', acronym: 'CIAT', name: 'Ciat' },
      { code: '2', acronym: 'IRRI', name: 'Irri' }
    ] as any[];

    it('shows every center when no result carries a lead center', () => {
      service.centers.set(centers);
      expect(service.centersToShowInSidebar()).toEqual(centers);
    });

    it('narrows to the centers that actually have results', () => {
      service.centers.set(centers);
      service.allResultsForCounts.set([result({ lead_center: 'IRRI' })]);
      expect(service.centersToShowInSidebar()).toEqual([centers[1]]);
    });
  });

  describe('selectCenter', () => {
    it('selects every center code when given null', () => {
      service.centers.set([{ code: '1', acronym: 'A' }, { code: '2', acronym: 'B' }] as any[]);
      service.selectCenter(null);
      expect(service.currentCenterSelected()).toEqual(['1', '2']);
    });

    it('selects a single center code', () => {
      service.selectCenter('7');
      expect(service.currentCenterSelected()).toEqual(['7']);
    });
  });

  describe('getEntityDetails', () => {
    it('stores the initiative from the response', () => {
      service.entityId.set('55');
      service.getEntityDetails();
      expect(GET_ClarisaGlobalUnits).toHaveBeenCalledWith('55');
      expect(service.entityDetails()).toEqual({ id: 9, name: 'Unit' });
    });
  });

  describe('clearBilateralTableFilters', () => {
    it('empties the three filter signals', () => {
      service.selectedIndicatorCategories.set(['a']);
      service.selectedStatus.set(['b']);
      service.selectedLeadCenters.set(['c']);
      service.clearBilateralTableFilters();
      expect(service.selectedIndicatorCategories()).toEqual([]);
      expect(service.selectedStatus()).toEqual([]);
      expect(service.selectedLeadCenters()).toEqual([]);
    });
  });

  describe('refreshAllResultsForCounts', () => {
    it('does nothing without an entity id', () => {
      service.centers.set([{ code: '1', acronym: 'A' }] as any[]);
      service.refreshAllResultsForCounts();
      expect(GET_ResultToReview).not.toHaveBeenCalled();
    });

    it('does nothing without centers', () => {
      service.entityId.set('55');
      service.refreshAllResultsForCounts();
      expect(GET_ResultToReview).not.toHaveBeenCalled();
    });

    it('flattens the grouped results', () => {
      service.entityId.set('55');
      service.centers.set([{ code: '1', acronym: 'A' }, { code: '2', acronym: 'B' }] as any[]);
      GET_ResultToReview.mockReturnValue(
        of({
          response: [
            { project_id: 'p1', project_name: 'P1', results: [result({ id: 'a' }), result({ id: 'b' })] },
            { project_id: 'p2', project_name: 'P2', results: [result({ id: 'c' })] }
          ]
        })
      );

      service.refreshAllResultsForCounts();

      expect(GET_ResultToReview).toHaveBeenCalledWith('55', ['1', '2']);
      expect(service.allResultsForCounts().map(r => r.id)).toEqual(['a', 'b', 'c']);
    });

    it('tolerates a null response and groups without results', () => {
      service.entityId.set('55');
      service.centers.set([{ code: '1', acronym: 'A' }] as any[]);

      GET_ResultToReview.mockReturnValue(of({ response: null }));
      service.refreshAllResultsForCounts();
      expect(service.allResultsForCounts()).toEqual([]);

      GET_ResultToReview.mockReturnValue(of({ response: [{ project_id: 'p1', project_name: 'P1' }] }));
      service.refreshAllResultsForCounts();
      expect(service.allResultsForCounts()).toEqual([]);
    });

    it('leaves the previous counts untouched when the request fails', () => {
      service.entityId.set('55');
      service.centers.set([{ code: '1', acronym: 'A' }] as any[]);
      service.allResultsForCounts.set([result({ id: 'kept' })]);
      GET_ResultToReview.mockReturnValue(throwError(() => new Error('boom')));

      service.refreshAllResultsForCounts();

      expect(GET_ResultToReview).toHaveBeenCalled();
      expect(service.allResultsForCounts().map(r => r.id)).toEqual(['kept']);
    });
  });
});
