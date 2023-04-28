import { Component, OnInit } from '@angular/core';
import { ShareRequestModalService } from 'src/app/pages/results/pages/result-detail/components/share-request-modal/share-request-modal.service';
import { ResultsNotificationsService } from 'src/app/pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-innovation-packages-notification',
  templateUrl: './innovation-packages-notification.component.html',
  styleUrls: ['./innovation-packages-notification.component.scss']
})
export class InnovationPackagesNotificationComponent implements OnInit {

  constructor(public api: ApiService, private shareRequestModalSE: ShareRequestModalService, public resultsNotificationsSE: ResultsNotificationsService) {}
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.api.updateUserData(() => {
      this.resultsNotificationsSE.get_section_innovation_packages();
    });
    //console.log(this.resultsNotificationsSE);
    
    this.shareRequestModalSE.inNotifications = true;
  }

}
