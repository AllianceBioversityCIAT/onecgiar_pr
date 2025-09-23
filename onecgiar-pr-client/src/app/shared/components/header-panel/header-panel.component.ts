import { Component, computed, OnInit } from '@angular/core';
import { internationalizationData } from '../../data/internationalization-data';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { GlobalLinksService } from '../../services/variables/global-links.service';
import { Router } from '@angular/router';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { AvatarModule } from 'primeng/avatar';
import { SatPopoverModule } from '@ncstate/sat-popover';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { CommonModule } from '@angular/common';
import { FormatTimeAgoModule } from '../../pipes/format-time-ago/format-time-ago.module';
import { PopUpNotificationItemComponent } from './components/pop-up-notification-item/pop-up-notification-item.component';
import { TawkComponent } from '../tawk/tawk.component';
import { NavigationBarComponent } from '../navigation-bar/navigation-bar.component';

@Component({
  selector: 'app-header-panel',
  templateUrl: './header-panel.component.html',
  styleUrls: ['./header-panel.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AvatarModule,
    SatPopoverModule,
    OverlayBadgeModule,
    FormatTimeAgoModule,
    PopUpNotificationItemComponent,
    TawkComponent,
    NavigationBarComponent
  ]
})
export class HeaderPanelComponent implements OnInit {
  internationalizationData = internationalizationData;
  inLocal = (environment as any)?.inLocal;
  myInitiativesListP22 = computed(() => this.api.dataControlSE.myInitiativesList);

  constructor(
    public api: ApiService,
    public dataControlSE: DataControlService,
    public globalLinksSE: GlobalLinksService,
    public router: Router,
    public resultsNotificationsSE: ResultsNotificationsService
  ) {}

  ngOnInit(): void {
    this.api.updateUserData(() => {
      this.resultsNotificationsSE.get_updates_notifications();
      this.resultsNotificationsSE.get_updates_pop_up_notifications();
    });
  }

  getInitiativeSeparatedByPortfolio() {
    return this.api.dataControlSE.myInitiativesList.filter(item => item.portfolio_id == 3);
  }

  getUserInitials() {
    return this.api.authSE.localStorageUser?.user_name
      .split(' ')
      .map(name => name[0])
      .join('');
  }

  notificationBadgeLength() {
    return `${this.resultsNotificationsSE?.updatesPopUpData?.length}`;
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
