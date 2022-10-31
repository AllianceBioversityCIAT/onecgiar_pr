import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { PartnersBody } from './models/partnersBody';

@Component({
  selector: 'app-rd-partners',
  templateUrl: './rd-partners.component.html',
  styleUrls: ['./rd-partners.component.scss']
})
export class RdPartnersComponent {
  partnersBody = new PartnersBody();
  toggle = 0;
  constructor(private api: ApiService, public institutionsSE: InstitutionsService) {}
  ngOnInit(): void {
    this.getSectionInformation();
  }
  getSectionInformation(no_applicable_partner?) {
    this.api.resultsSE.GET_partnersSection().subscribe(
      ({ response }) => {
        this.partnersBody = response;
        if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;
        this.showAlerts();
      },
      err => {
        if (no_applicable_partner === true || no_applicable_partner === false) this.partnersBody.no_applicable_partner = no_applicable_partner;
        this.showAlerts();
      }
    );
  }
  onSaveSection() {
    console.log(this.partnersBody);
    this.api.resultsSE.PATCH_partnersSection(this.partnersBody).subscribe(resp => {
      console.log(resp);
      this.api.alertsFe.show({ id: 'sectionSaved', title: 'Section saved correctly', description: '', status: 'success', closeIn: 500 });
    });
  }
  validateDeliverySelection(deliveries, deliveryId) {
    if (!(typeof deliveries == 'object')) return false;
    const index = deliveries.indexOf(deliveryId);
    return index < 0 ? false : true;
  }
  onSelectDelivery(option, deliveryId) {
    if (!(typeof option?.deliveries == 'object')) option.deliveries = [];
    const index = option?.deliveries.indexOf(deliveryId);
    index < 0 ? option?.deliveries.push(deliveryId) : option?.deliveries.splice(index, 1);
  }
  removePartner(index) {
    this.partnersBody.institutions.splice(index, 1);
  }
  cleanBody() {
    if (this.partnersBody.no_applicable_partner === true) this.partnersBody = new PartnersBody(true);
    if (this.partnersBody.no_applicable_partner === false) this.getSectionInformation(false);
  }
  showAlerts() {
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: 'Partner organization that you collaborated with to generate this result or that contributed to this result.',
      querySelector: '.detail_container',
      position: 'afterbegin'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `If you don't find the partner you are looking for, <a id='partnerRequest' class="open_route">request</a> to have it added to the list.`,
      querySelector: '#partnerRequestAlert',
      position: 'afterbegin'
    });
    try {
      document.getElementById('partnerRequest').addEventListener('click', e => {
        this.api.dataControlSE.showPartnersRequest = true;
      });
    } catch (error) {}
  }
}
