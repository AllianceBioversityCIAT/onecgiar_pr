import { Component } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';

@Component({
  selector: 'app-outcome-indicator-home',
  templateUrl: './outcome-indicator-home.component.html',
  styleUrl: './outcome-indicator-home.component.scss'
})
export class OutcomeIndicatorHomeComponent {
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
    console.info('Export to Excel');
  }
}
