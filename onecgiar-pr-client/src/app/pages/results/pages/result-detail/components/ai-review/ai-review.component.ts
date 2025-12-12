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

  // Result version options
  resultVersionOptions = [
    { id: '0', full_name: '(0) Targeted' },
    { id: '1', full_name: '(1) Significant' },
    { id: '2', full_name: '(2) Principal' }
  ];

  moveTextToInput(field: any) {
    field.canSave = true;
    field.original_text = field.proposed_text;
  }

  onResultVersionChange(dacScore: any, value: any) {
    // Actualizar el tag_id del dacScore
    dacScore.tag_id = value;
    dacScore.canSave = true;
  }

  getDacScoreByFieldName(fieldName: string) {
    return this.aiReviewSE.dacScores().find(score => score.field_name === fieldName);
  }

  async onSaveDacScore(dacScore: any) {
    dacScore.canSave = false;
    // Aquí se puede agregar la lógica para guardar el DAC score en el backend
    // await this.aiReviewSE.saveDacScore(dacScore);
    console.log('Saving DAC score:', dacScore);
  }
}
