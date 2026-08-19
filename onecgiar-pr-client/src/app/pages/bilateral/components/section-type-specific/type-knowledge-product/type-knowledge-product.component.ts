import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';

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
  /** P2-3355: the fetch failing is a state the user has to see, not something to swallow. */
  loadFailed = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) {
      this.publish(null, true);
      return;
    }
    this.bilateralApi.GET_knowledgeProduct(resultId).subscribe({
      next: ({ response }) => this.publish(response, false),
      error: () => this.publish(null, true),
    });
  }

  /**
   * P2-3355: the checklist item is published on EVERY outcome, including failure.
   *
   * It used to be registered only in the success callback, so a failed fetch left the section with
   * an empty field list — which is exactly the "0/0 fields" QA reported. That number was the tell:
   * a successful load registers one field, so a real success can only ever read 0/1 or 1/1. Never
   * 0/0. Publishing an unfilled item on failure keeps the counter honest and makes the section show
   * up as incomplete rather than as "nothing required here".
   */
  private publish(response: any, failed: boolean): void {
    this.body = response || {};
    this.loadFailed.set(failed);
    this.loading.set(false);
    this.mdsTracker.setSectionFields('type-specific', [
      { key: 'handle', label: 'Knowledge product handle', filled: !!response?.handle },
    ]);
  }
}
