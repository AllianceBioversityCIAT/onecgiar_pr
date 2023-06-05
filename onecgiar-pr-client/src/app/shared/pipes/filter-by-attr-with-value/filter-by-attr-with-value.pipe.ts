import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByAttrWithValue'
})
export class FilterByAttrWithValuePipe implements PipeTransform {
  transform(list, attr, value) {
    if (value === null) return list;
    const resultList = list.filter(item => item[attr] == value);
    if (!resultList?.length) return [];
    //(resultList);
    return resultList;
  }
}
