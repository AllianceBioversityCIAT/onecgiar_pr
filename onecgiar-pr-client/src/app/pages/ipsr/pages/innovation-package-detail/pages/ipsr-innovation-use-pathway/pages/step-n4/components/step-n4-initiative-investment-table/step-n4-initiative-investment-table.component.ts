import { Component, Input, OnInit } from '@angular/core';
import { IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';
import { ManageRipUnitTimeService } from '../../services/manage-rip-unit-time.service';

@Component({
  selector: 'app-step-n4-initiative-investment-table',
  templateUrl: './step-n4-initiative-investment-table.component.html',
  styleUrls: ['./step-n4-initiative-investment-table.component.scss']
})
export class StepN4InitiativeInvestmentTableComponent implements OnInit {
  @Input() body = new IpsrStep4Body();
  constructor(public manageRipUnitTimeSE: ManageRipUnitTimeService) {}

  ngOnInit(): void {}
}
