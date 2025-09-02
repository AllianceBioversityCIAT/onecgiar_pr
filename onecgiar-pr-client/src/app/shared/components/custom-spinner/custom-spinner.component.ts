import { Component, Input } from '@angular/core';
import { ResultsListService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list.service';

@Component({
    selector: 'app-custom-spinner',
    templateUrl: './custom-spinner.component.html',
    styleUrls: ['./custom-spinner.component.scss'],
    standalone: false
})
export class CustomSpinnerComponent {
  @Input() text: string;
  @Input() showSpinner: boolean = false;

  constructor(public resultsListService: ResultsListService) {}
}
