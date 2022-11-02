import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterResultNotLinked'
})
export class FilterResultNotLinkedPipe implements PipeTransform {
  transform(list: any[], linkedList: any[], counter: number): any {
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
    return list;
  }
}

// , word: string
