import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';
import { CommonModule } from '@angular/common';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FeedbackValidationDirective } from '../../../../../../../../../shared/directives/feedback-validation.directive';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gesi-innovation-assessment',
  standalone: true,
  templateUrl: './gesi-innovation-assessment.component.html',
  styleUrls: ['./gesi-innovation-assessment.component.scss'],
  imports: [
    CommonModule,
    PrFieldHeaderComponent,
    FeedbackValidationDirective,
    PrRadioButtonComponent,
    FormsModule
  ]
})
export class GesiInnovationAssessmentComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example1 = null;
  radioButtonValue = null;
  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {
    this.radioButtonValue =
      this.options?.responsible_innovation_and_scaling?.q1['radioButtonValue'];
  }
  ngOnInit(): void {
    this.radioButtonValue =
      this.options?.responsible_innovation_and_scaling?.q1['radioButtonValue'];
    console.log(
      this.options.responsible_innovation_and_scaling.q1['radioButtonValue']
    );
  }
  changeVar() {
    this.options.responsible_innovation_and_scaling.q1['radioButtonValue'] =
      this.radioButtonValue;
  }
}
