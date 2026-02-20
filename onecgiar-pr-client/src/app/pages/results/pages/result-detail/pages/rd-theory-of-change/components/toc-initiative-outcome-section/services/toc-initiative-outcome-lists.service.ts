import { Injectable, effect, inject, signal } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { FieldsManagerService } from '../../../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../../../shared/services/data-control.service';

@Injectable({
  providedIn: 'root'
})
export class TocInitiativeOutcomeListsService {
  outcomeLevelList = [];
  fieldsManagerSE = inject(FieldsManagerService);
  dataControlSE = inject(DataControlService);
  api = inject(ApiService);
  tocResultList = signal<any[]>([]);

  onChangePortfolio = effect(() => {
    if (this.dataControlSE.currentResultSignal()?.portfolio !== undefined) {
      this.api.tocApiSE.GET_AllTocLevels(this.fieldsManagerSE.isP25()).subscribe({
        next: ({ response }) => {
          this.tocResultList.set(response);
          this.outcomeLevelList = response.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3);
        },
        error: err => {
          console.error(err);
        }
      });
    }
  });
}
