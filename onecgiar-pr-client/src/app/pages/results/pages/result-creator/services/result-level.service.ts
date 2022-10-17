import { Injectable } from '@angular/core';
import { ResultLevel, Resulttype, ResultBody } from '../../../../../shared/interfaces/result';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { ResultsListService } from '../../results-outlet/pages/results-list/services/results-list.service';
import { ResultsListFilterService } from '../../results-outlet/pages/results-list/services/results-list-filter.service';

@Injectable({
  providedIn: 'root'
})
export class ResultLevelService {
  resultLevelList: ResultLevel[];
  currentResultTypeList: Resulttype[];
  resultBody = new ResultBody();
  constructor(private api: ApiService, private resultsListFilterSE: ResultsListFilterService) {
    this.GET_TypeByResultLevel();
  }

  onSelectResultLevel(resultLevel: ResultLevel) {
    this.resultBody.result_level_id = resultLevel.id;
    this.resultBody.result_type_id = null;
    this.currentResultTypeList = resultLevel.result_type;
    this.resultLevelList.map(reLevel => (reLevel.selected = false));
    resultLevel.selected = !resultLevel.selected;
  }
  cleanData() {
    this.resultBody = new ResultBody();
  }

  GET_TypeByResultLevel() {
    this.api.resultsSE.GET_TypeByResultLevel().subscribe(resp => {
      this.resultLevelList = resp.response;
      this.resultsListFilterSE.setFiltersByResultLevelTypes(this.resultLevelList);
    });
  }
}
