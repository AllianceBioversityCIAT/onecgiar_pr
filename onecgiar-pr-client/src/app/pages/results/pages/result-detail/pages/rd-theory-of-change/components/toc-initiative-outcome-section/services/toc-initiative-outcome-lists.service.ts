import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class TocInitiativeOutcomeListsService {
  outcomeLevelList = [];
  constructor(private api: ApiService) {
    this.api.tocApiSE.GET_AllTocLevels().subscribe(
      ({ response }) => {
        console.log(response);
        this.outcomeLevelList = response;
      },
      err => {
        console.log(err);
      }
    );
  }
}
