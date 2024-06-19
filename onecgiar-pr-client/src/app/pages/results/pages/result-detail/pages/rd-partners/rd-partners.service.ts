import { Injectable } from '@angular/core';
import { PartnersBody } from './models/partnersBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { centerInterfacesToc } from '../rd-theory-of-change/model/theoryOfChangeBody';

@Injectable({
  providedIn: 'root'
})
export class RdPartnersService {
  partnersBody = new PartnersBody();
  toggle = 0;
  centers: centerInterfacesToc[] = [];

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

  validateDeliverySelectionPartners(deliveries, deliveryId) {
    if (typeof deliveries !== 'object') return false;

    return deliveries.find(delivery => delivery.partner_delivery_type_id == deliveryId);
  }

  onSelectDeliveryPartners(option, deliveryId) {
    if (this.api.rolesSE.readOnly) return;

    const index = option.delivery.findIndex(delivery => delivery.partner_delivery_type_id == deliveryId);

    if (deliveryId == 4 && index < 0) option.delivery = [];
    if (index < 0) option.delivery.push({ partner_delivery_type_id: deliveryId });
    else option.delivery.splice(index, 1);
  }

  removePartner(index) {
    this.partnersBody.institutions.splice(index, 1);
    this.toggle++;
  }

  getSectionInformation(no_applicable_partner?) {
    this.api.resultsSE.GET_partnersSection().subscribe({
      next: ({ response }) => {
        this.partnersBody = response;
      },
      error: err => {
        if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;
      }
    });
  }

  getCenterInformation() {
    this.api.resultsSE.GET_centers().subscribe(({ response }) => {
      this.centers = response;
    });
  }
}
