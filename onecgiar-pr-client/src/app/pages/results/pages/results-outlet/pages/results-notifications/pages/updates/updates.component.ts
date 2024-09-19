import { Component } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ResultsNotificationsService } from '../../results-notifications.service';

@Component({
  selector: 'app-updates',
  templateUrl: './updates.component.html',
  styleUrls: ['./updates.component.scss']
})
export class UpdatesComponent {
  constructor(public api: ApiService, public resultsNotificationsSE: ResultsNotificationsService) {}
}
