import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'resultsListFilter'
})
export class ResultsListFilterPipe implements PipeTransform {
  transform(list: any[], word: string): any {
    list.map(item => {
      const { id, title, owner, planned_year, result_type } = item;
      item.joinAll = id + title + owner + planned_year + result_type;
    });
    //filter objects list by atributte in ts?

    return list.filter(item => item.joinAll.toUpperCase().indexOf(word?.toUpperCase()) > -1);
  }
}
