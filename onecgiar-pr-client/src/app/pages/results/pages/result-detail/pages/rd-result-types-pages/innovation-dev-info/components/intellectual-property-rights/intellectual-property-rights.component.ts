import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
    selector: 'app-intellectual-property-rights',
    templateUrl: './intellectual-property-rights.component.html',
    styleUrls: ['./intellectual-property-rights.component.scss'],
    standalone: false
})
export class IntellectualPropertyRightsComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions = new InnovationDevelopmentQuestions();

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  ngOnInit(): void {
    this.options.intellectual_property_rights.q1['value'] = null;
    this.options.intellectual_property_rights.q2['value'] = null;
    this.options.intellectual_property_rights.q3['value'] = null;
    this.options.intellectual_property_rights.q4['value'] = null;
  }

  clearIntellectualPropertyRights(): void {
    if (this.options.intellectual_property_rights.q1['radioButtonValue'] === '32') {
      this.options.intellectual_property_rights.q2['radioButtonValue'] = null;
      this.options.intellectual_property_rights.q3['radioButtonValue'] = null;

      this.options.intellectual_property_rights.q2.options.forEach(option => {
        option.answer_boolean = option['saved'] ? false : null;
      });
      this.options.intellectual_property_rights.q3.options.forEach(option => {
        option.answer_boolean = option['saved'] ? false : null;
      });
    } else if (this.options.intellectual_property_rights.q2['radioButtonValue'] === '35') {
      this.options.intellectual_property_rights.q3['radioButtonValue'] = null;

      this.options.intellectual_property_rights.q3.options.forEach(option => {
        option.answer_boolean = option['saved'] ? false : null;
      });
    }
  }

  private get q4() {
    return this.options?.intellectual_property_rights?.q4 as any;
  }

  private get selectedOptionQ4() {
    const id = this.q4?.['radioButtonValue'];
    return this.q4?.options?.find((opt: any) => opt?.result_question_id == id);
  }

  handleSelectionChangeQ4() {
    this.innovationDevInfoUtilsSE.mapBoolean(this.q4);
    const selected = this.selectedOptionQ4;
    const requiresText = selected?.question_text === 'No';
    if (selected && !requiresText) {
      selected.answer_text = null;
    }
    this.q4?.options?.forEach((opt: any) => {
      if (!selected || opt.result_question_id !== selected.result_question_id) {
        opt.answer_text = null;
      }
    });
  }
}
