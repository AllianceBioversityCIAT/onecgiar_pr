import { Component, OnInit } from '@angular/core';
import { internationalizationData } from '../../data/internationalization-data';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { GlobalLinksService } from '../../services/variables/global-links.service';
import { Router } from '@angular/router';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
@Component({
  selector: 'app-header-panel',
  templateUrl: './header-panel.component.html',
  styleUrls: ['./header-panel.component.scss']
})
export class HeaderPanelComponent implements OnInit {
  internationalizationData = internationalizationData;
  inLocal = (environment as any)?.inLocal;

  constructor(
    public api: ApiService,
    public dataControlSE: DataControlService,
    public globalLinksSE: GlobalLinksService,
    private router: Router,
    public resultsNotificationsSE: ResultsNotificationsService
  ) {}

  ngOnInit(): void {
    this.api.updateUserData(() => {
      this.resultsNotificationsSE.get_updates_notifications();
      this.resultsNotificationsSE.get_updates_pop_up_notifications();
    });
  }

  notificationBadgeLength() {
    return `${this.resultsNotificationsSE.updatesPopUpData.length}`;
  }

  openInfoLink() {
    const w = window.innerWidth - window.innerWidth / 3;
    const h = window.innerHeight - window.innerHeight / 4;

    const top = window.screenY + (window.outerHeight - h) / 2.5;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const url = this.globalLinksSE.links.url_platform_information;

    window.open(url, 'Information center', `left=${left},top=${top},width=${w},height=${h}`);
  }

  goToNotifications() {
    this.router.navigate(['result/results-outlet/results-notifications/requests']);
  }

  handleClosePopUp() {
    if (this.resultsNotificationsSE.updatesPopUpData.length === 0) return;

    this.resultsNotificationsSE.updatesPopUpData = [];
    this.resultsNotificationsSE.handlePopUpNotificationLastViewed();
  }
}
