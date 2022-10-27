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

  constructor(private api: ApiService, public institutionsSE: InstitutionsService) {}
  checkboxExample = null;
  ngOnInit(): void {
    this.showAlerts();
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
      description: `If you don't find the partner you are looking for, <a href="">request</a> to have it added to the list.`,
      querySelector: '.partnerRequestAlert',
      position: 'afterbegin'
    });
  }
}
