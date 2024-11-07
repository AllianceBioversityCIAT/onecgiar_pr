import { Component, Input } from '@angular/core';
import { IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';
import { RolesService } from '../../../../../../../../../../shared/services/global/roles.service';

@Component({
  selector: 'app-step-n4-partner-co-investment-table',
  templateUrl: './step-n4-partner-co-investment-table.component.html',
  styleUrls: ['./step-n4-partner-co-investment-table.component.scss']
})
export class StepN4PartnerCoInvestmentTableComponent {
  @Input() body = new IpsrStep4Body();

  constructor(public rolesSE: RolesService) {}

  deletePartner(partner) {
    partner.is_active = false;
  }

  hasElementsWithId(list) {
    const finalList = this.rolesSE.readOnly
      ? list.filter(item => item.obj_result_institution.created_by)
      : list.filter(item => item.obj_result_institution.is_active);
    return finalList.length;
  }
}
