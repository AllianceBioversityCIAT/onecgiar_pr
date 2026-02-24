import { inject, Injectable, signal, computed } from '@angular/core';
import { CenterDto } from '../../../../shared/interfaces/center.dto';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultToReview, GroupedResult } from './components/results-review-table/components/result-review-drawer/result-review-drawer.interfaces';

@Injectable({
  providedIn: 'root'
})
export class BilateralResultsService {
  api = inject(ApiService);

  entityId = signal<string>('');
  entityDetails = signal<any>({});
  centers = signal<CenterDto[]>([]);
  currentCenterSelected = signal<string[]>([]);
  searchText = signal<string>('');
  selectedCenterCode = signal<string | null>(null);

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

  allResultsForCounts = signal<ResultToReview[]>([]);

  pendingCountByAcronym = computed(() => {
    const results = this.allResultsForCounts();
    const pending = results.filter(r => r.status_id == 5);
    const byAcronym: Record<string, number> = {};
    for (const r of pending) {
      const key = r.lead_center ?? '';
      if (key) byAcronym[key] = (byAcronym[key] ?? 0) + 1;
    }
    return byAcronym;
  });

  totalPendingCount = computed(() => {
    return this.allResultsForCounts().filter(r => r.status_id == 5).length;
  });

  centerAcronymsWithResults = computed(() => {
    const results = this.allResultsForCounts();
    const set = new Set(results.map(r => r.lead_center).filter((ac): ac is string => !!ac));
    return set;
  });

  centersToShowInSidebar = computed(() => {
    const all = this.centers();
    const withResults = this.centerAcronymsWithResults();
    if (withResults.size === 0) return all;
    return all.filter(c => withResults.has(c.acronym));
  });

  // Review result drawer
  showReviewDrawer = signal<boolean>(false);
  currentResultToReview = signal<any>(null);

  selectCenter(centerCode: string | null): void {
    if (centerCode === null) {
      this.currentCenterSelected.set(this.centers().map(center => center.code));
    } else {
      this.currentCenterSelected.set([centerCode]);
    }
  }

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

  refreshAllResultsForCounts(): void {
    const entityId = this.entityId();
    const allCodes = this.centers().map(c => c.code);
    if (!entityId || allCodes.length === 0) return;
    this.api.resultsSE.GET_ResultToReview(entityId, allCodes).subscribe(res => {
      const grouped = (res.response ?? []) as GroupedResult[];
      const flat = grouped.flatMap(g => g.results ?? []);
      this.allResultsForCounts.set(flat);
    });
  }
}
