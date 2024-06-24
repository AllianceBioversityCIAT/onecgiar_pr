import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';

@Component({
  selector: 'app-result-level-buttons',
  templateUrl: './result-level-buttons.component.html',
  styleUrls: ['./result-level-buttons.component.scss']
})
export class ResultLevelButtonsComponent {
  alertList = [
    'To enable the result to enter the QA process, an impact level result should be reported as MELIA. Please contact your Science Group MELIA focal point (GI: Enrico Bonaiuti; RAFS: Jim Hammond; ST: Frank Place) to ensure the impact story is included at the appropriate level of reporting.',
    'For any AA level results not already included as part of EoI outcomes, please contact your Science Group MELIA FP (GI: Enrico Bonaiuti; RAFS: Jim Hammond; ST: Frank Place)'
  ];
  @Input() currentResultType: any;
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService) {}
}
