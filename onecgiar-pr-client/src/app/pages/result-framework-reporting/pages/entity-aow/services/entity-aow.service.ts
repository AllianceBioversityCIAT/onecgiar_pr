import { inject, Injectable, signal } from '@angular/core';
import { Initiative, Unit } from '../../entity-details/interfaces/entity-details.interface';
import { ApiService } from '../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class EntityAowService {
  private readonly api = inject(ApiService);
  entityId = signal<string>('');
  aowId = signal<string>('');

  entityDetails = signal<Initiative>({} as Initiative);
  entityAows = signal<Unit[]>([]);
  indicatorSummaries = signal<any[]>([]);
  isLoadingDetails = signal<boolean>(false);

  sideBarItems = signal<any[]>([]);

  tocResultsByAowId = signal<any[]>([]);
  isLoadingTocResultsByAowId = signal<boolean>(false);

  getAllDetailsData() {
    this.isLoadingDetails.set(true);

    import('rxjs').then(({ forkJoin }) => {
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
    });
  }

  getClarisaGlobalUnits() {
    this.isLoadingDetails.set(true);

    this.api.resultsSE.GET_ClarisaGlobalUnits(this.entityId()).subscribe(({ response }) => {
      this.entityDetails.set(response?.initiative);
      this.entityAows.set(response?.units ?? []);
      this.isLoadingDetails.set(false);
      if (this.entityAows().length) {
        this.setSideBarItems();
      }
    });
  }

  getIndicatorSummaries() {
    this.api.resultsSE.GET_IndicatorContributionSummary(this.entityId()).subscribe(({ response }) => {
      this.indicatorSummaries.set(response?.totalsByType ?? []);
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
          itemLink: `/aow/${aow.code}`
        }))
      }
    ]);
  }

  getTocResultsByAowId(entityId: string, aowId: string) {
    if (!entityId || !aowId) return;

    this.isLoadingTocResultsByAowId.set(true);

    this.api.resultsSE.GET_TocResultsByAowId(entityId, aowId).subscribe(({ response }) => {
      this.tocResultsByAowId.set(response?.tocResults ?? []);
      this.isLoadingTocResultsByAowId.set(false);
    });
  }
}
