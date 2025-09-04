import { Pipe, PipeTransform } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Pipe({
  name: 'resultsToUpdateFilter',
  standalone: false
})
export class ResultsToUpdateFilterPipe implements PipeTransform {
  constructor(private api: ApiService) {
    this.api.dataControlSE.getCurrentPhases().subscribe();
  }

  transform(list, word: string) {
    const isP25 = this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym === 'P25';

    const canShow = (item: any): boolean => {
      if (isP25) return this.api.shouldShowUpdate(item);

      if (this.api.rolesSE.isAdmin) return true;
      return Boolean(item?.role_id);
    };

    list = list?.filter(
      (item: any) =>
        item.result_type_id != 6 && item.phase_year < this.api.dataControlSE.reportingCurrentPhase.phaseYear && !item?.phase_status && canShow(item)
    );
    if (!word) return list;
    if (!list?.length) return [];
    return list.filter((item: any) => (item?.joinAll ? item?.joinAll.toUpperCase().indexOf(word?.toUpperCase()) > -1 : false));
  }
}
