import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { ResultsNotificationsService } from '../../../../results-notifications.service';

@Component({
  selector: 'app-received-requests',
  templateUrl: './received-requests.component.html',
  styleUrls: ['./received-requests.component.scss']
})
export class ReceivedRequestsComponent implements OnInit {
  constructor(public api: ApiService, public resultsNotificationsSE: ResultsNotificationsService) {}

  ngOnInit(): void {
    this.api.updateUserData(() => {
      this.resultsNotificationsSE.get_section_information();
    });
  }
}
