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
    if (!this.router.url.includes('sent')) {
      this.resultsNotificationsSE.get_sent_notifications();
    }

    if (!this.router.url.includes('received')) {
      this.resultsNotificationsSE.get_section_information();
    }

    this.resultsNotificationsSE.resetFilters();
  }
}
