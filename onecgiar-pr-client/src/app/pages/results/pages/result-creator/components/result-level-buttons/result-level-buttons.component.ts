import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';
import { CommonModule } from '@angular/common';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';

@Component({
  selector: 'app-result-level-buttons',
  standalone: true,
  templateUrl: './result-level-buttons.component.html',
  styleUrls: ['./result-level-buttons.component.scss'],
  imports: [CommonModule, AlertStatusComponent]
})
export class ResultLevelButtonsComponent {
  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService
  ) {}
}
