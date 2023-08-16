import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';

@Component({
  selector: 'app-innovation-team-diversity',
  templateUrl: './innovation-team-diversity.component.html',
  styleUrls: ['./innovation-team-diversity.component.scss']
})
export class InnovationTeamDiversityComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  example11 = null;
  list = [
    {
      description: 'radio desc 1',
      subLabel: 'sublabel 1',
      id: 1,
      subOptions: [
        {
          description: 'check desc 0',
          id: 0,
          value: null
        },
        {
          description: 'check desc 1',
          id: 1,
          value: null
        },
        {
          description: 'check desc 2',
          id: 2,
          value: null
        },
        {
          description: 'check desc 3',
          id: 3,
          value: null
        },
        {
          description: 'check desc 4',
          id: 4,
          value: null
        },
        {
          description: 'Other:',
          id: 5,
          value: null,
          question_type: 'text'
        }
      ]
    },
    {
      description: 'radio desc 2',
      id: 2
    },
    {
      description: 'radio desc 3',
      id: 3
    }
  ];

  constructor() {}

  ngOnInit(): void {}
}
