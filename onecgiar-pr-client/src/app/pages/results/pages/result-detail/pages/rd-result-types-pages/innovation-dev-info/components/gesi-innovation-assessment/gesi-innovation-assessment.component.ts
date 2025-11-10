import { Component, Input } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
    selector: 'app-gesi-innovation-assessment',
    templateUrl: './gesi-innovation-assessment.component.html',
    styleUrls: ['./gesi-innovation-assessment.component.scss'],
    standalone: false
})
export class GesiInnovationAssessmentComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example1 = null;

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  get q1() {
    return this.options?.responsible_innovation_and_scaling?.q1 as any;
  }

  get selectedOption() {
    const id = this.q1?.['radioButtonValue'];
    return this.q1?.options?.find((opt: any) => opt?.result_question_id == id);
  }

  get isNoActionsSelected(): boolean {
    return this.selectedOption?.question_text === 'No actions taken yet';
  }

  get isComplete(): boolean {
    if (!this.q1?.['radioButtonValue']) return false;
    if (this.isNoActionsSelected) return !!this.selectedOption?.answer_text;
    return true;
  }

  handleSelectionChange() {
    this.innovationDevInfoUtilsSE.mapBoolean(this.q1);
    const selected = this.selectedOption;
    if (selected && selected.question_text !== 'No actions taken yet') {
      selected.answer_text = null;
    }
    this.q1?.options?.forEach((opt: any) => {
      if (!selected || opt.result_question_id !== selected.result_question_id) {
        opt.answer_text = null;
      }
    });
  }
}
