import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ResultsReviewTableComponent } from './results-review-table.component';
import { BilateralResultsService, REVIEW_RESULT_ID_QUERY_PARAM, REVIEW_RESULT_QUERY_PARAM } from '../../bilateral-results.service';
import { ResultToReview } from './components/result-review-drawer/result-review-drawer.interfaces';

describe('ResultsReviewTableComponent', () => {
  let component: ResultsReviewTableComponent;
  let fixture: ComponentFixture<ResultsReviewTableComponent>;
  let bilateralResultsService: BilateralResultsService;
  let navigateMock: jest.Mock;

  const buildResult = (result_code: string): ResultToReview =>
    ({
      id: `id-${result_code}`,
      project_id: 'p1',
      project_name: 'Project 1',
      result_code,
      result_title: `Result ${result_code}`,
      indicator_category: 'Innovation development',
      status_name: 'Submitted',
      acronym: 'ACR',
      toc_title: 'ToC',
      indicator: 'Indicator',
      submission_date: '2026-07-28'
    }) as ResultToReview;

  const setup = async (queryParams: Record<string, string> = {}) => {
    TestBed.resetTestingModule();
    navigateMock = jest.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [ResultsReviewTableComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        { provide: Router, useValue: { navigate: navigateMock } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsReviewTableComponent);
    component = fixture.componentInstance;
    bilateralResultsService = TestBed.inject(BilateralResultsService);
    bilateralResultsService.showReviewDrawer.set(false);
    bilateralResultsService.currentResultToReview.set(null);
    bilateralResultsService.tableResults.set([]);
    fixture.detectChanges();
  };

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  describe('deep-linked review result', () => {
    it('should open the review drawer for the result referenced in the query param once results load', async () => {
      await setup({ [REVIEW_RESULT_QUERY_PARAM]: 'R-123' });

      expect(bilateralResultsService.showReviewDrawer()).toBe(false);

      bilateralResultsService.tableResults.set([buildResult('R-999'), buildResult('R-123')]);
      fixture.detectChanges();

      expect(bilateralResultsService.showReviewDrawer()).toBe(true);
      expect(bilateralResultsService.currentResultToReview()?.result_code).toBe('R-123');
    });

    it('should clear the query param after opening the drawer', async () => {
      await setup({ [REVIEW_RESULT_QUERY_PARAM]: 'R-123' });

      bilateralResultsService.tableResults.set([buildResult('R-123')]);
      fixture.detectChanges();

      expect(navigateMock).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { [REVIEW_RESULT_QUERY_PARAM]: null, [REVIEW_RESULT_ID_QUERY_PARAM]: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        })
      );
    });

    it('should not open the drawer when the referenced result is not in the loaded list and no id is given', async () => {
      await setup({ [REVIEW_RESULT_QUERY_PARAM]: 'R-404' });

      bilateralResultsService.tableResults.set([buildResult('R-123')]);
      fixture.detectChanges();

      expect(bilateralResultsService.showReviewDrawer()).toBe(false);
      expect(bilateralResultsService.currentResultToReview()).toBeNull();
    });

    it('should fall back to the id when the result is not in the review list (drafts being edited)', async () => {
      await setup({ [REVIEW_RESULT_QUERY_PARAM]: 'R-404', [REVIEW_RESULT_ID_QUERY_PARAM]: '99' });

      bilateralResultsService.tableResults.set([buildResult('R-123')]);
      fixture.detectChanges();

      expect(bilateralResultsService.showReviewDrawer()).toBe(true);
      expect(bilateralResultsService.currentResultToReview()).toEqual({ id: '99', result_code: 'R-404' });
    });

    it('should prefer the object from the list over the id fallback', async () => {
      await setup({ [REVIEW_RESULT_QUERY_PARAM]: 'R-123', [REVIEW_RESULT_ID_QUERY_PARAM]: '99' });

      bilateralResultsService.tableResults.set([buildResult('R-123')]);
      fixture.detectChanges();

      expect(bilateralResultsService.currentResultToReview()?.id).toBe('id-R-123');
    });

    it('should do nothing when there is no query param', async () => {
      await setup();

      bilateralResultsService.tableResults.set([buildResult('R-123')]);
      fixture.detectChanges();

      expect(bilateralResultsService.showReviewDrawer()).toBe(false);
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });
});
