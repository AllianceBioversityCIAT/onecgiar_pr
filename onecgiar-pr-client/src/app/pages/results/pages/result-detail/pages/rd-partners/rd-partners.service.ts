import { Injectable } from '@angular/core';
import { PartnersBody } from './models/partnersBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class RdPartnersService {
  partnersBody = new PartnersBody();
  toggle = 0;
  constructor(private api: ApiService) {}

  validateDeliverySelection(deliveries, deliveryId) {
    if (!(typeof deliveries == 'object')) return false;
    const index = deliveries.indexOf(deliveryId);
    return index < 0 ? false : true;
  }
  onSelectDelivery(option, deliveryId) {
    if (this.api.rolesSE.readOnly) return;
    if (option?.deliveries?.find((deliveryId: any) => deliveryId == 4) && deliveryId != 4) {
      const index = option?.deliveries?.indexOf(4) == undefined ? -1 : option?.deliveries?.indexOf(4);
      option?.deliveries.splice(index, 1);
    }
    const index = option?.deliveries?.indexOf(deliveryId) == undefined ? -1 : option?.deliveries?.indexOf(deliveryId);
    if (deliveryId == 4 && index < 0) option.deliveries = [];
    if (!(typeof option?.deliveries == 'object')) option.deliveries = [];
    index < 0 ? option?.deliveries.push(deliveryId) : option?.deliveries.splice(index, 1);
  }
  removePartner(index) {
    this.partnersBody.institutions.splice(index, 1);
    this.toggle++;
  }
  /*cleanBody() {
    if (this.partnersBody.no_applicable_partner === true) this.partnersBody = new PartnersBody(true);
    if (this.partnersBody.no_applicable_partner === false) this.getSectionInformation(false);
  }*/

  getSectionInformation(no_applicable_partner?) {
    this.api.resultsSE.GET_partnersSection().subscribe(
      ({ response }) => {
        //(response);
        this.partnersBody = response;
        if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;
      },
      err => {
        if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;
      }
    );
  }
}
