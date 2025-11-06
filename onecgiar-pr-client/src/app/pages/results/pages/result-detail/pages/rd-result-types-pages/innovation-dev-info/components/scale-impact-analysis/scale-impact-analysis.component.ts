import { Component, Input } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
    selector: 'app-scale-impact-analysis',
    templateUrl: './scale-impact-analysis.component.html',
    styleUrls: ['./scale-impact-analysis.component.scss'],
    standalone: false
})
export class ScaleImpactAnalysisComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example2 = null;

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  get q2() {
    return this.options?.responsible_innovation_and_scaling?.q2 as any;
  }

  get selectedOption() {
    const id = this.q2?.['radioButtonValue'];
    return this.q2?.options?.find((opt: any) => opt?.result_question_id == id);
  }

  get isNoActionsSelected(): boolean {
    return this.selectedOption?.question_text === 'No actions taken yet';
  }

  get isNoNegativeExpected(): boolean {
    return this.selectedOption?.question_text === 'No negative consequences or impacts expected';
  }

  get isComplete(): boolean {
    if (!this.q2?.['radioButtonValue']) return false;
    if (this.isNoActionsSelected || this.isNoNegativeExpected) return !!this.selectedOption?.answer_text;
    return true;
  }

  handleSelectionChange() {
    this.innovationDevInfoUtilsSE.mapBoolean(this.q2);
    const selected = this.selectedOption;
    const requiresWhy = this.isNoActionsSelected || this.isNoNegativeExpected;
    if (selected && !requiresWhy) {
      selected.answer_text = null;
    }
    this.q2?.options?.forEach((opt: any) => {
      if (!selected || opt.result_question_id !== selected.result_question_id) {
        opt.answer_text = null;
      }
    });
  }

  onWhyChange(value: string) {
    if (this.selectedOption) {
      this.selectedOption.answer_text = value;
    }
  }
}
