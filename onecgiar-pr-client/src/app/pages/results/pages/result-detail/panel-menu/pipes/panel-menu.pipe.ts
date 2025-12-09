import { Pipe, PipeTransform, inject } from '@angular/core';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

@Pipe({
  name: 'panelMenu',
  standalone: false
})
export class PanelMenuPipe implements PipeTransform {
  fieldsManager = inject(FieldsManagerService);
  constructor(private dataControlSE: DataControlService) {}
  transform(list: any[], resultTypeId: string, toggle) {
    // Don't show menu options until portfolio is loaded to avoid showing wrong portfolio menu
    const portfolio = this.fieldsManager.portfolioAcronym();
    if (!portfolio) {
      return [];
    }

    this.dataControlSE?.green_checks?.map(green_check => {
      const optionFinded = list.find(item => item.path == green_check.section_name);
      optionFinded.validation = Number(green_check.validation);
    });
    return list.filter(option => {
      if (option.path == '**') return false;
      if (this.fieldsManager.isP25() && option.portfolioAcronym == 'P22') return false;
      if (this.fieldsManager.isP22() && option.portfolioAcronym == 'P25') return false;
      if (!option?.hasOwnProperty('prHide')) return true;
      return option.prHide == resultTypeId ? true : false;
    });
  }
}
