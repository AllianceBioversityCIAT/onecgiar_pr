import { Component, Input, computed, signal } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
    selector: 'app-assumptions-examination',
    templateUrl: './assumptions-examination.component.html',
    styleUrls: ['./assumptions-examination.component.scss'],
    standalone: false
})
export class AssumptionsExaminationComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;

  isYesActions = signal<boolean>(false);
  isNoActions = signal<boolean>(false);
  isNotNecessary = signal<boolean>(false);
  isTooEarly = signal<boolean>(false);

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  get q3() {
    return this.options?.responsible_innovation_and_scaling?.q3 as any;
  }

  get selectedOption() {
    const id = this.q3?.['radioButtonValue'];
    return this.q3?.options?.find((opt: any) => opt?.result_question_id == id);
  }

  showWhyInput = computed<boolean>(() => this.isYesActions() || this.isNoActions() || this.isNotNecessary());

  get isComplete(): boolean {
    if (!this.q3?.['radioButtonValue']) return false;
    if (this.showWhyInput()) return !!this.selectedOption?.answer_text;
    return true;
  }

  handleSelectionChange() {
    this.innovationDevInfoUtilsSE.mapBoolean(this.q3);
    const selected = this.selectedOption;
    const label = selected?.question_text || '';
    this.isYesActions.set(label === 'Yes, the following actions have been taken:');
    this.isNoActions.set(label === 'No actions taken yet');
    this.isNotNecessary.set(label === 'Not considered necessary for this innovation');
    this.isTooEarly.set(label === 'It is too early to determine this');

    const requiresWhy = this.showWhyInput();
    if (selected && !requiresWhy) {
      selected.answer_text = null;
    }
    this.q3?.options?.forEach((opt: any) => {
      if (!selected || opt.result_question_id !== selected.result_question_id) {
        opt.answer_text = null;
      }
    });
  }

}


