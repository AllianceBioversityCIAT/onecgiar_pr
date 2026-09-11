import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../../../shared/services/api/api.service';
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
});
