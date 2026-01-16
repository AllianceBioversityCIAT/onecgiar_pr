import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-bilateral-results-review',
  imports: [CommonModule, RouterLink],
  templateUrl: './bilateral-results-review.component.html',
  styleUrl: './bilateral-results-review.component.scss'
})
export class BilateralResultsReviewComponent implements OnInit {
  api = inject(ApiService);
  activatedRoute = inject(ActivatedRoute);

  pendingCount = signal<number>(0);

  ngOnInit(): void {
    const programId = this.activatedRoute.snapshot.params['entityId'];
    if (programId) {
      this.api.resultsSE.GET_PendingReviewCount(programId).subscribe(res => {
        this.pendingCount.set(res.response?.total_pending_review || 0);
      });
    }
  }
}
