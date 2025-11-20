import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bilateral-results-review',
  imports: [CommonModule],
  templateUrl: './bilateral-results-review.component.html',
  styleUrl: './bilateral-results-review.component.scss'
})
export class BilateralResultsReviewComponent {
  onReviewResults() {
    // Navigate to bilateral results review page
  }
}
