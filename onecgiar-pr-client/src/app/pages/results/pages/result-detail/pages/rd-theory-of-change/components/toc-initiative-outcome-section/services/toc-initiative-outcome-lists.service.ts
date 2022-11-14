import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class TocInitiativeOutcomeListsService {
  outcomeLevelList = [];
  constructor(private api: ApiService) {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.api.tocApiSE.GET_AllTocLevels().subscribe(
      ({ response }) => {
        // console.log('%cOutcome level list', 'background: #222; color: #bada55');
        // console.log(response);
        this.outcomeLevelList = response;
        // this.allLevels =
      },
      err => {
        console.log(err);
      }
    );
  }
}
