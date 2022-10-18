import { Component } from '@angular/core';

@Component({
  selector: 'app-rd-general-information',
  templateUrl: './rd-general-information.component.html',
  styleUrls: ['./rd-general-information.component.scss']
})
export class RdGeneralInformationComponent {
  scoreList = [
    {
      id: 1,
      name: '0 - Not Targeted'
    },
    {
      id: 2,
      name: '1 - Significant'
    },
    {
      id: 3,
      name: '2 - Principal'
    }
  ];

  listvalue: any;
  constructor() {}
  print() {
    console.log(this.listvalue);
  }
}
