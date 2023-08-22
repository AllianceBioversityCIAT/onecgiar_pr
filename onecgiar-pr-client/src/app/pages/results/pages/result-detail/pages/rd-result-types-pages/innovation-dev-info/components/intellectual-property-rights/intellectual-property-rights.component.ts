import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

@Component({
  selector: 'app-intellectual-property-rights',
  templateUrl: './intellectual-property-rights.component.html',
  styleUrls: ['./intellectual-property-rights.component.scss']
})
export class IntellectualPropertyRightsComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions = new InnovationDevelopmentQuestions();

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  ngOnInit(): void {
    this.options.intellectual_property_rights.q1['value'] = null;
    this.options.intellectual_property_rights.q2['value'] = null;
    this.options.intellectual_property_rights.q3['value'] = null;
  }
}
