import { Component, computed, OnInit } from '@angular/core';
import { internationalizationData } from '../../data/internationalization-data';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { GlobalLinksService } from '../../services/variables/global-links.service';
import { Router, RouterModule } from '@angular/router';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { AvatarModule } from 'primeng/avatar';
import { SatPopoverModule } from '@ncstate/sat-popover';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { CommonModule } from '@angular/common';
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
    PopUpNotificationItemComponent,
    TawkComponent,
    NavigationBarComponent,
    RouterModule
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
    this.api.dataControlSE.getCurrentPhases().subscribe();
  }

  getInitiativeSeparatedByPortfolio() {
    return this.api.dataControlSE.myInitiativesList.filter(item => item.portfolio_id == 3);
  }

  getUserInitials() {
    if (this.api.authSE.localStorageUser?.user_acronym) {
      return this.api.authSE.localStorageUser?.user_acronym;
    }

    const userName = this.api.authSE.localStorageUser?.user_name ?? '';
    const initials = userName
      .split(' ')
      .filter(name => !!name)
      .map(name => name[0])
      .join('')
      .toUpperCase();

    return initials.slice(0, 2);
  }

  notificationBadgeLength() {
    return `${this.resultsNotificationsSE?.updatesPopUpData?.length}`;
  }

  goToNotifications() {
    this.router.navigate(['result/results-outlet/results-notifications/updates']);
  }

  handleClosePopUp() {
    if (this.resultsNotificationsSE.updatesPopUpData.length === 0) return;

    this.resultsNotificationsSE.updatesPopUpData = [];
    this.resultsNotificationsSE.handlePopUpNotificationLastViewed();
  }
}
