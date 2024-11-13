import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CommonModule, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';

@Component({
  selector: 'app-outcome-indicator-home',
  templateUrl: './outcome-indicator-home.component.html',
  styleUrl: './outcome-indicator-home.component.scss',
  standalone: true,
  imports: [NgClass, RouterLink]
})
export class OutcomeIndicatorHomeComponent {
  constructor(
    public api: ApiService,
    public outcomeIService: OutcomeIndicatorService
  ) {}

  exportToExcel() {
    console.error('Export to Excel');
  }
}
