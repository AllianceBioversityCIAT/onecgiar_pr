import { inject, Injectable, signal, computed } from '@angular/core';
import { CenterDto } from '../../../../shared/interfaces/center.dto';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultToReview } from './components/results-review-table/components/result-review-drawer/result-review-drawer.interfaces';

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

  tableResults = signal<ResultToReview[]>([]);

  allResultsForCounts = signal<ResultToReview[]>([]);

  pendingCountByAcronym = computed(() => {
    const results = this.allResultsForCounts();
    const pending = results.filter(r => r.status_name === 'Pending Review');
    const byAcronym: Record<string, number> = {};
    for (const r of pending) {
      const key = r.lead_center ?? '';
      if (key) byAcronym[key] = (byAcronym[key] ?? 0) + 1;
    }
    return byAcronym;
  });

  totalPendingCount = computed(() => {
    return this.allResultsForCounts().filter(r => r.status_name === 'Pending Review').length;
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
}
