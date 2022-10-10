import { Pipe, PipeTransform } from '@angular/core';
import { ResultsListFilterService } from '../services/results-list-filter.service';

@Pipe({
  name: 'resultsListFilter'
})
export class ResultsListFilterPipe implements PipeTransform {
  list: any[];
  word: string;
  constructor(private resultsListFilterSE: ResultsListFilterService) {}
  transform(list: any[], word: string, filterJoin: string): any {
    this.word = word;
    return this.filterByOptions(this.filterByText(list));
  }

  filterByText(list: any[]) {
    if (!list?.length) return [];
    list.map(item => {
      item.joinAll = '';
      Object.keys(item).map(attr => {
        item.joinAll += (item[attr] ? item[attr] : '') + ' ';
      });
    });
    return list.filter(item => item.joinAll.toUpperCase().indexOf(this.word?.toUpperCase()) > -1);
  }
  filterByOptions(list: any[]) {
    if (!this.resultsListFilterSE?.filtersPipe?.length) return list;
    return list.filter(item => {
      for (const filter of this.resultsListFilterSE.filtersPipe) {
        if (!filter?.options) return false;
        for (const option of filter?.options) {
          if (item[filter.attr] == option) return true;
        }
      }
      return false;
    });
  }
}
