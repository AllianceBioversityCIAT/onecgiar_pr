import { Pipe, PipeTransform } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Pipe({
  name: 'resultsToUpdateFilter'
})
export class ResultsToUpdateFilterPipe implements PipeTransform {
  constructor(private api: ApiService) {
    this.api.dataControlSE.getCurrentPhases();
  }

  transform(list, word: string) {
    list = list?.filter((item: any) => item.result_type_id != 6 && item.phase_year < this.api.dataControlSE.reportingCurrentPhase && !item?.phase_status && (this.api.rolesSE.isAdmin ? true : Boolean(item?.role_id)));
    if (!word) return list;
    if (!list?.length) return [];
    return list.filter((item: any) => (item?.joinAll ? item?.joinAll.toUpperCase().indexOf(word?.toUpperCase()) > -1 : false));
  }
}
