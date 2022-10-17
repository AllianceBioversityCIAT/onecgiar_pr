import { Pipe, PipeTransform } from '@angular/core';
import { ResultsListFilterService } from '../services/results-list-filter.service';

@Pipe({
  name: 'resultsListFilter'
})
export class ResultsListFilterPipe implements PipeTransform {
  list: any[];
  word: string;
  constructor(private resultsListFilterSE: ResultsListFilterService) {}
  transform(resultList: any[], word: string, filterJoin: number): any {
    // console.log(resultList);
    return this.filterByResultLevelOptions(this.filterByText(resultList, word));
  }

  filterByText(resultList: any[], word: string) {
    if (!resultList?.length) return [];
    resultList.map(item => {
      item.joinAll = '';
      Object.keys(item).map(attr => {
        item.joinAll += (item[attr] ? item[attr] : '') + ' ';
      });
    });
    return resultList.filter(item => item.joinAll.toUpperCase().indexOf(word?.toUpperCase()) > -1);
  }

  filterByResultLevelOptions(resultList: any[]) {
    console.log(this.resultsListFilterSE.filters.resultLevel);
    const resultsFilters = [];
    this.resultsListFilterSE.filters.resultLevel.map((filter: any) => {
      for (const option of filter?.options) {
        if (option?.selected === true) resultsFilters.push({ result_level_id: filter?.id, result_type_id: option?.id });
      }
    });

    console.log(resultsFilters);
    if (!resultsFilters.length) return resultList;
    resultList = resultList.filter(result => {
      for (const filter of resultsFilters) {
        if (filter.result_level_id == result.result_level_id && filter.result_type_id == result.result_type_id) return true;
      }
      return false;
    });

    return resultList;
  }
}
