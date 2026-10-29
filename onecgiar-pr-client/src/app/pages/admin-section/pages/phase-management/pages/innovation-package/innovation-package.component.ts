import { Component } from '@angular/core';
import { ModuleTypeEnum } from '../../../../../../shared/enum/api.enum';
import { PHASE_MANAGEMENT_COPY } from '../../../../../../internationalization/phase-management.copy';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-innovation-package',
    templateUrl: './innovation-package.component.html',
    styleUrls: ['./innovation-package.component.scss'],
    standalone: false
})
export class InnovationPackageComponent {
  moduleType = ModuleTypeEnum.IPSR;
  appModuleId = 2;

  readonly copy = PHASE_MANAGEMENT_COPY;

  constructor(public api: ApiService) {}

  onPhaseUpdate(): void {
    // This method can be used to handle updates related to the phase management of the innovation package.
  }
}
