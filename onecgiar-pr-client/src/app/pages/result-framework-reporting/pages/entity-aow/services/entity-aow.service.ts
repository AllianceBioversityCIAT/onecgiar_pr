import { computed, inject, Injectable, signal } from '@angular/core';
import { Initiative, Unit } from '../../entity-details/interfaces/entity-details.interface';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EntityAowService {
  private readonly api = inject(ApiService);

  entityId = signal<string>('');
  aowId = signal<string>('');

  currentAowSelected = computed(() => {
    return this.entityAows().find(item => item.code === this.aowId());
  });

  entityDetails = signal<Initiative>({} as Initiative);
  entityAows = signal<Unit[]>([]);
  indicatorSummaries = signal<any[]>([]);
  isLoadingDetails = signal<boolean>(false);
  w3BilateralProjects = signal<any[]>([]);
  selectedW3BilateralProjects = signal<any[]>([]);
  selectedEntities = signal<any[]>([]);
  sideBarItems = signal<any[]>([]);

  existingResultsContributors = signal<any[]>([]);

  tocResultsOutputsByAowId = signal<any[]>([]);
  tocResultsOutcomesByAowId = signal<any[]>([]);
  tocResults2030Outcomes = signal<any[]>([]);
  isLoadingTocResults2030Outcomes = signal<boolean>(false);
  isLoadingTocResultsByAowId = signal<boolean>(false);

  showReportResultModal = signal<boolean>(false);
  currentResultToReport = signal<any>({});

  // View result modal
  showViewResultDrawer = signal<boolean>(false);
  viewResultDrawerFullScreen = signal<boolean>(false);
  currentResultToView = signal<any>({});

  getAllDetailsData() {
    this.isLoadingDetails.set(true);

    forkJoin({
      clarisaGlobalUnits: this.api.resultsSE.GET_ClarisaGlobalUnits(this.entityId()),
      indicatorSummaries: this.api.resultsSE.GET_IndicatorContributionSummary(this.entityId())
    }).subscribe({
      next: ({ clarisaGlobalUnits, indicatorSummaries }) => {
        this.entityDetails.set(clarisaGlobalUnits?.response?.initiative);
        this.entityAows.set(clarisaGlobalUnits?.response?.units ?? []);

        this.indicatorSummaries.set(indicatorSummaries?.response?.totalsByType ?? []);

        if (this.entityAows().length) {
          this.setSideBarItems();
        }
        this.isLoadingDetails.set(false);
      },
      error: () => {
        this.isLoadingDetails.set(false);
      }
    });
  }

  setSideBarItems() {
    this.sideBarItems.set([
      {
        isTree: true,
        label: 'By AOW',
        isOpen: true,
        items: this.entityAows().map(aow => ({
          label: aow.code,
          name: aow.name,
          itemLink: `/aow/${aow.code}`
        }))
      },
      {
        isTree: false,
        label: '2030 Outcomes',
        itemLink: '/aow/2030-outcomes'
      }
    ]);
  }

  getTocResultsByAowId(entityId: string, aowId: string) {
    if (!entityId || !aowId) return;

    this.isLoadingTocResultsByAowId.set(true);

    this.api.resultsSE.GET_TocResultsByAowId(entityId, aowId).subscribe({
      next: ({ response }) => {
        this.tocResultsOutputsByAowId.set(response?.tocResultsOutputs ?? []);
        this.tocResultsOutcomesByAowId.set(response?.tocResultsOutcomes ?? []);
        this.isLoadingTocResultsByAowId.set(false);
      },
      error: err => {
        this.tocResultsOutputsByAowId.set([]);
        this.tocResultsOutcomesByAowId.set([]);
        this.isLoadingTocResultsByAowId.set(false);
      }
    });
  }

  get2030Outcomes(entityId: string) {
    if (!entityId) return;
    this.isLoadingTocResults2030Outcomes.set(true);

    this.api.resultsSE.GET_2030Outcomes(entityId).subscribe({
      next: ({ response }) => {
        this.tocResults2030Outcomes.set(response?.tocResults ?? []);
        this.isLoadingTocResults2030Outcomes.set(false);
      },
      error: err => {
        this.tocResults2030Outcomes.set([]);
        this.isLoadingTocResults2030Outcomes.set(false);
      }
    });
  }

  getW3BilateralProjects() {
    this.api.resultsSE.GET_W3BilateralProjects(this.currentResultToReport()?.toc_result_id).subscribe(response => {
      this.w3BilateralProjects.set(response?.response ?? []);
    });
  }

  getExistingResultsContributors() {
    this.api.resultsSE
      .GET_ExistingResultsContributors(this.currentResultToReport()?.toc_result_id, this.currentResultToReport()?.indicators[0].related_node_id)
      .subscribe({
        next: ({ response }) => {
          this.existingResultsContributors.set(response?.contributors ?? []);
        },
        error: err => {
          this.existingResultsContributors.set([]);
        }
      });
  }

  onCloseReportResultModal() {
    this.showReportResultModal.set(false);
    this.currentResultToReport.set({});
    this.w3BilateralProjects.set([]);
    this.selectedW3BilateralProjects.set([]);
    this.selectedEntities.set([]);
    this.existingResultsContributors.set([]);
  }
}
