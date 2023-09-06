import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'resultsToUpdateFilter'
})
export class ResultsToUpdateFilterPipe implements PipeTransform {
  transform(list, word: string) {
    if (!word) return list;
    if (!list?.length) return [];
    return list.filter((item: any) => (Boolean(item?.joinAll) ? item?.joinAll.toUpperCase().indexOf(word?.toUpperCase()) > -1 : false));
  }
}
