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
  
  // Computed signal that automatically filters based on result_type_id from currentResultSignal
  // This allows filtering from result-review-drawer without modifying WPS components
  tocResultList = computed(() => {
    const list = this._tocResultListRaw();
    const currentResult = this.dataControlSE.currentResultSignal();
    
    // Filter by result_type_id when set (for Innovation Use, Policy, App Sharing)
    // This filtering is controlled from result-review-drawer by setting result_type_id in currentResultSignal
    if (currentResult && currentResult.result_type_id !== undefined && currentResult.result_type_id !== null) {
      const resultTypeId = currentResult.result_type_id;
      
      // Innovation Use (result_type_id = 2): only levels 2 and 3 (Intermediate Outcome and 2030 Outcome)
      if (resultTypeId === 2) {
        return list.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3);
      }
      
      // Policy (result_type_id = 1): only levels 2 and 3
      if (resultTypeId === 1) {
        return list.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3);
      }
      
      // App Sharing (result_type_id = 5): only levels 2 and 3
      if (resultTypeId === 5) {
        return list.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3);
      }
    }
    
    // Return unfiltered list if no result_type_id filter applies
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
