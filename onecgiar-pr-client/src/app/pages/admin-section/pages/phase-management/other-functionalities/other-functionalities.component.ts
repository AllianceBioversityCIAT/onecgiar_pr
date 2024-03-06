import { Component } from '@angular/core';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { PrButtonComponent } from '../../../../../custom-fields/pr-button/pr-button.component';
import { CommonModule } from '@angular/common';
import { MassivePhaseShiftComponent } from './components/massive-phase-shift/massive-phase-shift.component';

@Component({
  selector: 'app-other-functionalities',
  standalone: true,
  templateUrl: './other-functionalities.component.html',
  styleUrls: ['./other-functionalities.component.scss'],
  imports: [CommonModule, PrButtonComponent, MassivePhaseShiftComponent]
})
export class OtherFunctionalitiesComponent {
  constructor(public api: ApiService) {}

  execute() {
    this.api.dataControlSE.showMassivePhaseShiftModal = true;
  }
}
