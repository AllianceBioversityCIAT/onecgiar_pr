import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { FieldsManagerService } from '../../../../../../../../../shared/services/fields-manager.service';

@Injectable({
  providedIn: 'root'
})
export class TocInitiativeOutcomeListsService {
  outcomeLevelList = [];
  fieldsManagerSE = inject(FieldsManagerService);
  constructor(private api: ApiService) {
    this.api.tocApiSE.GET_AllTocLevels(this.fieldsManagerSE.isP25()).subscribe({
      next: ({ response }) => {
        this.outcomeLevelList = response.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3);
      },
      error: err => {
        console.error(err);
      }
    });
  }
}
