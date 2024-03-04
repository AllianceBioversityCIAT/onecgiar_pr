import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { resultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { TocInitiativeOutcomeListsService } from '../toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { RdTheoryOfChangesServicesService } from '../../rd-theory-of-changes-services.service';
import { CommonModule } from '@angular/common';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { TocInitiativeOutComponent } from '../shared/toc-initiative-out/toc-initiative-out.component';

@Component({
  selector: 'app-toc-initiative-output-section',
  standalone: true,
  templateUrl: './toc-initiative-output-section.component.html',
  styleUrls: ['./toc-initiative-output-section.component.scss'],
  imports: [CommonModule, PrFieldHeaderComponent, TocInitiativeOutComponent]
})
export class TocInitiativeOutputSectionComponent {
  @Input() result_toc_result = new resultToResultInterfaceToc();

  @Input() contributors_result_toc_result: any;

  constructor(
    public api: ApiService,
    public tocInitiativeOutcomeListsSE: TocInitiativeOutcomeListsService,
    public dataControlSE: DataControlService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService
  ) {}
}
