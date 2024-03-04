import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { resultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { RdTheoryOfChangesServicesService } from '../../rd-theory-of-changes-services.service';
import { CommonModule } from '@angular/common';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { TocInitiativeAaoComponent } from '../shared/toc-initiative-aao/toc-initiative-aao.component';
import { NoDataTextComponent } from '../../../../../../../../custom-fields/no-data-text/no-data-text.component';

@Component({
  selector: 'app-toc-action-area-outcome-section',
  standalone: true,
  templateUrl: './toc-action-area-outcome-section.component.html',
  styleUrls: ['./toc-action-area-outcome-section.component.scss'],
  imports: [
    CommonModule,
    PrFieldHeaderComponent,
    AlertStatusComponent,
    TocInitiativeAaoComponent,
    NoDataTextComponent
  ]
})
export class TocActionAreaOutcomeSectionComponent {
  @Input() result_toc_result = new resultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;

  constructor(
    public api: ApiService,
    public dataControlSE: DataControlService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService
  ) {
    this.theoryOfChangesServices.resultActionArea = [];
  }
}
