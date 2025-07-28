import { Component } from '@angular/core';
import { ModuleTypeEnum } from '../../../../../../shared/enum/api.enum';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-reporting',
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.scss']
})
export class ReportingComponent {
  moduleType = ModuleTypeEnum.REPORTING;
  appModuleId = 1;

  constructor(public api: ApiService) {}

  onPhaseUpdate(): void {
    // This method can be used to handle updates related to the phase management of the reporting module.
  }
}
