import { Pipe, PipeTransform } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';

@Pipe({
  name: 'filterResultNotLinked'
})
export class FilterResultNotLinkedPipe implements PipeTransform {
  constructor(private api: ApiService) {}
  transform(list: any[], linkedList: any[], counter: number, text_to_search: string): any {
    if (!list?.length) return [];
    list = list.filter(result => result.id != this.api.resultsSE.currentResultId);
    list.map(result => {
      result.selected = false;
    });
    linkedList.map(result => {
      const resultFinded = list.find(linked => linked.id == result.id);
      if (resultFinded) resultFinded.selected = true;
    });
    return this.combineRepeatedResults(this.filterByText(list, text_to_search));
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
  combineRepeatedResults(results) {
    // console.log('combineRepeatedResults');
    const resultMap: Record<number, any> = {};

    results.forEach(result => {
      if (!resultMap[result.result_code]) {
        resultMap[result.result_code] = {
          selected: result.selected,
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
    // console.log(transformedData);

    return transformedData;

    // teniendo los resultados anteriores necesito combinar los resultados iguales segun el result_code dejar un objeto con title y result_code pero dentro un array con la demas informacion de los resultados repetidos
  }
}

// , word: string
