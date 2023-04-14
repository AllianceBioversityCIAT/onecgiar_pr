import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-step-n4-bilateral-investment-table',
  templateUrl: './step-n4-bilateral-investment-table.component.html',
  styleUrls: ['./step-n4-bilateral-investment-table.component.scss']
})
export class StepN4BilateralInvestmentTableComponent implements OnInit {
  list: any[] = [{}];

  constructor() {}

  ngOnInit(): void {}

  addItem() {
    this.list.push({});
  }
}
