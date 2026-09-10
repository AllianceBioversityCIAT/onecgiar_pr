import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions, Intellectualpropertyrights, Q12, Q3 } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
    selector: 'app-intellectual-property-rights',
    templateUrl: './intellectual-property-rights.component.html',
    styleUrls: ['./intellectual-property-rights.component.scss'],
    standalone: false
})
export class IntellectualPropertyRightsComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  private _options: InnovationDevelopmentQuestions = new InnovationDevelopmentQuestions();

  /**
   * The API omits the questions that do not apply to a result's question version — result 51 comes
   * back without `q4` — while the template and `ngOnInit` read `qN.question_text` / `qN['value']`
   * unconditionally, which threw "Cannot read properties of undefined" on first render (the same
   * error happens on prtest). Fill the gaps with the model defaults so the shape always matches what
   * the template expects; the control still renders, exactly as before.
   */
  @Input()
  set options(value: InnovationDevelopmentQuestions) {
    const next = value ?? new InnovationDevelopmentQuestions();
    next.intellectual_property_rights ??= new Intellectualpropertyrights();
    const ipr = next.intellectual_property_rights;
    ipr.q1 ??= new Q12();
    ipr.q2 ??= new Q12();
    ipr.q3 ??= new Q3();
    ipr.q4 ??= new Q3();
    this._options = next;
  }

  get options(): InnovationDevelopmentQuestions {
    return this._options;
  }

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
