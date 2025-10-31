import { Component, Input } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
    selector: 'app-partners-policies-safeguards',
    templateUrl: './partners-policies-safeguards.component.html',
    styleUrls: ['./partners-policies-safeguards.component.scss'],
    standalone: false
})
export class PartnersPoliciesSafeguardsComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}
}


