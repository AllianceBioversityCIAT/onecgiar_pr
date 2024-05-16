import { Injectable } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class ManageRipUnitTimeService {
  unitTimeList = [];
  constructor(private api: ApiService) {
    this.GETAllResultsInnovationPackageUnitTime();
  }

  GETAllResultsInnovationPackageUnitTime() {
    this.api.resultsSE.GETAllResultsInnovationPackageUnitTime().subscribe(({ response }) => {
      //(response);
      this.unitTimeList = response;
    });
  }
}
