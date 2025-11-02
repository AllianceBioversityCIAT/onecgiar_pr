import { Component, Input } from '@angular/core';
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

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}
}


