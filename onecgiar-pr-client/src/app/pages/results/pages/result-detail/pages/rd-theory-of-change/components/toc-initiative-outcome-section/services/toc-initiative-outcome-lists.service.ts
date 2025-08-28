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
        this.outcomeLevelList = response;
      },
      error: err => {
        console.error(err);
      }
    });
  }
}
