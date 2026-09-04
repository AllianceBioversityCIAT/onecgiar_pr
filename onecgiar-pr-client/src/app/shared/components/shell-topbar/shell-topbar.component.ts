import { A11yModule } from '@angular/cdk/a11y';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideBug, lucidePanelLeft, lucideSearch } from '@ng-icons/lucide';
import { HlmSidebarService } from '@spartan/sidebar';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { PopUpNotificationItemComponent } from '../header-panel/components/pop-up-notification-item/pop-up-notification-item.component';
import { GlobalSearchPaletteComponent } from '../global-search-palette/global-search-palette.component';
import { ReportFeedbackDialogComponent } from '../report-feedback-dialog/report-feedback-dialog.component';
import { ConsoleCaptureService } from '../../services/console-capture.service';

/**
 * CURRENT shell topbar (PRMS-Shell.dc.html header):
 * sidebar toggle · centered Search · notifications · user chip.
 * Phase switcher intentionally omitted for now (owner request).
 */
@Component({
  selector: 'app-shell-topbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    OverlayModule,
    A11yModule,
    NgIcon,
    PopUpNotificationItemComponent,
    GlobalSearchPaletteComponent,
    ReportFeedbackDialogComponent
  ],
  providers: [provideIcons({ lucidePanelLeft, lucideSearch, lucideBell, lucideBug })],
  templateUrl: './shell-topbar.component.html',
  styleUrls: ['./shell-topbar.component.scss']
})
export class ShellTopbarComponent {
  readonly api = inject(ApiService);
  readonly dataControlSE = inject(DataControlService);
  readonly router = inject(Router);
  readonly resultsNotificationsSE = inject(ResultsNotificationsService);
  private readonly sidebarSE = inject(HlmSidebarService);

  private readonly palette = viewChild(GlobalSearchPaletteComponent);
  private readonly searchTrigger = viewChild<ElementRef<HTMLButtonElement>>('searchTrigger');

  inLocal = (environment as any)?.inLocal;
  userMenuOpen = signal(false);
  reportFeedbackOpen = signal(false);

  // Injected here, not used directly: the topbar mounts with the app, and
  // instantiating the service is what installs the console hooks, so errors
  // are already being collected by the time anybody reports one.
  private readonly consoleCaptureSE = inject(ConsoleCaptureService);

  /**
   * Opens the modal. Nothing else — no automatic screen capture.
   *
   * 🛑 There WAS one (`ScreenshotService`, `modern-screenshot`) and Yeck had it
   * removed on 4-sep-2026: rasterising the whole viewport ate too much on the
   * reporters' machines and **froze the page**. The cost is not ours to pay —
   * it lands on whoever is reporting a bug, at the worst possible moment. If
   * an image is ever wanted again, it has to be the user attaching a file they
   * already have, never the app painting the DOM to a canvas. `Add an image`
   * in the modal already covers that.
   */
  openReportFeedback(): void {
    this.reportFeedbackOpen.set(true);
  }

  /** Shown on the trigger. Mac reports `macOS`/`MacIntel`; everything else gets Ctrl. */
  readonly shortcutHint = /mac/i.test(navigator?.platform ?? navigator?.userAgent ?? '') ? '⌘K' : 'Ctrl K';
  notificationsOpen = signal(false);

  readonly userMenuPositions: ConnectedPosition[] = [
    { originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top', offsetY: 8 }
  ];
  readonly notificationsPositions: ConnectedPosition[] = [
    { originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top', offsetY: 8 }
  ];

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

  /**
   * Platform role badge ("ADMIN", "Guest", …). It used to live on the sidebar footer user chip;
   * that chip was removed (Account is the topbar's, PROGRAM-SHELL-SPEC.md §2) so the role moved
   * here to keep everything the user could see before visible.
   */
  getPlatformRole(): string {
    return this.api.rolesSE.roles?.application?.description ?? 'Guest';
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

  /**
   * The Search control is a palette TRIGGER, not a filter field (the design binds it to
   * `openPalette`). It no longer writes `ResultsListFilterService.text_to_search`: two search
   * models in one topbar is how this gets confusing, and the palette's rows navigate straight to a
   * result, which is what the old box was used for. The Results Center keeps its own search box.
   */
  openSearchPalette(): void {
    this.palette()?.openPalette();
  }

  /**
   * `Cmd/Ctrl+K` — the conventional palette shortcut. `Cmd/Ctrl+B` is already the Spartan sidebar
   * toggle (`hlm-sidebar.service.ts:47`), and `/` is unsafe here: PRMS users type slashes into
   * result titles and ToC statements all day. `preventDefault` is required or the browser's own
   * Ctrl/Cmd+K (address-bar search) wins and the shortcut looks flaky.
   */
  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    if (event.key?.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;

    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
      // One exception: the palette's own input, so the shortcut still toggles it closed.
      if (!this.palette()?.open()) return;
    }

    event.preventDefault();

    // Focus the trigger BEFORE opening, so CDK Dialog's `restoreFocus` has somewhere sensible to
    // return to. Opened straight from the shortcut, the previously-focused element is `<body>`, and
    // closing would drop the keyboard user at the top of the document with no place in the page.
    if (!this.palette()?.open()) {
      this.searchTrigger()?.nativeElement?.focus();
    }

    this.palette()?.toggle();
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
