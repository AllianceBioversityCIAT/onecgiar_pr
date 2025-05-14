import { Pipe, PipeTransform } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';

@Pipe({
  name: 'filterResultNotLinked'
})
export class FilterResultNotLinkedPipe implements PipeTransform {
  constructor(private readonly api: ApiService) {}
  transform(list: any[], linkedList: any[], combine: boolean, counter: number, text_to_search: string): any {
    if (!list?.length) return [];

    list = list.filter(result => result.id != this.api.resultsSE.currentResultId);
    list.forEach(result => {
      result.selected = false;
    });
    linkedList.forEach(result => {
      const resultFinded = list.find(linked => linked.id == result.id);
      if (resultFinded) resultFinded.selected = true;
    });

    return this.convertList(this.filterByText(list, text_to_search), combine);
  }

  filterByText(resultList: any[], word: string) {
    if (!resultList?.length) return [];
    resultList.forEach(item => {
      item.joinAll = '';
      Object.keys(item).forEach(attr => {
        item.joinAll += (item[attr] ?? '') + ' ';
      });
    });

    return resultList.filter(item => item.joinAll.toUpperCase().indexOf(word?.toUpperCase()) > -1);
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
      resultMap[result.result_code] ??= {
        selected: result.selected,
        result_code: result.result_code,
        submitter: result.submitter,
        version_id: result.version_id,
        results: []
      };

      resultMap[result.result_code].results.push({
        ...result
      });
    });

    const transformedData = Object.values(resultMap);

    return transformedData;
  }
}
