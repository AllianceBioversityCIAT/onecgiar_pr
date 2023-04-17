import { Component, Input, OnInit } from '@angular/core';
import { BilateralexpectedinvestmentStep4, IpsrStep4Body } from '../../model/Ipsr-step-4-body.model';

@Component({
  selector: 'app-step-n4-bilateral-investment-table',
  templateUrl: './step-n4-bilateral-investment-table.component.html',
  styleUrls: ['./step-n4-bilateral-investment-table.component.scss']
})
export class StepN4BilateralInvestmentTableComponent implements OnInit {
  @Input() body = new IpsrStep4Body();
  showModal = false;

  constructor() {}

  ngOnInit(): void {}
}
