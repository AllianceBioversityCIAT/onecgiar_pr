import { Pipe, PipeTransform } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Pipe({
    name: 'ipsrToUpdateFilter',
    standalone: false
})
export class IpsrToUpdateFilterPipe implements PipeTransform {
  constructor(private api: ApiService) {
    this.api.dataControlSE.getCurrentIPSRPhase();
  }

  transform(list, word: string) {
    if (!list?.length) return [];

    list = list?.filter(
      (item: any) =>
        item.phase_year < this.api.dataControlSE.IPSRCurrentPhase.phaseYear &&
        !item?.phase_status &&
        (this.api.rolesSE.isAdmin ? true : this.api.dataControlSE.myInitiativesList.some(initiative => initiative.id === item.initiative_id))
    );

    if (!word) return list;

    return list.filter((item: any) => item.full_name.toUpperCase().indexOf(word?.toUpperCase()) > -1);
  }
}
