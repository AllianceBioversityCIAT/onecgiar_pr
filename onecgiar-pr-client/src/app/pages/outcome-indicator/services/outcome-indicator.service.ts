import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report/type-one-report.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../shared/enum/api.enum';

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
  allInitiatives = signal([]);
  phaseList = signal([]);

  searchText = signal<string>('');

  constructor(
    public api: ApiService,
    public typeOneReportSE: TypeOneReportService
  ) {}

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

  getEOIsData(isT1R: boolean = false) {
    this.loading.set(true);
    this.api.resultsSE.GET_contributionsToIndicatorsEOIS(isT1R ? this.typeOneReportSE.initiativeSelected : this.initiativeIdFilter).subscribe({
      next: ({ response }) => {
        this.eoisData = response
          ?.map(item => {
            if (item.indicators === null) {
              item.indicators = [];
            }
            return item;
          })
          .sort((a, b) => {
            return (a.toc_result_title || '').localeCompare(b.toc_result_title || '');
          });
        this.loading.set(false);
      },
      error: error => {
        console.error(error);
        this.loading.set(false);
      }
    });
  }

  getWorkPackagesData(isT1R: boolean = false) {
    this.loadingWPs.set(true);
    this.api.resultsSE.GET_contributionsToIndicatorsWPS(isT1R ? this.typeOneReportSE.initiativeSelected : this.initiativeIdFilter).subscribe({
      next: ({ response }) => {
        this.wpsData = response
          ?.map(item => {
            item.toc_results.sort((a, b) => {
              return (a.toc_result_title || '').localeCompare(b.toc_result_title || '');
            });

            item.toc_results.forEach(result => {
              if (result.indicators === null) {
                result.indicators = [];
              }
            });
            return item;
          })
          .sort((a, b) => {
            return (a.workpackage_short_name || '').localeCompare(b.workpackage_short_name || '');
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

  loadAllInitiatives() {
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives.set(response);
    });
  }

  getAllPhases() {
    this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.ALL).subscribe(({ response }) => {
      this.phaseList.set(response);
    });
  }
}
