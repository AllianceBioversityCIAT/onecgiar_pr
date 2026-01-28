import { Injectable, computed, effect, inject, signal } from '@angular/core';
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
  private _tocResultListRaw = signal<any[]>([]);
  api = inject(ApiService);
  
  tocResultList = computed(() => {
    const list = this._tocResultListRaw();
    const currentResult = this.dataControlSE.currentResultSignal();
    
    if (currentResult && currentResult.result_type_id !== undefined && currentResult.result_type_id !== null) {
      const resultTypeId = currentResult.result_type_id;
      
      if (resultTypeId === 2) {
        return list.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3);
      }
        
      if (resultTypeId === 1) {
        return list.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3);
      }
      
      if (resultTypeId === 5) {
        return list.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3);
      }
    }
    
    return list;
  });
  
  onChangePortfolio = effect(() => {
    if (this.dataControlSE.currentResultSignal()?.portfolio !== undefined) {
      this.api.tocApiSE.GET_AllTocLevels(this.fieldsManagerSE.isP25()).subscribe({
        next: ({ response }) => {
          this._tocResultListRaw.set(response);
          this.outcomeLevelList = response.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3);
        },
        error: err => {
          console.error(err);
        }
      });
    }
  });
}
