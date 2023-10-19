import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByAttrWithValue'
})
export class FilterByAttrWithValuePipe implements PipeTransform {
  transform(list: any[], attr: string, value: string): any[] {
    if (!value || !list?.length) {
      return list;
    }

    const resultList = list.filter(item => {
      return item[attr];
    });

    return resultList || [];
  }
}
