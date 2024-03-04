import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-other-functionalities',
  templateUrl: './other-functionalities.component.html',
  styleUrls: ['./other-functionalities.component.scss']
})
export class OtherFunctionalitiesComponent {
  @Input() replicateIPSR: boolean = false;

  constructor(public api: ApiService) {}

  replicateBannerText() {
    if (this.replicateIPSR) {
      return 'Replicate all IPSR result from previous phase to the current active phase';
    }

    return 'Replicate all QAed result innovations from previous phase to the current active phase';
  }

  execute() {
    this.api.dataControlSE.showMassivePhaseShiftModal = true;
  }
}
