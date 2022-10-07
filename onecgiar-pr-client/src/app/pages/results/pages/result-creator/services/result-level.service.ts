import { Injectable } from '@angular/core';
import { ResultLevel, Resulttype } from '../../../../../shared/interfaces/result';
import { ApiService } from '../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class ResultLevelService {
  resultLevelList: ResultLevel[];
  resultTypeList: Resulttype[];

  constructor(private api: ApiService) {
    this.getAllResultLevel();
  }

  onSelectResultLevel(resultLevel: ResultLevel) {
    this.resultTypeList = resultLevel.result_type;
  }

  getAllResultLevel() {
    this.api.resultsSV.getAllResultLevel().subscribe(resp => {
      this.resultLevelList = resp.response;
      console.log(this.resultLevelList);
    });
  }
}
