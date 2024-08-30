import { Component } from '@angular/core';
import { ResultsNotificationsService } from '../../results-notifications.service';

@Component({
  selector: 'app-requests',
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.scss']
})
export class RequestsComponent {
  constructor(public resultsNotificationsSE: ResultsNotificationsService) {}
}
