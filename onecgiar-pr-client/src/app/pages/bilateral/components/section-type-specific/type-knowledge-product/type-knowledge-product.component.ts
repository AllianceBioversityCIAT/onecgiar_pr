import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';

const TOTAL_FIELDS = 1;

@Component({
  selector: 'app-type-knowledge-product',
  imports: [CommonModule],
  templateUrl: './type-knowledge-product.component.html',
  styleUrl: './type-knowledge-product.component.scss',
})
export class TypeKnowledgeProductComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);

  body: any = {};
  loading = signal(true);

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('type-specific', TOTAL_FIELDS);
    this.loadData();
  }

  private loadData(): void {
    this.api.resultsSE.GET_resultknowledgeProducts().subscribe({
      next: ({ response }) => {
        this.body = response || {};
        this.loading.set(false);
        this.mdsTracker.updateSection('type-specific', response?.handle ? 1 : 0);
      },
      error: () => this.loading.set(false),
    });
  }
}
