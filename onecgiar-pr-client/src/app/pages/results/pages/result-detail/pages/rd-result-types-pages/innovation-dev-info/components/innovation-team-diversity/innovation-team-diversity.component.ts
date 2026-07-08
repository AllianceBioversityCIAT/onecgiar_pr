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

  // P2-3060: completeness for the required team-diversity question.
  // Complete when an option has been selected (radioButtonValue is set).
  isTeamDiversityComplete(): boolean {
    const value = (this.options?.innovation_team_diversity as any)?.['radioButtonValue'];
    return value !== null && value !== undefined && value !== '';
  }
}
