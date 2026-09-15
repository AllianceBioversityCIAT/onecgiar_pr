import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-other-functionalities',
    templateUrl: './other-functionalities.component.html',
    styleUrls: ['./other-functionalities.component.scss'],
    standalone: false
})
export class OtherFunctionalitiesComponent {
  @Input() replicateIPSR: boolean = false;
  @Input() replicateInnovationUse: boolean = false;

  constructor(public api: ApiService) {}

  replicateBannerText() {
    if (this.replicateInnovationUse) {
      return 'Replicate all Innovation Use results from previous phase to the current active phase';
    }

    if (this.replicateIPSR) {
      return 'Replicate all Innovation Packages from previous phase to the current active phase';
    }

    return 'Replicate all result innovations from previous phase to the current active phase (except Editing/Rejected)';
  }

  execute() {
    this.api.dataControlSE.showMassivePhaseShiftModal = true;
  }
}
