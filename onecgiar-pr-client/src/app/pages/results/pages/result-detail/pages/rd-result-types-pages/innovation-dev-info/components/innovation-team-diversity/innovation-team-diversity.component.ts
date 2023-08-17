import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';

@Component({
  selector: 'app-innovation-team-diversity',
  templateUrl: './innovation-team-diversity.component.html',
  styleUrls: ['./innovation-team-diversity.component.scss']
})
export class InnovationTeamDiversityComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example11 = null;

  constructor() {}

  ngOnInit(): void {}
  mapBoolean(list) {
    console.log(this.example11);
    console.log(list);
  }
}
