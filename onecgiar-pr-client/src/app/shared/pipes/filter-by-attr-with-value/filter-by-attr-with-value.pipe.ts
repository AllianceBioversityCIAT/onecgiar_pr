import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByAttrWithValue'
})
export class FilterByAttrWithValuePipe implements PipeTransform {
  transform(list, attr, value) {
    if (!value) return list;
    console.log(attr);
    console.log(value);
    console.log(list);
    const resultList = list?.filter(item => item[attr].toUpperCase().indexOf(value?.toUpperCase()) > -1);
    console.log(resultList);

    if (!resultList?.length) return [];
    //(resultList);
    return resultList;
  }
}
