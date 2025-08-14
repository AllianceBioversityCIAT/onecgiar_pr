import { Pipe, PipeTransform } from '@angular/core';
import { IpsrListFilterService } from '../../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../../services/ipsr-list.service';

@Pipe({
    name: 'innovationPackageListFilter',
    pure: false,
    standalone: false
})
export class InnovationPackageListFilterPipe implements PipeTransform {
  constructor(public ipsrListService: IpsrListService, public ipsrListFilterSE: IpsrListFilterService) {}
  transform(list, word: string) {
    return this.combineRepeatedResults(this.filterByInits(this.filterByText(this.filterByPhase(list), word)));
  }

  filterByText(list, word) {
    return list.filter((item: any) => (item?.full_name ? item?.full_name.toUpperCase().indexOf(word?.toUpperCase()) > -1 : false));
  }

  filterByInits(list) {
    if (this.ipsrListFilterSE.filters.general[0].options.every(init => init.selected !== true || init.cleanAll)) return list;
    return list.filter(item => {
      return Boolean(this.ipsrListFilterSE.filters.general[0].options.find(init => init.attr == item?.official_code && init.selected));
    });
  }

  filterByPhase(list) {
    const resultsFilters = [];
    for (const option of this.ipsrListFilterSE.filters.general[1].options) if (option?.selected === true) resultsFilters.push(option);
    if (!resultsFilters.length) return list;
    return list.filter(result => {
      for (const filter of resultsFilters) if (filter?.attr == result?.phase_name) return true;
      return false;
    });
  }

  combineRepeatedResults(results) {
    const uniqueResults = [];

    results.forEach(result => {
      if (!uniqueResults.find(r => r.result_code === result.result_code)) {
        result.results = results.filter(r => r.result_code === result.result_code);
        result.results.sort((a, b) => a.phase_year - b.phase_year);
        uniqueResults.push(result);
      }
    });

    return uniqueResults;
  }
}
