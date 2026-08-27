import { Component, Input } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

/**
 * P2-3467 — single-choice stage question of the 2026 Innovation Development form.
 *
 * Renders one of the two questions that replace the GESI and risk open-text ones
 * (`q1` = GESI stage, `q2` = risk stage). Picking "Not applicable" reveals a
 * required reason capped at 50 words.
 *
 * Only rendered from the 2026 phase onwards — earlier phases keep
 * `app-gesi-innovation-assessment` / `app-scale-impact-analysis` on the same slots.
 */
@Component({
  selector: 'app-stage-assessment',
  templateUrl: './stage-assessment.component.html',
  standalone: false
})
export class StageAssessmentComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  /** Which question of the "Responsible innovation and scaling" group to render. */
  @Input() questionKey: 'q1' | 'q2' = 'q1';

  /** Option label that reveals the required reason. Must match the stored text. */
  static readonly NOT_APPLICABLE_LABEL = 'Not applicable';

  /** Word cap on the reason, per the story. */
  readonly maxReasonWords = 50;

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  get question() {
    return this.options?.responsible_innovation_and_scaling?.[this.questionKey] as any;
  }

  get selectedOption() {
    const id = this.question?.['radioButtonValue'];
    return this.question?.options?.find((opt: any) => opt?.result_question_id == id);
  }

  get isNotApplicableSelected(): boolean {
    return this.selectedOption?.question_text === StageAssessmentComponent.NOT_APPLICABLE_LABEL;
  }

  get isComplete(): boolean {
    if (!this.question?.['radioButtonValue']) return false;
    if (this.isNotApplicableSelected) return !!this.selectedOption?.answer_text;
    return true;
  }

  handleSelectionChange() {
    this.innovationDevInfoUtilsSE.mapBoolean(this.question);
    const selected = this.selectedOption;
    // The reason belongs to "Not applicable" only; clear it everywhere else so a
    // previous answer cannot travel with a different selection.
    this.question?.options?.forEach((opt: any) => {
      if (!selected || opt.result_question_id !== selected.result_question_id) {
        opt.answer_text = null;
      }
    });
    if (selected && !this.isNotApplicableSelected) {
      selected.answer_text = null;
    }
  }
}
