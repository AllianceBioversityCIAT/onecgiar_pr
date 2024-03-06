import { Component, Input, OnInit } from '@angular/core';
import { IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';
import { ManageRipUnitTimeService } from '../../services/manage-rip-unit-time.service';
import { RolesService } from 'src/app/shared/services/global/roles.service';
import { IpsrDataControlService } from 'src/app/pages/ipsr/services/ipsr-data-control.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { StepN4EditBilateralComponent } from './modal/step-n4-edit-bilateral/step-n4-edit-bilateral.component';
import { PrInputComponent } from '../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrRadioButtonComponent } from '../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { NoDataTextComponent } from '../../../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { StepN4AddBilateralComponent } from './modal/step-n4-add-bilateral/step-n4-add-bilateral.component';

@Component({
  selector: 'app-step-n4-bilateral-investment-table',
  standalone: true,
  templateUrl: './step-n4-bilateral-investment-table.component.html',
  styleUrls: ['./step-n4-bilateral-investment-table.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    StepN4EditBilateralComponent,
    PrInputComponent,
    PrRadioButtonComponent,
    NoDataTextComponent,
    StepN4AddBilateralComponent
  ]
})
export class StepN4BilateralInvestmentTableComponent implements OnInit {
  @Input() body = new IpsrStep4Body();
  showModal = false;
  isInitiative = true;

  constructor(
    public rolesSE: RolesService,
    public manageRipUnitTimeSE: ManageRipUnitTimeService,
    public ipsrDataControlSE: IpsrDataControlService,
    public api: ApiService
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.isInitiative = this.api.rolesSE.validateInitiative(
        this.ipsrDataControlSE.initiative_id
      );
    }, 500);
  }

  deleteBilateral(bilateral) {
    bilateral.is_active = false;
  }

  hasElementsWithId(list, attr) {
    const finalList = this.api.rolesSE.readOnly
      ? list.filter(item => item[attr])
      : list.filter(item => item.is_active != false);
    return finalList.length;
  }
}
