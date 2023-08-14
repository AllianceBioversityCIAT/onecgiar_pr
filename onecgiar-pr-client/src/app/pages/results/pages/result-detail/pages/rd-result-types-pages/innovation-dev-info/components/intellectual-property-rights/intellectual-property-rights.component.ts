import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-intellectual-property-rights',
  templateUrl: './intellectual-property-rights.component.html',
  styleUrls: ['./intellectual-property-rights.component.scss']
})
export class IntellectualPropertyRightsComponent implements OnInit {
  /*
Q1 - Do you expect private sector engagement in innovation development and/or scaling?
  Yes (go to Q2)
  Not sure (go to Q2)
  No (go to Next Section INNOVATION DEVELOPER)

Q2 - Do you consider applying for formal Intellectual Property Rights?
  Yes (go to Q3)
  Not sure (go to Q3)
  No (go to Next Section INNOVATION DEVELOPER)
*This question will be displayed depending on the answer for Q1*

Q3 - Would you like to receive support from a "Private Partnership for Impact" expert?
  Support can include expertise in Intellectual Property management, and/or the development of value propositions and business models, and/or support in negotiations with private partners
  Yes, please contact me.
  No, not now.
*This question will be displayed depending on the answer for Q2*
  */

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
