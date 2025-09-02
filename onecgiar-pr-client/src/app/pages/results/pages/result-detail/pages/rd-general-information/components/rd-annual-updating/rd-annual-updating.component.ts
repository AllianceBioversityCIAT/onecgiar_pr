import { Component, Input, OnInit } from '@angular/core';
import { GeneralInfoBody } from '../../models/generalInfoBody';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-rd-annual-updating',
    templateUrl: './rd-annual-updating.component.html',
    styleUrls: ['./rd-annual-updating.component.scss'],
    standalone: false
})
export class RdAnnualUpdatingComponent implements OnInit {
  @Input() generalInfoBody: GeneralInfoBody = new GeneralInfoBody();
  discontinuedOptions = [];
  options = [
    {
      name: 'Innovation development is active/investment was continued',
      value: false
    },
    {
      name: 'Innovation development is inactive/investment was discontinued, because:',
      value: true
    }
  ];

  alertText: string = '';

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.getAlertNarrative();
  }

  getAlertNarrative(): void {
    this.api.resultsSE.GET_globalNarratives('updated_innodev_guidance').subscribe(({ response }) => {
      this.alertText = response.value;
    });
  }

  isDiscontinuedOptionsTrue() {
    return this.generalInfoBody.is_discontinued ? this.generalInfoBody.discontinued_options.some(option => option.value) : true;
  }
}
