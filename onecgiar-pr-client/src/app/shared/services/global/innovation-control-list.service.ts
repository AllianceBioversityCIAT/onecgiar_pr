import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class InnovationControlListService {
  typeList = [];
  characteristicsList = [];
  readinessLevelsList = [];
  constructor(private api: ApiService) {
    this.GET_clarisaInnovationType();
    this.GET_clarisaInnovationCharacteristics();
    this.GET_clarisaInnovationReadinessLevels();
  }
  GET_clarisaInnovationType() {
    this.api.resultsSE.GET_clarisaInnovationType().subscribe(({ response }) => {
      //(response);
      this.typeList = response;
    });
  }
  GET_clarisaInnovationCharacteristics() {
    this.api.resultsSE.GET_clarisaInnovationCharacteristics().subscribe(({ response }) => {
      //(response);
      this.characteristicsList = response;
    });
  }
  GET_clarisaInnovationReadinessLevels() {
    this.api.resultsSE.GET_clarisaInnovationReadinessLevels().subscribe(({ response }) => {
      //(response);
      this.readinessLevelsList = response;
    });
  }
}
