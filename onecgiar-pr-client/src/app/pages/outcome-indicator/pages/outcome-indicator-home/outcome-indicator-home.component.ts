import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CommonModule, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-outcome-indicator-home',
  templateUrl: './outcome-indicator-home.component.html',
  styleUrl: './outcome-indicator-home.component.scss',
  standalone: true,
  imports: [NgClass, RouterLink]
})
export class OutcomeIndicatorHomeComponent implements OnInit {
  initiativeIdFilter = null;
  allInitiatives = [];

  constructor(public api: ApiService) {}

  ngOnInit() {
    this.GET_AllInitiatives();
    this.api.dataControlSE.getCurrentPhases();

    if (!this.api.rolesSE.isAdmin) {
      this.initiativeIdFilter = this.api.dataControlSE.myInitiativesList[0]?.initiative_id;
    }
  }

  GET_AllInitiatives() {
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
      this.initiativeIdFilter = this.allInitiatives[0]?.initiative_id;
    });
  }

  exportToExcel() {
    console.error('Export to Excel');
  }
}
