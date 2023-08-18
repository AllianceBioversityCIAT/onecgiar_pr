import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';

@Component({
  selector: 'app-gesi-innovation-assessment',
  templateUrl: './gesi-innovation-assessment.component.html',
  styleUrls: ['./gesi-innovation-assessment.component.scss']
})
export class GesiInnovationAssessmentComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example1 = null;

  constructor() {}

  ngOnInit(): void {}
}
