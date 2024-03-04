import { Component, Input } from '@angular/core';
import { resultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { RdTheoryOfChangesServicesService } from '../../rd-theory-of-changes-services.service';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { TocInitiativeOutComponent } from '../shared/toc-initiative-out/toc-initiative-out.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toc-initiative-outcome-section',
  standalone: true,
  templateUrl: './toc-initiative-outcome-section.component.html',
  styleUrls: ['./toc-initiative-outcome-section.component.scss'],
  imports: [CommonModule, PrFieldHeaderComponent, TocInitiativeOutComponent]
})
export class TocInitiativeOutcomeSectionComponent {
  @Input() result_toc_result = new resultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;

  constructor(
    public rolesSE: RolesService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService
  ) {}
}
