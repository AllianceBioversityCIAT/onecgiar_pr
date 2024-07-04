import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class TocInitiativeOutcomeListsService {
  outcomeLevelList = [];
  constructor(private api: ApiService) {
    this.api.tocApiSE.GET_AllTocLevels().subscribe({
      next: ({ response }) => {
        this.outcomeLevelList = response.filter(item => item.toc_level_id === 2 || item.toc_level_id === 3 || item.toc_level_id === 4);
      },
      error: err => {
        console.error(err);
      }
    });
  }
}
