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

  alertText = `
    <p class="m-0">Good to hear that the innovation is active! Please ensure to review and update the following sections:</p>
    <ol class="m-0">
      <li>Theory of Change:
        <ul>
          <li>Please update the initiative's Theory of Change mapping for this innovation.</li>
        </ul>
      </li>
      <li>Innovation Development Info:
        <ul>
          <li>Add information to the new field regarding the expected contribution to CGIAR Megatrends.</li>
          <li>Include details in the new field for the anticipated demand/problem to be addressed for Innovation users.</li>
        </ul>
      </li>
    </ol>
  `;

  constructor(public api: ApiService) {}

  isDiscontinuedOptionsTrue() {
    if (!this.generalInfoBody.is_discontinued) return true;

    if (this.generalInfoBody.is_discontinued) {
      return this.generalInfoBody.discontinued_options.some(option => option.value);
    } else return false;
  }
}
