/* eslint-disable arrow-parens */
import { Component, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { RolesService } from '../../../../../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../../../../../shared/services/global/institutions.service';

@Component({
  selector: 'app-step-n1-institutions',
  templateUrl: './step-n1-institutions.component.html',
  styleUrls: ['./step-n1-institutions.component.scss']
})
export class StepN1InstitutionsComponent {
  @Input() body = new IpsrStep1Body();
  toggle = 0;

  showInfo = false;

  constructor(public rolesSE: RolesService, public institutionsSE: InstitutionsService) {}

  validateDeliverySelection(deliveries, deliveryId) {
    if (typeof deliveries != 'object') return false;
    const index = deliveries.indexOf(deliveryId);
    return index >= 0;
  }

  onSelectPartner(e) {
    const institutionFind: any = this.body.institutions.find(inst => inst.institutions_id == e.option.institutions_id);
    institutionFind.deliveries = [1];
  }

  onSelectDelivery(option, deliveryId) {
    if (this.rolesSE.readOnly) return;
    if (option?.deliveries?.find((deliveryId: any) => deliveryId == 4) && deliveryId != 4) {
      const index = option?.deliveries?.indexOf(4) == undefined ? -1 : option?.deliveries?.indexOf(4);
      option?.deliveries.splice(index, 1);
    }
    const index = option?.deliveries?.indexOf(deliveryId) == undefined ? -1 : option?.deliveries?.indexOf(deliveryId);
    if (deliveryId == 4 && index < 0) option.deliveries = [];
    if (typeof option?.deliveries != 'object') option.deliveries = [];
    index < 0 ? option?.deliveries.push(deliveryId) : option?.deliveries.splice(index, 1);
  }

  removePartner(index) {
    this.body.institutions.splice(index, 1);
    this.toggle++;
  }
}
