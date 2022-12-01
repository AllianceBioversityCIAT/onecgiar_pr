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
    return this.filterByResultLevelOptions(this.filterByInitsAndYear(this.filterByText(resultList, word)));
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

  filterByInitsAndYear(resultList: any[]) {
    const [submitter, reported_year] = this.resultsListFilterSE.filters.general;
    const resultsFilters = [];
    console.log();
    // if (this.resultsListFilterSE?.filters?.general?.length) {
    //   const preResultFilter = this.resultsListFilterSE.filters?.general[0]?.options?.find(filterItem => filterItem.name == 'Pre-2022 results');
    //   console.log(preResultFilter);
    //   // if (preResultFilter) return false;
    // }

    for (const option of submitter?.options) if (option?.selected === true && option?.cleanAll !== true) resultsFilters.push(option);
    if (!resultsFilters.length) return resultList;
    resultList = resultList.filter(result => {
      // console.log(result);
      for (const filter of resultsFilters) if (filter?.id == result?.submitter_id || (filter?.attr == 'is_legacy' && result.is_legacy)) return true;
      return false;
    });

    return resultList;
  }

  filterByResultLevelOptions(resultList: any[]) {
    const resultsFilters = [];
    this.resultsListFilterSE.filters.resultLevel.map((filter: any) => {
      for (const option of filter?.options) if (option?.selected === true) resultsFilters.push({ result_level_id: filter?.id, result_type_id: option?.id });
    });

    if (!resultsFilters.length) return resultList;
    resultList = resultList.filter(result => {
      for (const filter of resultsFilters) if (filter.result_level_id == result.result_level_id && filter.result_type_id == result.result_type_id) return true;
      return false;
    });

    return resultList;
  }
}
