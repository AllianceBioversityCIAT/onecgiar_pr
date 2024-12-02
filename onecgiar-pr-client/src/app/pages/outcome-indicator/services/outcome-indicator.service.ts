import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class OutcomeIndicatorService {
  eoisData: any = [];
  wpsData: any = [];
  initiativeIdFilter = '';
  loading = signal(false);
  loadingWPs = signal(false);
  expandedRows = {};

  searchText = signal<string>('');

  constructor(public api: ApiService) {}

  expandAll() {
    this.expandedRows = this.wpsData.reduce((acc, p) => {
      acc[p.workpackage_short_name] = true;
      return acc;
    }, {});
  }

  collapseAll() {
    this.expandedRows = {};
  }

  achievedStatus(expectedTarget: number | null, achievedTarget: number | null): boolean {
    if (expectedTarget === null || achievedTarget === null) {
      return false;
    }

    const achievedTargetValue = Number(achievedTarget);
    const expectedTargetValue = Number(expectedTarget);

    if (isNaN(achievedTargetValue) || isNaN(expectedTargetValue)) {
      return false;
    }

    return achievedTarget >= expectedTarget;
  }

  getEOIsData() {
    this.loading.set(true);
    this.api.resultsSE.GET_contributionsToIndicatorsEOIS(this.initiativeIdFilter).subscribe({
      next: res => {
        this.eoisData = res?.data.map(item => {
          if (item.indicators === null) {
            item.indicators = [];
          }
          return item;
        });
        this.loading.set(false);
      },
      error: error => {
        console.error(error);
        this.loading.set(false);
      }
    });
  }

  getWorkPackagesData() {
    this.loadingWPs.set(true);
    this.api.resultsSE.GET_contributionsToIndicatorsWPS(this.initiativeIdFilter).subscribe({
      next: res => {
        this.wpsData = res.data.map(item => {
          item.toc_results.sort((a, b) => {
            return (a.toc_result_title || '').localeCompare(b.toc_result_title || '');
          });

          item.toc_results.forEach(result => {
            if (result.indicators === null) {
              result.indicators = [];
            }
          });
          return item;
        });

        this.loadingWPs.set(false);
        this.expandAll();
      },
      error: error => {
        console.error(error);
        this.loadingWPs.set(false);
      }
    });
  }
}
