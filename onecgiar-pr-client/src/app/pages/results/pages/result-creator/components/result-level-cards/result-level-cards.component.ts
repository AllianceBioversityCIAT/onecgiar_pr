import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';

@Component({
  selector: 'app-result-level-cards',
  templateUrl: './result-level-cards.component.html',
  styleUrls: ['./result-level-cards.component.scss'],
  standalone: false
})
export class ResultLevelCardsComponent {
  @Input() currentResultType: any;
  @Input() hideAlert: boolean = false;
  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService
  ) {}
}

