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

  alertTextIPSR = `
    <p class="m-0">Good to hear that the innovation is active! Please ensure to review and update the following sections:</p>
    <ol class="m-0">
      <li>Contributors:
        <ul>
          <li>Please update the initiative's Theory of Change mapping for this innovation.</li>
        </ul>
      </li>
    </ol>
  `;

  constructor(public api: ApiService) {}

  isIpsrDiscontinuedOptionsTrue(): boolean {
    return this.ipsrGeneralInfoBody?.is_discontinued ? this.ipsrGeneralInfoBody.discontinued_options.some(option => option.value) : true;
  }
}
