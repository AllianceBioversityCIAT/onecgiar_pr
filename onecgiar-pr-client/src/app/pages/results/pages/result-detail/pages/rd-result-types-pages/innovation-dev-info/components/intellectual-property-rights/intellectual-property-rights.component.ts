import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';

@Component({
  selector: 'app-intellectual-property-rights',
  templateUrl: './intellectual-property-rights.component.html',
  styleUrls: ['./intellectual-property-rights.component.scss']
})
export class IntellectualPropertyRightsComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();

  questions = {
    q1: {
      value: null,
      id: 1,
      question: 'Do you expect private sector engagement in innovation development and/or scaling?',
      answers: [
        {
          id: 1,
          answer: 'Yes (go to Q2)'
        },
        {
          id: 2,
          answer: 'Not sure (go to Q2)'
        },
        {
          id: 3,
          answer: 'No (go to Next Section INNOVATION DEVELOPER)'
        }
      ]
    },
    q2: {
      value: null,
      id: 2,
      question: 'Do you consider applying for formal Intellectual Property Rights?',
      answers: [
        {
          id: 1,
          answer: 'Yes (go to Q3)'
        },
        {
          id: 2,
          answer: 'Not sure (go to Q3)'
        },
        {
          id: 3,
          answer: 'No (go to Next Section INNOVATION DEVELOPER)'
        }
      ]
    },
    q3: {
      value: null,
      id: 3,
      question: 'Would you like to receive support from a "Private Partnership for Impact" expert?',
      description: 'Support can include expertise in Intellectual Property management, and/or the development of value propositions and business models, and/or support in negotiations with private partners',
      answers: [
        {
          id: 1,
          answer: 'Yes, please contact me.'
        },
        {
          id: 2,
          answer: 'No, not now.'
        }
      ]
    }
  };
  constructor() {}

  ngOnInit(): void {}
}
