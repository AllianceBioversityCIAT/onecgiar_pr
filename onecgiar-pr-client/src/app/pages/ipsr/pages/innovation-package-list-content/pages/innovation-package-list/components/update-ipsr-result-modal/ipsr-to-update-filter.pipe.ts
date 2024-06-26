import { Pipe, PipeTransform } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Pipe({
  name: 'ipsrToUpdateFilter'
})
export class IpsrToUpdateFilterPipe implements PipeTransform {
  constructor(private api: ApiService) {}

  transform(list, word: string) {
    if (!list?.length) return [];

    list = list?.filter((item: any) => item.result_type_id != 6 && item.phase_year < this.api.dataControlSE.IPSRCurrentPhase.phaseYear && !item?.phase_status && (this.api.rolesSE.isAdmin ? true : Boolean(item?.role_id)));

    if (!word) return list;

    return list.filter((item: any) => (item?.joinAll ? item?.joinAll.toUpperCase().indexOf(word?.toUpperCase()) > -1 : false));
  }
}
