import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'similarResults',
    standalone: false
})
export class SimilarResultsPipe implements PipeTransform {
  transform(list: any[], word: string): any {
    if (!list?.length) return [];
    if (!word) return [];
    return list.filter(item => item?.title?.toUpperCase().indexOf(word?.toUpperCase()) > -1);
  }
}
