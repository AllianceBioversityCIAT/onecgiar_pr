import { A11yModule } from '@angular/cdk/a11y';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucidePanelLeft, lucideSearch } from '@ng-icons/lucide';
import { HlmSidebarService } from '@spartan/sidebar';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { ResultsListFilterService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { PopUpNotificationItemComponent } from '../header-panel/components/pop-up-notification-item/pop-up-notification-item.component';

/**
 * CURRENT shell topbar (PRMS-Shell.dc.html header):
 * sidebar toggle · centered Search · notifications · user chip.
 * Phase switcher intentionally omitted for now (owner request).
 */
@Component({
  selector: 'app-shell-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, OverlayModule, A11yModule, NgIcon, PopUpNotificationItemComponent],
  providers: [provideIcons({ lucidePanelLeft, lucideSearch, lucideBell })],
  templateUrl: './shell-topbar.component.html',
  styleUrls: ['./shell-topbar.component.scss']
})
export class ShellTopbarComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly dataControlSE = inject(DataControlService);
  readonly router = inject(Router);
  readonly resultsNotificationsSE = inject(ResultsNotificationsService);
  readonly resultsListFilterSE = inject(ResultsListFilterService);
  private readonly sidebarSE = inject(HlmSidebarService);

  inLocal = (environment as any)?.inLocal;
  searchQuery = signal('');
  userMenuOpen = signal(false);
  notificationsOpen = signal(false);

  readonly userMenuPositions: ConnectedPosition[] = [
    { originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top', offsetY: 8 }
  ];
  readonly notificationsPositions: ConnectedPosition[] = [
    { originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top', offsetY: 8 }
  ];

  ngOnInit(): void {
    // Keep search field in sync when already on Results Center.
    this.searchQuery.set(this.resultsListFilterSE.text_to_search() || '');
  }

  get unreadNotifications() {
    return this.resultsNotificationsSE.updatesPopUpData ?? [];
  }

  notificationBadgeLength(): string {
    const n = this.unreadNotifications.length;
    return n > 0 ? String(n) : '';
  }

  toggleSidebar(): void {
    this.sidebarSE.toggleSidebar();
  }

  getUserInitials(): string {
    const user = this.api.authSE.localStorageUser;
    if (user?.user_acronym) return user.user_acronym;
    const fromName = (user?.user_name ?? '')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    if (fromName) return fromName;
    const local = (user?.email ?? '').split('@')[0] ?? '';
    return local
      .split(/[._-]+/)
      .filter(Boolean)
      .map(p => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getUserName(): string {
    return this.api.authSE.localStorageUser?.user_name ?? '';
  }

  getMyCenters() {
    return this.api.rolesSE.getMyCenters?.() ?? [];
  }

  getInitiativeSeparatedByPortfolio() {
    return (this.api.dataControlSE.myInitiativesList ?? []).filter((item: any) => item.portfolio_id == 3);
  }

  isInitiativeClosed(officialCode: string): boolean {
    return false;
  }

  onSearchSubmit(): void {
    const q = this.searchQuery().trim();
    this.resultsListFilterSE.text_to_search.set(q);
    void this.router.navigate(['/result/results-outlet/results-list']);
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    // Live update when already on the list page
    if (this.router.url.includes('results-list')) {
      this.resultsListFilterSE.text_to_search.set(value);
    }
  }

  goToNotifications(): void {
    void this.router.navigate(['/result/results-outlet/results-notifications/requests']);
  }

  handleClosePopUp(): void {
    if (this.unreadNotifications.length === 0) return;
    this.resultsNotificationsSE.updatesPopUpData = [];
    this.resultsNotificationsSE.handlePopUpNotificationLastViewed();
  }

  isInNotificationsRoute(): boolean {
    return this.router.url.includes('results-notifications');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.userMenuOpen.set(false);
    this.notificationsOpen.set(false);
  }
}
