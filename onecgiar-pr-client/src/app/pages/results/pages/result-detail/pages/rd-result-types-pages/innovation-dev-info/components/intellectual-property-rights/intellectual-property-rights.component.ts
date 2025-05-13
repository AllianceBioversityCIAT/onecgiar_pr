import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
  selector: 'app-intellectual-property-rights',
  templateUrl: './intellectual-property-rights.component.html',
  styleUrls: ['./intellectual-property-rights.component.scss']
})
export class IntellectualPropertyRightsComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions = new InnovationDevelopmentQuestions();

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  ngOnInit(): void {
    this.options.intellectual_property_rights.q1['value'] = null;
    this.options.intellectual_property_rights.q2['value'] = null;
    this.options.intellectual_property_rights.q3['value'] = null;
  }

  // Create a function to clear q2 and q3 if q1 is equal to '32' and clear q3 if q2 is equal to '35'
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
}
