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
}
