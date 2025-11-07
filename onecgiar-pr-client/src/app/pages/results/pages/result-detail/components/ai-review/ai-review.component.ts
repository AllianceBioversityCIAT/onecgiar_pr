import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AiReviewService } from '../../../../../../shared/services/api/ai-review.service';
@Component({
  selector: 'app-ai-review',
  imports: [DialogModule, ButtonModule],
  templateUrl: './ai-review.component.html',
  styleUrl: './ai-review.component.scss'
})
export class AiReviewComponent {
  aiReviewSE = inject(AiReviewService);
}
