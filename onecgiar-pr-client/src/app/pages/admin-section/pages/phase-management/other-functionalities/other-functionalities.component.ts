import { Component, Input, ViewChild } from '@angular/core';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { PHASE_MANAGEMENT_COPY } from '../../../../../internationalization/phase-management.copy';
import { MassivePhaseShiftComponent } from './components/massive-phase-shift/massive-phase-shift.component';

@Component({
    selector: 'app-other-functionalities',
    templateUrl: './other-functionalities.component.html',
    styleUrls: ['./other-functionalities.component.scss'],
    standalone: false
})
export class OtherFunctionalitiesComponent {
  @Input() replicateIPSR: boolean = false;
  @Input() replicateInnovationUse: boolean = false;
  @ViewChild(MassivePhaseShiftComponent) massivePhaseShiftModal!: MassivePhaseShiftComponent;

  readonly copy = PHASE_MANAGEMENT_COPY;

  constructor(public api: ApiService) {}

  replicateTitle(): string {
    if (this.replicateInnovationUse) return this.copy.innovationUseTitle;
    if (this.replicateIPSR) return this.copy.innovationPackagesTitle;
    return this.copy.resultInnovationsTitle;
  }

  icon(): string {
    if (this.replicateInnovationUse) return 'fact_check';
    if (this.replicateIPSR) return 'inventory_2';
    return 'content_copy';
  }

  targetPhaseName(): string | null {
    return this.replicateIPSR ? this.api.dataControlSE.IPSRCurrentPhase.phaseName : this.api.dataControlSE.reportingCurrentPhase.phaseName;
  }

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
    this.massivePhaseShiftModal.visible = true;
  }
}
