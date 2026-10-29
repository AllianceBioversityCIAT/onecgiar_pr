import { Component } from '@angular/core';
import { ModuleTypeEnum } from '../../../../../../shared/enum/api.enum';
import { PHASE_MANAGEMENT_COPY } from '../../../../../../internationalization/phase-management.copy';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-reporting',
    templateUrl: './reporting.component.html',
    styleUrls: ['./reporting.component.scss'],
    standalone: false
})
export class ReportingComponent {
  moduleType = ModuleTypeEnum.REPORTING;
  appModuleId = 1;

  readonly copy = PHASE_MANAGEMENT_COPY;

  constructor(public api: ApiService) {}

  onPhaseUpdate(): void {
    // This method can be used to handle updates related to the phase management of the reporting module.
  }
}
