import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class ImpactAreasService {
  impactAreaIndicators = [];
  impactArea = [];
  globalTarget = [];
  constructor(private api: ApiService) {
    this.getLists();
  }

  private getLists() {
    this.api.resultsSE.GET_AllClarisaImpactAreaIndicators().subscribe(({ response }) => {
      //(response);
      this.impactAreaIndicators = response;
    });

    this.api.resultsSE.GET_AllLarisaImpactArea().subscribe(({ response }) => {
      //(response);
      this.impactArea = response;
    });

    this.api.resultsSE.GET_AllglobalTarget().subscribe(({ response }) => {
      //(response);
      this.globalTarget = response;
    });
  }
}
