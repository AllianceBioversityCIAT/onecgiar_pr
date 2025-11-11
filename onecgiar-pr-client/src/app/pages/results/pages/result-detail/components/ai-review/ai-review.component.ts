import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AiReviewService } from '../../../../../../shared/services/api/ai-review.service';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@Component({
  selector: 'app-ai-review',
  imports: [DialogModule, ButtonModule, FormsModule, CommonModule, CustomFieldsModule],
  templateUrl: './ai-review.component.html',
  styleUrl: './ai-review.component.scss'
})
export class AiReviewComponent {
  aiReviewSE = inject(AiReviewService);

  // Field values
  titleCurrentVersion = 'Small-scale Fisheries and Aquaculture Ontology';
  descriptionCurrentVersion =
    'This result introduces a conceptual framework for the sustainable management of small-scale fisheries and aquaculture. It establishes a standardized ontology to classify species, practices, and environmental factors, supporting evidence-based decisions that strengthen local food systems, protect marine biodiversity, and sustain coastal livelihoods.';
  innovationShortTitleCurrentVersion = '';

  moveTextToInput(field: any) {
    field.canSave = true;
    field.original_text = field.proposed_text;
  }
  updateCurrnetFieldsList() {
    this.aiReviewSE.currnetFieldsList.update(res => [...res]);
  }
}
