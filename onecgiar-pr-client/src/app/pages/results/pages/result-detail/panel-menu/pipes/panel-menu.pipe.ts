import { Pipe, PipeTransform } from '@angular/core';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';

@Pipe({
  name: 'panelMenu'
})
export class PanelMenuPipe implements PipeTransform {
  transform(list: any[], resultTypeId: string) {
    return list.filter(option => {
      if (option.path == '**') return false;
      if (!option?.hasOwnProperty('prHide')) return true;
      return option.prHide == resultTypeId ? true : false;
    });
  }
}
