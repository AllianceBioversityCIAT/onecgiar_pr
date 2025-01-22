import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({
  name: 'appFilterIndicatorResults',
  standalone: true
})
export class FilterIndicatorResultsPipe implements PipeTransform {
  transform(list, word: string) {
    if (!word) return list;

    if (!list?.length) return [];

    list.forEach(item => {
      item.joinAll = `${item?.result_code} ${item?.title}`;
    });

    return list.filter((item: any) => item?.joinAll?.toUpperCase().indexOf(word?.toUpperCase()) > -1);
  }
}
