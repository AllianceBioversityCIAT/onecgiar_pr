import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BilateralResultsService } from '../../bilateral-results.service';

@Component({
  selector: 'app-results-review-filters',
  imports: [CommonModule, IconFieldModule, InputIconModule, InputTextModule, FormsModule],
  templateUrl: './results-review-filters.component.html',
  styleUrl: './results-review-filters.component.scss'
})
export class ResultsReviewFiltersComponent implements OnInit {
  bilateralResultsService = inject(BilateralResultsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  ngOnInit(): void {
    const searchParam = this.route.snapshot.queryParamMap.get('search');
    if (searchParam) {
      this.bilateralResultsService.searchText.set(searchParam);
    }
  }

  onSearchChange(value: string): void {
    this.bilateralResultsService.searchText.set(value);
    this.updateQueryParam(value);
  }

  private updateQueryParam(search: string): void {
    const urlTree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { search: search || null },
      queryParamsHandling: 'merge'
    });
    this.location.replaceState(this.router.serializeUrl(urlTree));
  }
}
