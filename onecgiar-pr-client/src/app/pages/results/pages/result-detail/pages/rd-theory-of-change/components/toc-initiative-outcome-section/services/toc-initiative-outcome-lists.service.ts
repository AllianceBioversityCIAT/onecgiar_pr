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
  tocResultList = signal<any[]>([]);
  api = inject(ApiService);
  onChangePortfolio = effect(() => {
    console.log(this.dataControlSE.currentResultSignal()?.portfolio);
    if (this.dataControlSE.currentResultSignal()?.portfolio !== undefined) {
      console.log('get toc result list');

      this.api.tocApiSE.GET_AllTocLevels(this.fieldsManagerSE.isP25()).subscribe({
        next: ({ response }) => {
          console.log(response);
          this.tocResultList.set(response);
          this.outcomeLevelList = response.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3);
          console.log(this.outcomeLevelList);
        },
        error: err => {
          console.error(err);
        }
      });
    }
  });
}
