import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ResultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { RdTheoryOfChangesServicesService } from '../../rd-theory-of-changes-services.service';

@Component({
    selector: 'app-toc-action-area-outcome-section',
    templateUrl: './toc-action-area-outcome-section.component.html',
    styleUrls: ['./toc-action-area-outcome-section.component.scss'],
    standalone: false
})
export class TocActionAreaOutcomeSectionComponent {
  @Input() result_toc_result = new ResultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;

  constructor(public api: ApiService, public dataControlSE: DataControlService, public theoryOfChangesServices: RdTheoryOfChangesServicesService) {
    this.theoryOfChangesServices.resultActionArea = [];
  }
}
