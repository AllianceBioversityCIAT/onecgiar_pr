import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ResultsReviewTableComponent } from './results-review-table.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { BilateralResultsService } from '../../bilateral-results.service';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('ResultsReviewTableComponent', () => {
  let component: ResultsReviewTableComponent;
  let fixture: ComponentFixture<ResultsReviewTableComponent>;
  let apiMock: any;
  let service: BilateralResultsService;

  const result = (over: any = {}): any => ({
    id: '1',
    project_id: 'p',
    project_name: 'Project',
    result_code: 'RC-1',
    result_title: 'Title one',
    indicator_category: 'Cat A',
    status_name: 'Submitted',
    acronym: 'AC',
    toc_title: 'Toc title',
    indicator: 'Indicator one',
    submission_date: '2026-01-01',
    lead_center: 'CIAT',
    ...over
  });

  beforeEach(async () => {
    apiMock = {
      rolesSE: { isAdmin: false },
      dataControlSE: { myInitiativesList: [] },
      resultsSE: {
        GET_ResultToReview: jest.fn(() => of({ response: [] })),
        GET_ClarisaGlobalUnits: jest.fn(() => of({ response: { initiative: {} } }))
      }
    };

    await TestBed.configureTestingModule({
      imports: [ResultsReviewTableComponent],
      providers: [{ provide: ApiService, useValue: apiMock }]
    })
      .overrideComponent(ResultsReviewTableComponent, { set: { template: '', imports: [], styles: [] } })
      .compileComponents();

    fixture = TestBed.createComponent(ResultsReviewTableComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(BilateralResultsService);
    service.tableData.set([]);
    service.tableResults.set([]);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ------------------------------------------------------------ canReviewResults

  describe('canReviewResults', () => {
    it('is true for admins', () => {
      apiMock.rolesSE.isAdmin = true;
      expect(component.canReviewResults()).toBe(true);
    });

    it('is true when the user owns the entity', () => {
      apiMock.dataControlSE.myInitiativesList = [{ official_code: 'SP01' }];
      service.entityId.set('SP01');
      expect(component.canReviewResults()).toBe(true);
    });

    it('is false when the entity is not owned', () => {
      apiMock.dataControlSE.myInitiativesList = [{ official_code: 'SP99' }];
      service.entityId.set('SP01');
      expect(component.canReviewResults()).toBe(false);
    });

    it('is false when the initiatives list is missing', () => {
      apiMock.dataControlSE.myInitiativesList = null;
      expect(component.canReviewResults()).toBe(false);
    });
  });

  // ------------------------------------------------------------ filteredTableData

  describe('filteredTableData', () => {
    beforeEach(() => {
      service.tableData.set([
        { project_id: 'p1', project_name: 'Project 1', results: [result(), result({ id: '2', result_title: 'Other', result_code: 'RC-2', indicator_category: 'Cat B', status_name: 'Draft', lead_center: 'IRRI', toc_title: 'x', indicator: 'y' })] },
        { project_id: 'p2', project_name: 'Project 2', results: null as any }
      ]);
    });

    it('returns every group with results when there are no filters', () => {
      const data = component.filteredTableData();
      expect(data.length).toBe(1);
      expect(data[0].results.length).toBe(2);
    });

    it('matches the search text against the result code', () => {
      service.searchText.set('  RC-2 ');
      expect(component.filteredTableData()[0].results.length).toBe(1);
    });

    it('matches the search text against the title', () => {
      service.searchText.set('title one');
      expect(component.filteredTableData()[0].results[0].id).toBe('1');
    });

    it('matches the search text against the indicator category', () => {
      service.searchText.set('cat b');
      expect(component.filteredTableData()[0].results[0].id).toBe('2');
    });

    it('matches the search text against the toc title', () => {
      service.searchText.set('toc title');
      expect(component.filteredTableData()[0].results.length).toBe(1);
    });

    it('matches the search text against the indicator', () => {
      service.searchText.set('indicator one');
      expect(component.filteredTableData()[0].results.length).toBe(1);
    });

    it('drops groups when nothing matches', () => {
      service.searchText.set('zzzz');
      expect(component.filteredTableData()).toEqual([]);
    });

    it('tolerates results with null searchable fields', () => {
      service.tableData.set([
        { project_id: 'p', project_name: 'P', results: [result({ result_code: null, result_title: null, indicator_category: null, toc_title: null, indicator: null })] }
      ] as any);
      service.searchText.set('abc');
      expect(component.filteredTableData()).toEqual([]);
    });

    it('filters by indicator category', () => {
      service.selectedIndicatorCategories.set(['Cat A']);
      expect(component.filteredTableData()[0].results.length).toBe(1);
    });

    it('filters by status', () => {
      service.selectedStatus.set(['Draft']);
      expect(component.filteredTableData()[0].results[0].id).toBe('2');
    });

    it('filters by lead center', () => {
      service.selectedLeadCenters.set(['IRRI']);
      expect(component.filteredTableData()[0].results[0].id).toBe('2');
    });

    it('treats missing values as empty strings when filtering', () => {
      service.tableData.set([
        { project_id: 'p', project_name: 'P', results: [result({ indicator_category: undefined, status_name: undefined, lead_center: undefined })] }
      ] as any);
      service.selectedIndicatorCategories.set(['']);
      service.selectedStatus.set(['']);
      service.selectedLeadCenters.set(['']);
      expect(component.filteredTableData()[0].results.length).toBe(1);
    });
  });

  // ------------------------------------------------------------ getResultsToReview

  describe('getResultsToReview', () => {
    it('does nothing without an entity id', () => {
      service.entityId.set('');
      component.getResultsToReview(['C1']);
      expect(apiMock.resultsSE.GET_ResultToReview).not.toHaveBeenCalled();
    });

    it('stores the grouped and flattened results', () => {
      service.entityId.set('SP01');
      apiMock.resultsSE.GET_ResultToReview.mockReturnValue(
        of({ response: [{ project_id: 'p', project_name: 'P', results: [result()] }, { project_id: 'q', project_name: 'Q' }] })
      );
      component.getResultsToReview(['C1']);
      expect(service.tableData().length).toBe(2);
      expect(service.tableResults().length).toBe(1);
      expect(component.isLoading()).toBe(false);
    });

    it('handles a null response', () => {
      service.entityId.set('SP01');
      apiMock.resultsSE.GET_ResultToReview.mockReturnValue(of({ response: null }));
      component.getResultsToReview(['C1']);
      expect(service.tableData()).toEqual([]);
    });

    it('feeds the counters only when every center is selected', () => {
      service.entityId.set('SP01');
      service.centers.set([{ code: 'C1', acronym: 'C1' } as any]);
      apiMock.resultsSE.GET_ResultToReview.mockReturnValue(of({ response: [{ project_id: 'p', project_name: 'P', results: [result()] }] }));
      component.getResultsToReview(['C1']);
      expect(service.allResultsForCounts().length).toBe(1);
    });

    it('does not feed the counters for a partial center selection', () => {
      service.entityId.set('SP01');
      service.centers.set([{ code: 'C1' } as any, { code: 'C2' } as any]);
      service.allResultsForCounts.set([]);
      apiMock.resultsSE.GET_ResultToReview.mockReturnValue(of({ response: [{ project_id: 'p', project_name: 'P', results: [result()] }] }));
      component.getResultsToReview(['C1']);
      expect(service.allResultsForCounts()).toEqual([]);
    });
  });

  // ------------------------------------------------------------------- effects

  describe('center-selection effect', () => {
    it('fetches when centers are selected and always clears the table', () => {
      const spy = jest.spyOn(component, 'getResultsToReview');
      service.entityId.set('SP01');
      service.currentCenterSelected.set(['C1']);
      service.selectedStatus.set(['Draft']);
      fixture.detectChanges();
      expect(spy).toHaveBeenCalledWith(['C1']);
      expect(service.tableData()).toEqual([]);
      expect(service.selectedStatus()).toEqual([]);
    });

    it('does not fetch when no center is selected', () => {
      const spy = jest.spyOn(component, 'getResultsToReview');
      service.currentCenterSelected.set([]);
      fixture.detectChanges();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------ table API

  it('expandedRowKeys expands every visible group', () => {
    service.tableData.set([{ project_id: 'p', project_name: 'Project 1', results: [result()] }] as any);
    expect(component.expandedRowKeys()).toEqual({ 'Project 1': true });
  });

  it('reviewResult opens the drawer with the selected result', () => {
    const item = result();
    component.reviewResult(item);
    expect(service.currentResultToReview()).toBe(item);
    expect(service.showReviewDrawer()).toBe(true);
  });

  describe('onDecisionMade', () => {
    it('refreshes the table when centers are selected', () => {
      const spy = jest.spyOn(component, 'getResultsToReview').mockImplementation(() => undefined);
      const refreshSpy = jest.spyOn(service, 'refreshAllResultsForCounts').mockImplementation(() => undefined);
      service.currentCenterSelected.set(['C1']);
      component.onDecisionMade();
      expect(spy).toHaveBeenCalledWith(['C1']);
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('only refreshes the counters when no center is selected', () => {
      const spy = jest.spyOn(component, 'getResultsToReview').mockImplementation(() => undefined);
      const refreshSpy = jest.spyOn(service, 'refreshAllResultsForCounts').mockImplementation(() => undefined);
      service.currentCenterSelected.set([]);
      component.onDecisionMade();
      expect(spy).not.toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  it('ngOnDestroy clears the search text', () => {
    service.searchText.set('abc');
    component.ngOnDestroy();
    expect(service.searchText()).toBe('');
  });
});
