import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';
import { CommonModule } from '@angular/common';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FeedbackValidationDirective } from '../../../../../../../../../shared/directives/feedback-validation.directive';

@Component({
  selector: 'app-gesi-innovation-assessment',
  standalone: true,
  templateUrl: './gesi-innovation-assessment.component.html',
  styleUrls: ['./gesi-innovation-assessment.component.scss'],
  imports: [CommonModule, PrFieldHeaderComponent, FeedbackValidationDirective]
})
export class GesiInnovationAssessmentComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example1 = null;

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  ngOnInit(): void {}
}
