import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { BilateralResultsService } from '../../bilateral-results.service';

@Component({
  selector: 'app-results-review-filters',
  imports: [CommonModule, IconFieldModule, InputIconModule, InputTextModule, FormsModule],
  templateUrl: './results-review-filters.component.html',
  styleUrl: './results-review-filters.component.scss'
})
export class ResultsReviewFiltersComponent {
  bilateralResultsService = inject(BilateralResultsService);
}
