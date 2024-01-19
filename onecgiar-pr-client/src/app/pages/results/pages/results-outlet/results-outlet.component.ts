import { Component } from '@angular/core';
import { ResultsNotificationsService } from './pages/results-notifications/results-notifications.service';

@Component({
  selector: 'app-results-outlet',
  templateUrl: './results-outlet.component.html',
  styleUrls: ['./results-outlet.component.scss']
})
export class ResultsOutletComponent {
  animateBell = true;
  constructor(public resultsNotificationsSE: ResultsNotificationsService) {
    setTimeout(() => {
      this.animateBell = false;
    }, 10000);
  }
}
