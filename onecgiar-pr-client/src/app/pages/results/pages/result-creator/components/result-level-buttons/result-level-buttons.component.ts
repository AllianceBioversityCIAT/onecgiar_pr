import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';

@Component({
  selector: 'app-result-level-buttons',
  templateUrl: './result-level-buttons.component.html',
  styleUrls: ['./result-level-buttons.component.scss']
})
export class ResultLevelButtonsComponent {
  @Input() currentResultType: any;
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService) {}
}
