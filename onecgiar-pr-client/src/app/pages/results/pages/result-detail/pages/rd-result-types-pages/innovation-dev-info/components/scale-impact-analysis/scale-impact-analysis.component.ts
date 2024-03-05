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
  selector: 'app-scale-impact-analysis',
  standalone: true,
  templateUrl: './scale-impact-analysis.component.html',
  styleUrls: ['./scale-impact-analysis.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    FeedbackValidationDirective,
    PrRadioButtonComponent
  ]
})
export class ScaleImpactAnalysisComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example2 = null;
  radioButtonValue = null;

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  changeVar() {
    this.options.responsible_innovation_and_scaling.q2['radioButtonValue'] =
      this.radioButtonValue;
  }
}
