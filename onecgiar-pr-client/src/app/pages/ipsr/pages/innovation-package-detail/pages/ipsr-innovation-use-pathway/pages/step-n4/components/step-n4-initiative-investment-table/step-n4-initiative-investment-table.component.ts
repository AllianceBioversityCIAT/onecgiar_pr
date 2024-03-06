import { Component, Input } from '@angular/core';
import { IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';
import { ManageRipUnitTimeService } from '../../services/manage-rip-unit-time.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrInputComponent } from '../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrRadioButtonComponent } from '../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';

@Component({
  selector: 'app-step-n4-initiative-investment-table',
  standalone: true,
  templateUrl: './step-n4-initiative-investment-table.component.html',
  styleUrls: ['./step-n4-initiative-investment-table.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    PrInputComponent,
    PrRadioButtonComponent
  ]
})
export class StepN4InitiativeInvestmentTableComponent {
  @Input() body = new IpsrStep4Body();

  constructor(public manageRipUnitTimeSE: ManageRipUnitTimeService) {}

  syncLocalData() {
    this.body.bilateral_expected_time = this.body.initiative_expected_time;
    this.body.bilateral_unit_time_id = this.body.initiative_unit_time_id;
    this.body.partner_expected_time = this.body.initiative_expected_time;
    this.body.partner_unit_time_id = this.body.initiative_unit_time_id;
  }

  usdQuestionDescription() {
    return `<li>The USD-value here can be an estimation and will be used to get an overall impression of the expected investment in improving the Scaling Readiness of the innovation package.</li><li>The investment estimation will by no means be used in official financial reporting or planning.</li>`;
  }
}
