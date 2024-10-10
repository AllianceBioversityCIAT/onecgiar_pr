import { Component } from '@angular/core';
import { ResultsNotificationsService } from './pages/results-notifications/results-notifications.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-results-outlet',
  templateUrl: './results-outlet.component.html',
  styleUrls: ['./results-outlet.component.scss']
})
export class ResultsOutletComponent {
  animateBell = true;
  constructor(public resultsNotificationsSE: ResultsNotificationsService, public router: Router) {
    setTimeout(() => {
      this.animateBell = false;
    }, 10000);
  }
}
