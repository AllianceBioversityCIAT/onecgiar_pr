import { Component } from '@angular/core';
import { ResultsNotificationsService } from '../../results-notifications.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-requests',
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.scss']
})
export class RequestsComponent {
  constructor(public resultsNotificationsSE: ResultsNotificationsService, public router: Router) {}

  clearFiltersAndUpdateResults() {
    if (this.resultsNotificationsSE.initiativeIdFilter || this.resultsNotificationsSE.searchFilter) {
      this.resultsNotificationsSE.resetFilters();
    }
  }
}
