import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByText'
})
export class FilterByTextPipe implements PipeTransform {
  transform(list, word: string) {
    // console.log(list);
    if (!list?.length) return [];
    return list.filter(item => item.full_name.toUpperCase().indexOf(word?.toUpperCase()) > -1);
  }
}
