import { Component, Input } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
    selector: 'app-innovation-team-diversity',
    templateUrl: './innovation-team-diversity.component.html',
    styleUrls: ['./innovation-team-diversity.component.scss'],
    standalone: false
})
export class InnovationTeamDiversityComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example11 = null;

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}
}
