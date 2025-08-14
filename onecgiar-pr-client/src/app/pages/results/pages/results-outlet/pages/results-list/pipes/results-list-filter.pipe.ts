import { Pipe, PipeTransform } from '@angular/core';
import { ResultsListFilterService } from '../services/results-list-filter.service';

@Pipe({
    name: 'resultsListFilter',
    standalone: false
})
export class ResultsListFilterPipe implements PipeTransform {
  list: any[];
  word: string;
  constructor(private readonly resultsListFilterSE: ResultsListFilterService) {}
  transform(resultList: any[], word: string, combine: boolean, filterJoin: number): any {
    return this.convertList(this.filterByPhase(this.filterByResultLevelOptions(this.filterByInitsAndYear(this.filterByText(resultList, word)))), combine);
  }

  filterByText(resultList: any[], word: string) {
    if (!resultList?.length) return [];
    resultList.forEach(item => {
      item.joinAll = '';
      Object.keys(item).forEach(attr => {
        if (attr != 'created_date' && attr != 'id') item.joinAll += (item[attr] ? item[attr] : '') + ' ';
      });
    });
    return resultList.filter(item => item.joinAll.toUpperCase().indexOf(word?.toUpperCase()) > -1);
  }

  filterByInitsAndYear(resultList: any[]) {
    const [submitter] = this.resultsListFilterSE.filters.general;
    const resultsFilters = [];

    for (const option of submitter?.options) if (option?.selected === true && option?.cleanAll !== true) resultsFilters.push(option);
    if (!resultsFilters.length) return resultList;
    resultList = resultList.filter(result => {
      for (const filter of resultsFilters) if (filter?.id == result?.submitter_id || (filter?.attr == 'is_legacy' && result.legacy_id)) return true;
      return false;
    });

    return resultList;
  }

  filterByPhase(resultList: any[]) {
    const [submitter, phase] = this.resultsListFilterSE.filters.general;
    const resultsFilters = [];

    for (const option of phase?.options) if (option?.selected === true && option?.cleanAll !== true) resultsFilters.push(option);
    if (!resultsFilters.length) return resultList;
    resultList = resultList.filter(result => {
      for (const filter of resultsFilters) if (filter?.attr == result?.phase_name) return true;
      return false;
    });

    return resultList;
  }

  filterByResultLevelOptions(resultList: any[]) {
    const resultsFilters = [];
    this.resultsListFilterSE.filters.resultLevel.forEach((filter: any) => {
      for (const option of filter?.options) if (option?.selected === true) resultsFilters.push({ result_level_id: filter?.id, result_type_id: option?.id });
    });

    if (!resultsFilters.length) return resultList;
    resultList = resultList.filter(result => {
      for (const filter of resultsFilters) if (filter.result_level_id == result.result_level_id && filter.result_type_id == result.result_type_id) return true;
      return false;
    });

    return resultList;
  }

  convertList(results, combine) {
    return combine ? this.combineRepeatedResults(results) : this.separateResultInList(results);
  }

  separateResultInList(results) {
    results.forEach(result => {
      result.results = [result];
    });
    return results;
  }

  combineRepeatedResults(results) {
    const resultMap: Record<number, any> = {};

    results.forEach(result => {
      if (!resultMap[result.result_code]) {
        resultMap[result.result_code] = {
          result_code: result.result_code,
          submitter: result.submitter,
          results: []
        };
      }
      resultMap[result.result_code].results.push({
        ...result
      });
    });

    const transformedData = Object.values(resultMap);

    return transformedData;
  }
}
