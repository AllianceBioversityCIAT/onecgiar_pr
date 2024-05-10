import { Pipe, PipeTransform } from '@angular/core';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';

@Pipe({
  name: 'panelMenu'
})
export class PanelMenuPipe implements PipeTransform {
  constructor(private dataControlSE: DataControlService) {}
  transform(list: any[], resultTypeId: string, toggle) {
    this.dataControlSE?.green_checks?.map(green_check => {
      const optionFinded = list.find(item => item.path == green_check.section_name);
      optionFinded.validation = Number(green_check.validation);
    });
    return list.filter(option => {
      if (option.path == '**') return false;
      if (!option?.hasOwnProperty('prHide')) return true;
      return option.prHide == resultTypeId ? true : false;
    });
  }
}
