import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from './results-notifications.service';

@Component({
  selector: 'app-results-notifications',
  templateUrl: './results-notifications.component.html',
  styleUrls: ['./results-notifications.component.scss']
})
export class ResultsNotificationsComponent {
  constructor(public api: ApiService, private shareRequestModalSE: ShareRequestModalService, public resultsNotificationsSE: ResultsNotificationsService) {}
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.api.updateUserData(() => {
      this.resultsNotificationsSE.get_section_information();
    });
    this.shareRequestModalSE.inNotifications = true;
  }
}
