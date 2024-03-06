import { Component, Input } from '@angular/core';
import { RolesService } from 'src/app/shared/services/global/roles.service';
import { IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';
import { ManageRipUnitTimeService } from '../../services/manage-rip-unit-time.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrInputComponent } from '../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrRadioButtonComponent } from '../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { NoDataTextComponent } from '../../../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { StepN4AddPartnerComponent } from './modal/step-n4-add-partner/step-n4-add-partner.component';

@Component({
  selector: 'app-step-n4-partner-co-investment-table',
  standalone: true,
  templateUrl: './step-n4-partner-co-investment-table.component.html',
  styleUrls: ['./step-n4-partner-co-investment-table.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    PrInputComponent,
    PrRadioButtonComponent,
    NoDataTextComponent,
    StepN4AddPartnerComponent
  ]
})
export class StepN4PartnerCoInvestmentTableComponent {
  @Input() body = new IpsrStep4Body();

  constructor(
    public rolesSE: RolesService,
    public manageRipUnitTimeSE: ManageRipUnitTimeService
  ) {}

  validateDeliverySelection(deliveries, deliveryId) {
    if (typeof deliveries != 'object') return false;
    return deliveries.indexOf(deliveryId) >= 0;
  }

  onSelectDelivery(option, deliveryId) {
    if (
      option?.deliveries?.find((deliveryId: any) => deliveryId == 4) &&
      deliveryId != 4
    ) {
      const index =
        option?.deliveries?.indexOf(4) == undefined
          ? -1
          : option?.deliveries?.indexOf(4);
      option?.deliveries.splice(index, 1);
    }
    const index =
      option?.deliveries?.indexOf(deliveryId) == undefined
        ? -1
        : option?.deliveries?.indexOf(deliveryId);
    if (deliveryId == 4 && index < 0) option.deliveries = [];
    if (typeof option?.deliveries != 'object') option.deliveries = [];
    index < 0
      ? option?.deliveries.push(deliveryId)
      : option?.deliveries.splice(index, 1);
  }

  deletePartner(partner) {
    partner.institution.is_active = false;
  }

  hasElementsWithId(list) {
    const finalList = this.rolesSE.readOnly
      ? list.filter(item => item.institution.created_by)
      : list.filter(item => item.institution.is_active != false);
    return finalList.length;
  }
}
