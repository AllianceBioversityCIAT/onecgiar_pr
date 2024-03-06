import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-ipsr-annual-updating',
  templateUrl: './ipsr-annual-updating.component.html',
  styleUrls: ['./ipsr-annual-updating.component.scss']
})
export class IpsrAnnualUpdatingComponent {
  @Input() ipsrGeneralInfoBody: any;
  options = [
    {
      name: 'Innovation Package is active/investment was continued.',
      value: false
    },
    {
      name: 'Innovation Package is inactive/investment was discontinued, because:',
      value: true
    }
  ];

  constructor(public api: ApiService) {}

  isIpsrDiscontinuedOptionsTrue() {
    if (!this.ipsrGeneralInfoBody.is_discontinued) return true;

    if (this.ipsrGeneralInfoBody.is_discontinued) {
      return this.ipsrGeneralInfoBody.discontinued_options.some(option => option.value);
    } else return false;
  }
}
