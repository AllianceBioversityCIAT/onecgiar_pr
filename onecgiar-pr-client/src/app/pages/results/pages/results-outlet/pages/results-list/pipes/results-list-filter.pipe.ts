import { Pipe, PipeTransform } from '@angular/core';
import { ResultsListFilterService } from '../services/results-list-filter.service';

@Pipe({
  name: 'resultsListFilter'
})
export class ResultsListFilterPipe implements PipeTransform {
  list: any[];
  word: string;
  constructor(private resultsListFilterSE: ResultsListFilterService) {}
  transform(list: any[], word: string, filterJoin: number): any {
    this.word = word;
    const textF = this.filterByText(list);
    let a = this.resultsListFilterSE?.filtersPipe?.generalListFiltered[0];
    const initF = this.filterByOptions(textF, a?.hasOwnProperty('attr') ? [a] : []);
    let b = this.resultsListFilterSE?.filtersPipe?.generalListFiltered[1];
    const yeatF = this.filterByOptions(initF, b?.hasOwnProperty('attr') ? [b] : []);
    const resultlevelF = this.filterByOptions(yeatF, this.resultsListFilterSE?.filtersPipe?.resultLevelListFiltered);
    return resultlevelF;
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
  filterByOptions(list: any[], filters: any[]) {
    if (!filters?.length || filters[0]?.options[0] == undefined) return list;
    return list.filter(item => {
      for (const filter of filters) {
        if (!filter?.options) return false;
        for (const option of filter?.options) {
          if (item[filter.attr] == option) return true;
        }
      }
      return false;
    });
  }
}
