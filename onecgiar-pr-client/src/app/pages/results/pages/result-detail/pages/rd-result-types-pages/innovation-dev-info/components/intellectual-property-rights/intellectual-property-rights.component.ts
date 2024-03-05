import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';
import { CommonModule } from '@angular/common';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-intellectual-property-rights',
  standalone: true,
  templateUrl: './intellectual-property-rights.component.html',
  styleUrls: ['./intellectual-property-rights.component.scss'],
  imports: [
    CommonModule,
    PrFieldHeaderComponent,
    PrRadioButtonComponent,
    FormsModule
  ]
})
export class IntellectualPropertyRightsComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions =
    new InnovationDevelopmentQuestions();

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  ngOnInit(): void {
    this.options.intellectual_property_rights.q1['value'] = null;
    this.options.intellectual_property_rights.q2['value'] = null;
    this.options.intellectual_property_rights.q3['value'] = null;
  }

  // Create a function to clear q2 and q3 if q1 is equal to '32' and clear q3 if q2 is equal to '35'
  clearIntellectualPropertyRights(): void {
    //(this.options.intellectual_property_rights.q1['radioButtonValue']);
    if (
      this.options.intellectual_property_rights.q1['radioButtonValue'] === '32'
    ) {
      this.options.intellectual_property_rights.q2['radioButtonValue'] = null;
      this.options.intellectual_property_rights.q3['radioButtonValue'] = null;

      this.options.intellectual_property_rights.q2.options.forEach(option => {
        option.answer_boolean = option['saved'] ? false : null;
      });
      this.options.intellectual_property_rights.q3.options.forEach(option => {
        option.answer_boolean = option['saved'] ? false : null;
      });
    } else if (
      this.options.intellectual_property_rights.q2['radioButtonValue'] === '35'
    ) {
      this.options.intellectual_property_rights.q3['radioButtonValue'] = null;

      this.options.intellectual_property_rights.q3.options.forEach(option => {
        option.answer_boolean = option['saved'] ? false : null;
      });
    }
  }
}
