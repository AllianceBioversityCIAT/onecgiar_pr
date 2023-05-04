import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'innovationPackageListFilter'
})
export class InnovationPackageListFilterPipe implements PipeTransform {
  transform(list, word: string, inits: any, initsSelectedJoinText: any) {
    if (!word) return this.filterByInits(list, inits);
    if (!list?.length) return [];
    return this.filterByInits(this.filterByText(list, word), inits);
  }

  filterByText(list, word) {
    return list.filter((item: any) => (Boolean(item?.full_name) ? item?.full_name.toUpperCase().indexOf(word?.toUpperCase()) > -1 : false));
  }

  filterByInits(list, inits) {
    if (inits.every(init => init.selected !== true)) return list;
    return list.filter(item => {
      return Boolean(inits.find(init => init.official_code == item?.official_code && init.selected));
    });
  }
}