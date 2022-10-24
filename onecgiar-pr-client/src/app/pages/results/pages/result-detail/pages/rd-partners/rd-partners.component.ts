import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-rd-partners',
  templateUrl: './rd-partners.component.html',
  styleUrls: ['./rd-partners.component.scss']
})
export class RdPartnersComponent {
  constructor(private api: ApiService) {}
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
  }
}
