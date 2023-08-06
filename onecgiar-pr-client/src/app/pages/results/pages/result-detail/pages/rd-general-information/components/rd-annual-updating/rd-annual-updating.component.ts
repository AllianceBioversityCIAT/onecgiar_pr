import { Component, OnInit, Input } from '@angular/core';
import { GeneralInfoBody } from '../../models/generalInfoBody';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-rd-annual-updating',
  templateUrl: './rd-annual-updating.component.html',
  styleUrls: ['./rd-annual-updating.component.scss']
})
export class RdAnnualUpdatingComponent implements OnInit {
  @Input() generalInfoBody: GeneralInfoBody = new GeneralInfoBody();
  discontinuedOptions = [];
  options = [
    {
      name: 'Investment was continued',
      value: false
    },
    {
      name: 'Investment was discontinued, because',
      value: true
    }
  ];
  constructor(public api: ApiService) {}

  ngOnInit(): void {}
}
