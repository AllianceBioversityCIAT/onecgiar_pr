import { Component } from '@angular/core';
import { ResultsNotificationsService } from './pages/results-notifications/results-notifications.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-results-outlet',
  templateUrl: './results-outlet.component.html',
  styleUrls: ['./results-outlet.component.scss'],
  standalone: false
})
export class ResultsOutletComponent {
  constructor(
    public resultsNotificationsSE: ResultsNotificationsService,
    public router: Router
  ) {}
}
