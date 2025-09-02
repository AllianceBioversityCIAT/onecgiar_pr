import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { ResultsNotificationsService } from '../../../../results-notifications.service';

@Component({
    selector: 'app-sent-requests',
    templateUrl: './sent-requests.component.html',
    styleUrls: ['./sent-requests.component.scss'],
    standalone: false
})
export class SentRequestsComponent implements OnInit {
  constructor(public api: ApiService, public resultsNotificationsSE: ResultsNotificationsService) {}

  ngOnInit(): void {
    this.resultsNotificationsSE.get_sent_notifications();
  }
}
