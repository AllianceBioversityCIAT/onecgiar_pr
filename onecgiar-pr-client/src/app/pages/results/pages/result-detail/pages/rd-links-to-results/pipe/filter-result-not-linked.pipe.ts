import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterResultNotLinked'
})
export class FilterResultNotLinkedPipe implements PipeTransform {
  transform(list: any[], linkedList: any[], counter: number, text_to_search: string): any {
    // console.log(linkedList);
    // console.log(linkedList);
    if (!list?.length) return [];
    list.map(result => {
      result.selected = false;
    });
    linkedList.map(result => {
      let resultFinded = list.find(linked => linked.id == result.id);
      if (resultFinded) resultFinded.selected = true;
      // console.log(resultFinded);
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
