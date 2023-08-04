import { Component, OnInit, Input } from '@angular/core';
import { IpsrGeneralInformationBody } from 'src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/model/ipsr-general-information.model';

@Component({
  selector: 'app-rd-annual-updating',
  templateUrl: './rd-annual-updating.component.html',
  styleUrls: ['./rd-annual-updating.component.scss']
})
export class RdAnnualUpdatingComponent implements OnInit {
  @Input() ipsrGeneralInformationBody: IpsrGeneralInformationBody;
  options = [
    {
      name: 'Investment was continued',
      value: true
    },
    {
      name: 'Investment was discontinued, because',
      value: true
    }
  ];
  constructor() {}

  ngOnInit(): void {}
}
