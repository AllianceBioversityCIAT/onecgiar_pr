import { Component, Input } from '@angular/core';
import { GeneralInfoBody } from '../../models/generalInfoBody';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-rd-annual-updating',
  templateUrl: './rd-annual-updating.component.html',
  styleUrls: ['./rd-annual-updating.component.scss']
})
export class RdAnnualUpdatingComponent {
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

  constructor(public api: ApiService) {}

  isDiscontinuedOptionsTrue() {
    if (!this.generalInfoBody.is_discontinued) return true;

    if (this.generalInfoBody.is_discontinued) {
      return this.generalInfoBody.discontinued_options.some(option => option.value);
    } else return false;
  }
}
