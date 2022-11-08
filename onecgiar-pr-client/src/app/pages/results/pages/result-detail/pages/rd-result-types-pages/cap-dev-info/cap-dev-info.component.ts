import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../shared/services/global/institutions.service';

@Component({
  selector: 'app-cap-dev-info',
  templateUrl: './cap-dev-info.component.html',
  styleUrls: ['./cap-dev-info.component.scss']
})
export class CapDevInfoComponent implements OnInit {
  longTermOrShortTermValue = null;
  longTermOrShortTermList = [
    { id: 1, name: 'Long-term' },
    { id: 2, name: 'Short-term' }
  ];

  longTermSubOptions = [
    { id: 1, name: 'PhD' },
    { id: 2, name: 'Masters' }
  ];

  deliveryMethodOptions = [
    { id: 1, name: 'Virtual / Online' },
    { id: 2, name: 'Face to face (IRL)' },
    { id: 3, name: 'Blended (IRL and Virtual)' }
  ];

  constructor(public api: ApiService, public institutionsSE: InstitutionsService) {}

  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
  }
  getSectionInformation() {}
  onSaveSection() {}
  showAlerts() {}

  deliveryMethodDescription() {
    return `Please go to <a href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultId}/geographic-location" class="open_route" target="_blank">section 4. Geographic Location</a> and specify the location info of where the training took place in case you select the Face to face or Blended option.`;
  }
}
