import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { resultToResultInterfaceToc } from '../../model/theoryOfChangeBody';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';

@Component({
  selector: 'app-toc-action-area-outcome-section',
  templateUrl: './toc-action-area-outcome-section.component.html',
  styleUrls: ['./toc-action-area-outcome-section.component.scss']
})
export class TocActionAreaOutcomeSectionComponent {
  @Input() result_toc_result = new resultToResultInterfaceToc();
  @Input() contributors_result_toc_result: any;
  constructor(public api: ApiService, public dataControlSE: DataControlService) {}
}
