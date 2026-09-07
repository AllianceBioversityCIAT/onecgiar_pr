// @akili-spec changes/sp-bilateral-review-tab (BRT-T-8 — trimmed dead centers-sidebar members)
import { inject, Injectable, signal, computed } from '@angular/core';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ResultToReview, GroupedResult } from '../components/result-review-drawer/result-review-drawer.interfaces';

/** Query param that deep-links a result's review drawer on the results-review screen. */
export const REVIEW_RESULT_QUERY_PARAM = 'reviewResult';

/**
 * Result id that goes with REVIEW_RESULT_QUERY_PARAM. Needed because a deep-linked
 * result may not be part of the review list (e.g. drafts still being edited), and the
 * drawer loads its detail by id.
 */
export const REVIEW_RESULT_ID_QUERY_PARAM = 'reviewResultId';

@Injectable({
  providedIn: 'root'
})
export class BilateralResultsService {
  api = inject(ApiService);

  entityId = signal<string>('');
  entityDetails = signal<any>({});
  searchText = signal<string>('');

  /** Table filters (client-side, no pagination) */
  selectedIndicatorCategories = signal<string[]>([]);
  selectedStatus = signal<string[]>([]);
  selectedLeadCenters = signal<string[]>([]);

  tableData = signal<GroupedResult[]>([
    {
      project_id: '',
      project_name: '',
      results: [
        {
          id: '',
          project_id: '',
          project_name: '',
          result_code: '',
          result_title: '',
          indicator_category: '',
          status_name: '',
          acronym: '',
          toc_title: '',
          indicator: '',
          submission_date: ''
        }
      ]
    }
  ]);

  /** Filter options derived from current table data */
  indicatorCategoryOptions = computed(() => {
    const results = this.tableResults();
    const set = new Set(results.map(r => r.indicator_category).filter((v): v is string => !!v));
    return [...set].sort((a, b) => a.localeCompare(b));
  });
  statusOptions = computed(() => {
    const results = this.tableResults();
    const set = new Set(results.map(r => r.status_name).filter((v): v is string => !!v));
    return [...set].sort((a, b) => a.localeCompare(b));
  });
  leadCenterOptions = computed(() => {
    const results = this.tableResults();
    const set = new Set(results.map(r => r.lead_center).filter((v): v is string => !!v));
    return [...set].sort((a, b) => a.localeCompare(b));
  });

  tableResults = signal<ResultToReview[]>([]);

  // Review result drawer
  showReviewDrawer = signal<boolean>(false);
  currentResultToReview = signal<any>(null);

  getEntityDetails() {
    this.api.resultsSE.GET_ClarisaGlobalUnits(this.entityId()).subscribe(res => {
      this.entityDetails.set(res.response.initiative);
    });
  }

  clearBilateralTableFilters(): void {
    this.selectedIndicatorCategories.set([]);
    this.selectedStatus.set([]);
    this.selectedLeadCenters.set([]);
  }
}
