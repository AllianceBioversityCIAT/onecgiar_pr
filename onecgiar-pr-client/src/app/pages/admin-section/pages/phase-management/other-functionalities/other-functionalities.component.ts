import { Component } from '@angular/core';
import { ApiService } from '../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-other-functionalities',
  templateUrl: './other-functionalities.component.html',
  styleUrls: ['./other-functionalities.component.scss']
})
export class OtherFunctionalitiesComponent {
  constructor(public api: ApiService) {}

  execute() {
    this.api.dataControlSE.showMassivePhaseShiftModal = true;
  }
}
