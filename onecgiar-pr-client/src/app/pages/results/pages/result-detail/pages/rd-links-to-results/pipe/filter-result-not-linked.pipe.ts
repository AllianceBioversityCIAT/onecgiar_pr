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
      let resultFinded = list.find(linked => linked.id == result.id);
      if (resultFinded) resultFinded.selected = true;
    });
    return this.filterByText(list, text_to_search);
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
}

// , word: string
