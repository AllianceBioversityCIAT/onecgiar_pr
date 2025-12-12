import { Component, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AiReviewService } from '../../../../../../shared/services/api/ai-review.service';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ScoreService } from '../../../../../../shared/services/global/score.service';

@Component({
  selector: 'app-ai-review',
  imports: [DialogModule, ButtonModule, FormsModule, CommonModule, CustomFieldsModule],
  templateUrl: './ai-review.component.html',
  styleUrl: './ai-review.component.scss'
})
export class AiReviewComponent {
  aiReviewSE = inject(AiReviewService);
  scoreSE = inject(ScoreService);

  // Field values
  titleCurrentVersion = 'Small-scale Fisheries and Aquaculture Ontology';
  descriptionCurrentVersion =
    'This result introduces a conceptual framework for the sustainable management of small-scale fisheries and aquaculture. It establishes a standardized ontology to classify species, practices, and environmental factors, supporting evidence-based decisions that strengthen local food systems, protect marine biodiversity, and sustain coastal livelihoods.';
  innovationShortTitleCurrentVersion = '';

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
    try {
      // Obtener el resultId del servicio de data control
      const resultId = this.aiReviewSE.dataControlSE.currentResultSignal().id;

      // Convertir tag_id a número si es string
      const tagId = typeof dacScore.tag_id === 'string' ? parseInt(dacScore.tag_id, 10) : dacScore.tag_id;

      // Preparar solo el DAC score específico que se está guardando
      const dacScoreToSave = {
        field_name: dacScore.field_name,
        tag_id: tagId,
        impact_area_id: tagId === 3 && dacScore.impact_area_id ? dacScore.impact_area_id : null,
        change_reason: 'Updated after AI review section'
      };

      // Guardar solo este DAC score (objeto directo, no array)
      await this.aiReviewSE.POST_saveDacScore(resultId, dacScoreToSave);

      // Deshabilitar el botón de guardar solo para este score
      dacScore.canSave = false;

      console.log('DAC score saved successfully:', dacScoreToSave);
    } catch (error) {
      console.error('Error saving DAC score:', error);
    }
  }
}
