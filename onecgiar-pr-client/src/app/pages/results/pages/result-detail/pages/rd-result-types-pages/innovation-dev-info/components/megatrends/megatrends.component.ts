import { Component, Input } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
  selector: 'app-megatrends',
  templateUrl: './megatrends.component.html',
  styleUrls: ['./megatrends.component.scss']
})
export class MegatrendsComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example2 = null;

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}
}
