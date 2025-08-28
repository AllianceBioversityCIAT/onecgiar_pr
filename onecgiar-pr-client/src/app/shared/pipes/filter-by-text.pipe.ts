import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterByText',
    standalone: false
})
export class FilterByTextPipe implements PipeTransform {
  transform(list, word: string) {
    if (!word) return list;
    if (!list?.length) return [];
    return list.filter((item: any) => (Boolean(item?.full_name) ? item?.full_name.toUpperCase().indexOf(word?.toUpperCase()) > -1 : false));
  }
}
