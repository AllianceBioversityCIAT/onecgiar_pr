import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';

const TOTAL_FIELDS = 1;

@Component({
  selector: 'app-type-knowledge-product',
  imports: [CommonModule],
  templateUrl: './type-knowledge-product.component.html',
  styleUrl: './type-knowledge-product.component.scss',
})
export class TypeKnowledgeProductComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);

  body: any = {};
  loading = signal(true);

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('type-specific', TOTAL_FIELDS);
    this.loadData();
  }

  private loadData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) {
      this.loading.set(false);
      return;
    }
    this.bilateralApi.GET_knowledgeProduct(resultId).subscribe({
      next: ({ response }) => {
        this.body = response || {};
        this.loading.set(false);
        this.mdsTracker.updateSection('type-specific', response?.handle ? 1 : 0);
      },
      error: () => this.loading.set(false),
    });
  }
}
