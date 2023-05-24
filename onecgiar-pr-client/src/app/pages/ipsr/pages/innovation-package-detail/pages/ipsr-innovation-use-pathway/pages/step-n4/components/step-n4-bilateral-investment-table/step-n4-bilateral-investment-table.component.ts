import { Component, Input, OnInit } from '@angular/core';
import { BilateralexpectedinvestmentStep4, IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';
import { ManageRipUnitTimeService } from '../../services/manage-rip-unit-time.service';
import { RolesService } from 'src/app/shared/services/global/roles.service';

@Component({
  selector: 'app-step-n4-bilateral-investment-table',
  templateUrl: './step-n4-bilateral-investment-table.component.html',
  styleUrls: ['./step-n4-bilateral-investment-table.component.scss']
})
export class StepN4BilateralInvestmentTableComponent implements OnInit {
  @Input() body = new IpsrStep4Body();
  showModal = false;

  constructor(public rolesSE: RolesService, public manageRipUnitTimeSE: ManageRipUnitTimeService) {}

  ngOnInit(): void {
  }

  deleteBilateral(bilateral) {
    bilateral.is_active = false;
  }
}
