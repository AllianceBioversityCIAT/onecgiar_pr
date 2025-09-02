import { Component, OnInit, Input } from '@angular/core';
import { ContributorsBody } from '../../model/contributorsBody';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';

@Component({
    selector: 'app-ipsr-contributors-non-cgiar-partners',
    templateUrl: './ipsr-contributors-non-cgiar-partners.component.html',
    styleUrls: ['./ipsr-contributors-non-cgiar-partners.component.scss'],
    standalone: false
})
export class IpsrContributorsNonCgiarPartnersComponent {
  @Input() contributorsBody = new ContributorsBody();
  toggle = 0;

  showInfo = false;

  constructor(public rolesSE: RolesService, public institutionsSE: InstitutionsService) {}

  validateDeliverySelection(deliveries, deliveryId) {
    if (!(typeof deliveries == 'object')) return false;
    const index = deliveries.indexOf(deliveryId);
    return index < 0 ? false : true;
  }
  onSelectDelivery(option, deliveryId) {
    if (this.rolesSE.readOnly) return;
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
    this.contributorsBody.institutions.splice(index, 1);
    this.toggle++;
  }
  cleanBody() {
    // if (this.partnersBody.no_applicable_partner === true) this.partnersBody = new PartnersBody(true);
    // if (this.partnersBody.no_applicable_partner === false) this.getSectionInformation(false);
  }
}
