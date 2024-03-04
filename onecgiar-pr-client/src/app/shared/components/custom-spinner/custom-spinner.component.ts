import { Component, Input, OnInit } from '@angular/core';
import { ResultsListService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-spinner',
  standalone: true,
  templateUrl: './custom-spinner.component.html',
  styleUrls: ['./custom-spinner.component.scss'],
  imports: [CommonModule]
})
export class CustomSpinnerComponent {
  @Input() text: string;
  constructor(public resultsListService: ResultsListService) {}
}
