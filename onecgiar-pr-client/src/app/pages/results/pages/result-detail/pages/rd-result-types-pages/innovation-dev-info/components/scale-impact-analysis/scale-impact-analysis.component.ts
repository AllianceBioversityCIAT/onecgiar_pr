import { Component, Input } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
  selector: 'app-scale-impact-analysis',
  templateUrl: './scale-impact-analysis.component.html',
  styleUrls: ['./scale-impact-analysis.component.scss']
})
export class ScaleImpactAnalysisComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example2 = null;

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}
}
