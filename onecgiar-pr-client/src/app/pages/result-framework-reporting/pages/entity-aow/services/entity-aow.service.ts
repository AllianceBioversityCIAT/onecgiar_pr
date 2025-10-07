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
  isLoadingDetails = signal<boolean>(false);

  sideBarItems = signal<any[]>([
    {
      label: 'All indicators',
      itemLink: `/aow/all`
    },
    {
      label: 'Unplanned results',
      itemLink: `/aow/unplanned`
    }
  ]);

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

  setSideBarItems() {
    this.sideBarItems.set([
      {
        label: 'All indicators',
        itemLink: `/aow/all`
      },
      {
        label: 'Unplanned results',
        itemLink: `/aow/unplanned`
      },
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
}
