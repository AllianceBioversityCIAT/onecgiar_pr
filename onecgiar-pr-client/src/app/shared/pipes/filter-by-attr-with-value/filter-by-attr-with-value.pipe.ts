import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByAttrWithValue'
})
export class FilterByAttrWithValuePipe implements PipeTransform {
  transform(list, attr, value) {
    if (!value) return list;

    const resultList = list?.filter(item => item[attr].toUpperCase().indexOf(value?.toUpperCase()) > -1);

    if (!resultList?.length) return [];

    return resultList;
  }
}
