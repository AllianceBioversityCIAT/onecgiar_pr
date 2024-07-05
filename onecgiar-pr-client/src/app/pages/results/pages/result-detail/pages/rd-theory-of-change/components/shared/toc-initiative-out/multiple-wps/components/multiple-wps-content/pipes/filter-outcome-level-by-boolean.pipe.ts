import { Pipe, PipeTransform } from '@angular/core';
import { DataControlService } from '../../../../../../../../../../../../../shared/services/data-control.service';

@Pipe({
  name: 'filterOutcomeLevelByBoolean'
})
export class FilterOutcomeLevelByBooleanPipe implements PipeTransform {
  constructor(private dataControlSE: DataControlService) {}
  transform(list: any, yes: boolean): unknown {
    const { appliesforTOCMWfilter } = this.dataControlSE.currentResult || {};
    const res = list.filter(item => item.toc_level_id === (!yes && appliesforTOCMWfilter ? 4 : 2) || item.toc_level_id === 3);
    return res;
  }
}
