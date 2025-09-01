import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ResultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { TocInitiativeOutcomeListsService } from '../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { RdTheoryOfChangesServicesService } from '../../rd-theory-of-changes-services.service';

@Component({
    selector: 'app-toc-initiative-output-section',
    templateUrl: './toc-initiative-output-section.component.html',
    styleUrls: ['./toc-initiative-output-section.component.scss'],
    standalone: false
})
export class TocInitiativeOutputSectionComponent {
  @Input() result_toc_result = new ResultToResultInterfaceToc();

  @Input() contributors_result_toc_result: any;

  constructor(public api: ApiService, public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService, public dataControlSE: DataControlService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {}
}
