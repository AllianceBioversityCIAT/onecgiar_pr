import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-gesi-innovation-assessment',
  templateUrl: './gesi-innovation-assessment.component.html',
  styleUrls: ['./gesi-innovation-assessment.component.scss']
})
export class GesiInnovationAssessmentComponent implements OnInit {
  @Input() body: any;
  example1 = null;
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
    },
    {
      description: 'radio desc 4',
      id: 4
    }
  ];
  constructor() {}

  ngOnInit(): void {}
}
