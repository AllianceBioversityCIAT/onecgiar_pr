import { Component, Input, OnInit } from '@angular/core';
import { RolesService } from 'src/app/shared/services/global/roles.service';
import { InstitutionsexpectedinvestmentStep4, IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';

@Component({
  selector: 'app-step-n4-partner-co-investment-table',
  templateUrl: './step-n4-partner-co-investment-table.component.html',
  styleUrls: ['./step-n4-partner-co-investment-table.component.scss']
})
export class StepN4PartnerCoInvestmentTableComponent implements OnInit {
  @Input() body = new IpsrStep4Body();

  constructor(public rolesSE: RolesService) {}

  ngOnInit(): void {}
  validateDeliverySelection(deliveries, deliveryId) {
    if (!(typeof deliveries == 'object')) return false;
    const index = deliveries.indexOf(deliveryId);
    return index < 0 ? false : true;
  }
  onSelectDelivery(option, deliveryId) {
    // console.log('onSelectDelivery');
    if (option?.deliveries?.find((deliveryId: any) => deliveryId == 4) && deliveryId != 4) {
      return;
    }
    const index = option?.deliveries?.indexOf(deliveryId) == undefined ? -1 : option?.deliveries?.indexOf(deliveryId);
    if (deliveryId == 4 && index < 0) option.deliveries = [];
    if (!(typeof option?.deliveries == 'object')) option.deliveries = [];
    index < 0 ? option?.deliveries.push(deliveryId) : option?.deliveries.splice(index, 1);
  }
}
