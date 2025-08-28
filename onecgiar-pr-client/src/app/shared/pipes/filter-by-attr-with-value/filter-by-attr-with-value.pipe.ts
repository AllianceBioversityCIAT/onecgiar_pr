import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterByAttrWithValue',
    standalone: false
})
export class FilterByAttrWithValuePipe implements PipeTransform {
  transform(list, attr, value) {
    if (!value) return list;
    const resultList = list?.filter(item => String(item[attr])?.toUpperCase()?.indexOf(String(value)?.toUpperCase()) > -1);

    return resultList || [];
  }
}
