import { Component } from '@angular/core';
import { ResultsNotificationsService } from './pages/results-notifications/results-notifications.service';

@Component({
  selector: 'app-results-outlet',
  templateUrl: './results-outlet.component.html',
  styleUrls: ['./results-outlet.component.scss']
})
export class ResultsOutletComponent {
  constructor(public resultsNotificationsSE: ResultsNotificationsService) {}
}
