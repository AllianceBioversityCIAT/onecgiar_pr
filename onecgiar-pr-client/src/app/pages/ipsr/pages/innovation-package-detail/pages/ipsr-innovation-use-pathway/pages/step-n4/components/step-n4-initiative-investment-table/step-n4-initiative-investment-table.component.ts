import { Component, Input, inject } from '@angular/core';
import { IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';
import { ManageRipUnitTimeService } from '../../services/manage-rip-unit-time.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { FieldsManagerService } from '../../../../../../../../../../shared/services/fields-manager.service';

@Component({
  selector: 'app-step-n4-initiative-investment-table',
  templateUrl: './step-n4-initiative-investment-table.component.html',
  styleUrls: ['./step-n4-initiative-investment-table.component.scss'],
  standalone: false
})
export class StepN4InitiativeInvestmentTableComponent {
  @Input() body = new IpsrStep4Body();

  fieldsManagerSE = inject(FieldsManagerService);
  constructor(
    public manageRipUnitTimeSE: ManageRipUnitTimeService,
    public ipsrDataControlSE: IpsrDataControlService
  ) {}

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
