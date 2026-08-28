import { Component, inject } from '@angular/core';
import { PrDialogComponent } from '../../../../../../shared/components/pr-dialog/pr-dialog.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AiReviewService, DacScorePayload, DacScores } from '../../../../../../shared/services/api/ai-review.service';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { GetImpactAreasScoresService } from '../../../../../../shared/services/global/get-impact-areas-scores.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';

@Component({
  selector: 'app-ai-review',
  imports: [PrDialogComponent, FormsModule, CommonModule, CustomFieldsModule],
  templateUrl: './ai-review.component.html',
  styleUrl: './ai-review.component.scss'
})
export class AiReviewComponent {
  aiReviewSE = inject(AiReviewService);
  scoreSE = inject(ScoreService);
  getImpactAreasScoresComponents = inject(GetImpactAreasScoresService);
  alertsFe = inject(CustomizedAlertsFeService);

  isValidatingAll = false;

  // Field values
  titleCurrentVersion = 'Small-scale Fisheries and Aquaculture Ontology';
  descriptionCurrentVersion =
    'This result introduces a conceptual framework for the sustainable management of small-scale fisheries and aquaculture. It establishes a standardized ontology to classify species, practices, and environmental factors, supporting evidence-based decisions that strengthen local food systems, protect marine biodiversity, and sustain coastal livelihoods.';
  innovationShortTitleCurrentVersion = '';

  moveTextToInput(field: any) {
    field.canSave = true;
    field.original_text = field.proposed_text;
  }

  onResultVersionChange(dacScore: DacScores, value: string | number) {
    // Actualizar el tag_id del dacScore
    dacScore.tag_id = value;
    dacScore.canSave = true;

    // Si no es Principal (3), limpiar los componentes seleccionados
    if (String(value) !== '3') {
      dacScore.impact_area_id = [];
    }
  }

  onComponentChange(dacScore: DacScores, value: string | number) {
    // Alternar el componente en la lista: se agrega si no está, se quita si ya estaba
    const currentIds = dacScore.impact_area_id ?? [];

    dacScore.impact_area_id = this.isComponentSelected(dacScore, value)
      ? currentIds.filter(id => String(id) !== String(value))
      : [...currentIds, value];

    dacScore.canSave = true;
  }

  isPrincipal(dacScore: DacScores): boolean {
    return Number(dacScore.tag_id) === 3;
  }

  isComponentSelected(dacScore: DacScores, componentId: string | number): boolean {
    return (dacScore.impact_area_id ?? []).some(id => String(id) === String(componentId));
  }

  /**
   * El badge se recalcula con lo que hay en pantalla, no con el valor congelado al abrir el diálogo.
   * Un card está validado cuando la IA lo aprobó o el usuario ya persistió su cambio,
   * y vuelve a "Needs improvement" en cuanto queda una edición sin guardar.
   */
  isCardValidated(dacScore: DacScores): boolean {
    if (dacScore.canSave) return false;

    return Boolean(dacScore.is_validated || dacScore.user_validated);
  }

  get pendingDacScores(): DacScores[] {
    return this.aiReviewSE.dacScores().filter(dacScore => dacScore.canSave);
  }

  get hasPendingChanges(): boolean {
    return this.pendingDacScores.length > 0;
  }

  getDacScoreByFieldName(fieldName: string) {
    return this.aiReviewSE.dacScores().find(score => score.field_name === fieldName);
  }

  getComponentListByFieldName(fieldName: string) {
    const fieldNameLower = fieldName.toLowerCase();

    if (fieldNameLower.includes('gender')) {
      return this.getImpactAreasScoresComponents.genderTagScoreList();
    } else if (fieldNameLower.includes('climate')) {
      return this.getImpactAreasScoresComponents.climateTagScoreList();
    } else if (fieldNameLower.includes('nutrition')) {
      return this.getImpactAreasScoresComponents.nutritionTagScoreList();
    } else if (fieldNameLower.includes('environment')) {
      return this.getImpactAreasScoresComponents.environmentalBiodiversityTagScoreList();
    } else if (fieldNameLower.includes('poverty')) {
      return this.getImpactAreasScoresComponents.povertyTagScoreList();
    }

    return [];
  }

  getDacScoreTitle(dacScore: DacScores): string {
    return dacScore.display_title || dacScore.field_name;
  }

  /** Principal (3) exige al menos un componente seleccionado */
  private isIncomplete(dacScore: DacScores): boolean {
    return Number(dacScore.tag_id) === 3 && (dacScore.impact_area_id ?? []).length === 0;
  }

  private buildDacScorePayload(dacScore: DacScores): DacScorePayload {
    const tagId = Number(dacScore.tag_id);

    return {
      field_name: dacScore.field_name,
      tag_id: tagId,
      impact_area_id: tagId === 3 ? (dacScore.impact_area_id ?? []).map(id => Number(id)) : [],
      change_reason: 'Updated after AI review section'
    };
  }

  private async persistDacScore(dacScore: DacScores) {
    const resultId = this.aiReviewSE.dataControlSE.currentResultSignal().id;

    await this.aiReviewSE.PATCH_saveDacScore(resultId, this.buildDacScorePayload(dacScore));

    dacScore.canSave = false;
    dacScore.user_validated = true;
  }

  private showAlert(id: string, status: 'error' | 'success', title: string, description: string) {
    this.alertsFe.show({ id, title, description, status, hideCancelButton: true });
  }

  async onSaveDacScore(dacScore: DacScores) {
    if (this.isIncomplete(dacScore)) {
      this.showAlert(
        'ai-review-component-required',
        'error',
        'Component required',
        `Select at least one component for "${this.getDacScoreTitle(dacScore)}" before saving.`
      );
      return;
    }

    try {
      await this.persistDacScore(dacScore);
    } catch (error) {
      console.error('Error saving DAC score:', error);
      this.showAlert(
        'ai-review-save-error',
        'error',
        'Changes not saved',
        `"${this.getDacScoreTitle(dacScore)}" could not be saved. Please try again.`
      );
    }
  }

  async onValidateAll() {
    if (this.isValidatingAll || !this.hasPendingChanges) return;

    const pending = this.pendingDacScores;
    const incomplete = pending.filter(dacScore => this.isIncomplete(dacScore));
    const failed: string[] = [];

    this.isValidatingAll = true;

    for (const dacScore of pending.filter(item => !this.isIncomplete(item))) {
      try {
        await this.persistDacScore(dacScore);
      } catch (error) {
        console.error('Error saving DAC score:', error);
        failed.push(this.getDacScoreTitle(dacScore));
      }
    }

    this.isValidatingAll = false;

    if (incomplete.length) {
      this.showAlert(
        'ai-review-validate-all-incomplete',
        'error',
        'Component required',
        `Select at least one component for: ${incomplete.map(item => this.getDacScoreTitle(item)).join(', ')}.`
      );
      return;
    }

    if (failed.length) {
      this.showAlert(
        'ai-review-validate-all-error',
        'error',
        'Some changes were not saved',
        `The following impact areas could not be saved: ${failed.join(', ')}. Please try again.`
      );
      return;
    }

    this.showAlert('ai-review-validate-all-success', 'success', 'Changes applied', 'The impact areas were updated in the result.');
  }
}
