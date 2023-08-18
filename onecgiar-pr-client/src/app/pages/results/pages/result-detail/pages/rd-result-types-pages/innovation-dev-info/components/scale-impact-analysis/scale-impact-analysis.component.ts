import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';

@Component({
  selector: 'app-scale-impact-analysis',
  templateUrl: './scale-impact-analysis.component.html',
  styleUrls: ['./scale-impact-analysis.component.scss']
})
export class ScaleImpactAnalysisComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example2 = null;

  constructor() {}

  ngOnInit(): void {}
}
