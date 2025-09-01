import { Component } from '@angular/core';
import { DataControlService } from '../../../../../../shared/services/data-control.service';

@Component({
  selector: 'app-result-title',
  templateUrl: './result-title.component.html',
  styleUrls: ['./result-title.component.scss'],
  standalone: false
})
export class ResultTitleComponent {
  constructor(public dataControlSE: DataControlService) {}
}
