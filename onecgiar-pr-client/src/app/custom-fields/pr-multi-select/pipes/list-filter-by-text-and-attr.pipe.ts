import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'listFilterByTextAndAttr'
})
export class ListFilterByTextAndAttrPipe implements PipeTransform {
  transform(list: any[], attr: string, word: string): any {
    if (!list?.length) return [];
    if (!word) return list;
    return list.filter(item => item?.isLabel || item[attr]?.toUpperCase().indexOf(word?.toUpperCase()) > -1);
  }
}
