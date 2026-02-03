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

  // View result drawer
  showViewResultDrawer = signal<boolean>(false);
  viewResultDrawerFullScreen = signal<boolean>(false);
  currentResultToView = signal<any>({});

  // Target details drawer
  showTargetDetailsDrawer = signal<boolean>(false);
  targetDetailsDrawerFullScreen = signal<boolean>(false);
  currentTargetToView = signal<any>({});

  dashboardData = signal<any>(null);

  canReportResults = computed(() => {
    if (this.api.rolesSE.isAdmin) {
      return true;
    }
    const myInitiativesList = this.api.dataControlSE.myInitiativesList || [];
    const found = myInitiativesList.find(item => item.official_code === this.entityId());
    return !!found;
  });

  private isSgp02(entityId: string): boolean {
    return entityId === 'SGP-02' || entityId === 'SGP02';
  }

  private getSgp02InitiativeFromList(entityId: string): Initiative | null {
    const list =
      this.api.dataControlSE.myInitiativesListReportingByPortfolio ??
      this.api.dataControlSE.myInitiativesList ??
      [];
    const item = list.find(
      (x: { official_code?: string }) => x?.official_code === 'SGP-02' || x?.official_code === 'SGP02'
    );
    if (!item) return null;
    const raw = item as { id?: number; initiative_id?: number; official_code?: string; name?: string; initiative_name?: string; short_name?: string; shortName?: string };
    return {
      id: raw.id ?? raw.initiative_id ?? 0,
      officialCode: raw.official_code ?? entityId,
      name: raw.name ?? raw.initiative_name ?? raw.short_name ?? raw.shortName ?? '',
      shortName: raw.short_name ?? raw.shortName ?? raw.name ?? ''
    };
  }

  private fetchSgp02InitiativeFromSciencePrograms(entityId: string): void {
    this.api.resultsSE.GET_ScienceProgramsProgress().subscribe({
      next: ({ response }) => {
        const my = response?.mySciencePrograms ?? [];
        const other = response?.otherSciencePrograms ?? [];
        const item = [...my, ...other].find(
          (x: { initiativeCode?: string }) => x?.initiativeCode === 'SGP-02' || x?.initiativeCode === 'SGP02'
        );
        if (!item) return;
        const raw = item as { initiativeId?: number; initiativeCode?: string; initiativeName?: string; initiativeShortName?: string };
        this.entityDetails.set({
          id: raw.initiativeId ?? 0,
          officialCode: raw.initiativeCode ?? entityId,
          name: raw.initiativeName ?? '',
          shortName: raw.initiativeShortName ?? raw.initiativeName ?? ''
        });
      }
    });
  }

  getAllDetailsData(entityId?: string) {
    const id = entityId ?? this.entityId();
    if (!id) {
      this.isLoadingDetails.set(false);
      return;
    }
    this.isLoadingDetails.set(true);

    if (this.isSgp02(id)) {
      this.api.resultsSE.GET_IndicatorContributionSummary(id).subscribe({
        next: ({ response }) => {
          let initiative = this.getSgp02InitiativeFromList(id);
          if (initiative) {
            this.entityDetails.set(initiative);
          } else {
            this.entityDetails.set({} as Initiative);
            this.fetchSgp02InitiativeFromSciencePrograms(id);
          }
          this.entityAows.set([]);
          this.indicatorSummaries.set(response?.totalsByType ?? []);
          this.isLoadingDetails.set(false);
        },
        error: () => {
          this.indicatorSummaries.set([]);
          this.isLoadingDetails.set(false);
        }
      });
      return;
    }

    forkJoin({
      clarisaGlobalUnits: this.api.resultsSE.GET_ClarisaGlobalUnits(id),
      indicatorSummaries: this.api.resultsSE.GET_IndicatorContributionSummary(id)
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

  getExistingResultsContributors(tocResultId: string, relatedNodeId: string) {
    this.api.resultsSE.GET_ExistingResultsContributors(tocResultId, relatedNodeId).subscribe({
      next: ({ response }) => {
        this.existingResultsContributors.set(response?.contributors ?? []);
      },
      error: err => {
        this.existingResultsContributors.set([]);
      }
    });
  }

  getDashboardData() {
    this.api.resultsSE.GET_DashboardData(this.entityId()).subscribe({
      next: ({ response }) => {
        this.dashboardData.set(response);
      },
      error: err => {
        this.dashboardData.set(null);
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

  resetDashboardData() {
    this.dashboardData.set(null);
    this.entityDetails.set({} as Initiative);
    this.entityAows.set([]);
    this.indicatorSummaries.set([]);
  }
}
