import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-policy-change-info',
  templateUrl: './policy-change-info.component.html',
  styleUrls: ['./policy-change-info.component.scss']
})
export class PolicyChangeInfoComponent implements OnInit {
  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {}
    });
  }
  getSectionInformation() {}
  onSaveSection() {}
  showAlerts() {}
}
