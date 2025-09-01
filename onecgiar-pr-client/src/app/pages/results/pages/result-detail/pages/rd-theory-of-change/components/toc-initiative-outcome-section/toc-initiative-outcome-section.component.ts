import { Component, Input } from '@angular/core';
import { ResultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { RdTheoryOfChangesServicesService } from '../../rd-theory-of-changes-services.service';

@Component({
    selector: 'app-toc-initiative-outcome-section',
    templateUrl: './toc-initiative-outcome-section.component.html',
    styleUrls: ['./toc-initiative-outcome-section.component.scss'],
    standalone: false
})
export class TocInitiativeOutcomeSectionComponent {
  @Input() result_toc_result = new ResultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;

  constructor(public rolesSE: RolesService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}
}
