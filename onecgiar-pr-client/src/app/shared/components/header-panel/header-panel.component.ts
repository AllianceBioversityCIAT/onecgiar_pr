import { Component, computed, effect, ElementRef, HostListener, inject, OnInit, signal, viewChildren } from '@angular/core';
import { FontScale, FONT_SCALE_OPTIONS, FontScaleService } from '../../services/font-scale.service';
import { LayoutService } from '../../services/layout.service';
import { internationalizationData } from '../../data/internationalization-data';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { GlobalLinksService } from '../../services/variables/global-links.service';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { A11yModule } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import { PopUpNotificationItemComponent } from './components/pop-up-notification-item/pop-up-notification-item.component';
import { TawkComponent } from '../tawk/tawk.component';
import { NavigationBarComponent } from '../navigation-bar/navigation-bar.component';
import { PrTooltipDirectiveModule } from '../../directives/pr-tooltip-directive.module';

type TestLabelPos = 'default' | 'top-right' | 'bottom-left' | 'bottom-right';

@Component({
  selector: 'app-header-panel',
  templateUrl: './header-panel.component.html',
  styleUrls: ['./header-panel.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    OverlayModule,
    A11yModule,
    PopUpNotificationItemComponent,
    TawkComponent,
    NavigationBarComponent,
    RouterModule,
    PrTooltipDirectiveModule
  ]
})
export class HeaderPanelComponent implements OnInit {
  internationalizationData = internationalizationData;
  inLocal = (environment as any)?.inLocal;
  isProduction = environment.production;
  // Non-production "Testing environment" ribbon.
  showTestLabel = signal(true);
  testMenuOpen = signal(false);
  // Manual resting spot. Defaults to 'default' (beside the title). Not persisted:
  // on reload the effective spot is recomputed from the current route/search.
  testLabelPos = signal<TestLabelPos>('default');
  // Current router URL, kept in a signal so the effective position reacts to nav.
  private readonly currentUrl = signal('');
  // Auto-detect: the tag lives beside the title by default, but gets out of the
  // way when it would collide — bottom-left while the search overlay is open,
  // bottom-right inside a Result Detail (where the header is cramped). Otherwise
  // it sits at the manual resting spot (default = beside the title).
  readonly effectiveTestLabelPos = computed<TestLabelPos>(() => {
    if (this.isSearchMode()) return 'bottom-left';
    if (this.currentUrl().includes('/result/result-detail/')) return 'bottom-right';
    return this.testLabelPos();
  });
  // Whether the effective spot is one of the viewport-fixed corners (rendered
  // outside the transformed header) vs. the inline slot beside the title.
  readonly testLabelIsFixed = computed(() => this.effectiveTestLabelPos() !== 'default');
  // Positioning classes for the fixed-corner slot (bottom corners share a
  // left anchor and slide via a CSS translate; top-right uses its own anchor).
  readonly testFixedPosClass = computed(() =>
    this.effectiveTestLabelPos() === 'top-right' ? 'fixed top-3 right-4' : 'fixed bottom-4 left-4'
  );
  // Popover alignment: opens downward for top spots, upward for bottom spots,
  // and hugs the side the tag rests on.
  readonly testMenuClass = computed(() => {
    const pos = this.effectiveTestLabelPos();
    const vertical = pos.startsWith('bottom') ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]';
    const horizontal = pos === 'top-right' || pos === 'bottom-right' ? 'right-0' : 'left-0';
    return `${vertical} ${horizontal}`;
  });
  setTestLabelPos(pos: TestLabelPos): void {
    this.testLabelPos.set(pos);
    this.testMenuOpen.set(false);
  }
  hideTestLabel(): void {
    this.showTestLabel.set(false);
    this.testMenuOpen.set(false);
  }
  @HostListener('document:click')
  onDocumentClickCloseTestMenu(): void {
    if (this.testMenuOpen()) this.testMenuOpen.set(false);
  }
  myInitiativesListP22 = computed(() => this.api.dataControlSE.myInitiativesList);

  // reportingCurrentPhase is a plain object; depend on the version signal so the
  // label re-renders when phases finish loading (zoneless CD)
  readonly reportingPhaseLabel = computed(() => {
    this.dataControlSE.reportingPhaseVersion();
    const phase = this.dataControlSE.reportingCurrentPhase;
    return phase?.portfolioAcronym && phase?.phaseName ? `${phase.portfolioAcronym} - ${phase.phaseName}` : '';
  });
  closedInitiativeCodes = new Set<string>();
  isSearchMode = signal(false);

  // CDK Overlay open state (replaces sat-popover ref.isOpen())
  userMenuOpen = signal(false);
  notificationsOpen = signal(false);
  settingsMenuOpen = signal(false);

  // Overlay connected positions (mirror the previous sat-popover alignment)
  readonly userMenuPositions: ConnectedPosition[] = [{ originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top' }];
  readonly notificationsPositions: ConnectedPosition[] = [{ originX: 'center', overlayX: 'center', originY: 'bottom', overlayY: 'top' }];
  readonly settingsMenuPositions: ConnectedPosition[] = [{ originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top' }];

  // Accessibility — text-size control (WCAG 1.4.4). Lives in the kebab menu.
  readonly fontScaleSE = inject(FontScaleService);
  readonly fontScaleOptions = FONT_SCALE_OPTIONS;
  readonly fontRadios = viewChildren<ElementRef<HTMLButtonElement>>('fontRadio');

  // Dashboard layout: shift the navbar to the right of a full-height sidebar
  private readonly layoutSE = inject(LayoutService);
  private readonly EDGE_GAP = 10; // matches the floating bar's inset
  readonly navbarLeft = computed(() => {
    const offset = this.layoutSE.leftOffset();
    // Sidebar floats with a 10px margin: reserve margin + width + gap to its right
    return offset > 0 ? offset + this.EDGE_GAP * 2 : this.EDGE_GAP;
  });

  // Hide-on-scroll-down / show-on-scroll-up for the floating header
  readonly isHidden = signal(false);
  private lastScrollY = 0;
  private readonly REVEAL_ZONE = 80; // px from top where the bar is always shown
  private readonly SCROLL_DELTA = 8; // min movement to react (avoids jitter)

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const currentY = window.scrollY || document.documentElement.scrollTop || 0;

    // Near the top: always reveal
    if (currentY <= this.REVEAL_ZONE) {
      this.isHidden.set(false);
      this.lastScrollY = currentY;
      return;
    }

    const delta = currentY - this.lastScrollY;
    if (Math.abs(delta) < this.SCROLL_DELTA) return;

    // delta > 0 → scrolling down (hide); delta < 0 → scrolling up (show)
    this.isHidden.set(delta > 0);
    this.lastScrollY = currentY;
  }

  constructor(
    public api: ApiService,
    public dataControlSE: DataControlService,
    public globalLinksSE: GlobalLinksService,
    public router: Router,
    public resultsNotificationsSE: ResultsNotificationsService
  ) {
    effect(() => {
      const version = this.dataControlSE.reportingStatusVersion();
      if (version > 0) {
        this.loadReportingAccessStatus();
      }
    });
  }

  ngOnInit(): void {
    // Track the current URL so the test-label auto-detect reacts to navigation
    // (e.g. entering a Result Detail sends the tag to the bottom-right corner).
    this.currentUrl.set(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.currentUrl.set(this.router.url));

    this.api.updateUserData(() => {
      this.resultsNotificationsSE.get_updates_notifications();
      this.resultsNotificationsSE.get_updates_pop_up_notifications();
      this.loadReportingAccessStatus();
    });
    this.api.dataControlSE.getCurrentPhases().subscribe(() => {
      this.loadReportingAccessStatus();
    });
  }

  private loadReportingAccessStatus(): void {
    const phaseId = this.api.dataControlSE.reportingCurrentPhase.phaseId;
    if (!phaseId) return;

    this.api.resultsSE.GET_phaseReportingInitiatives(phaseId).subscribe({
      next: (res) => {
        const programs: any[] = res.response?.science_programs || [];
        this.closedInitiativeCodes.clear();
        programs.filter(p => !p.reporting_enabled).forEach(p => this.closedInitiativeCodes.add(p.official_code));
      }
    });
  }

  isInitiativeClosed(officialCode: string): boolean {
    return this.closedInitiativeCodes.has(officialCode);
  }

  getInitiativeSeparatedByPortfolio() {
    return this.api.dataControlSE.myInitiativesList.filter(item => item.portfolio_id == 3);
  }

  getUserInitials() {
    const user = this.api.authSE.localStorageUser;

    if (user?.user_acronym) {
      return user.user_acronym;
    }

    const fromName = (user?.user_name ?? '')
      .split(' ')
      .filter(name => !!name)
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    if (fromName) return fromName;

    // Fallback when the user object has no name/acronym: derive from the email
    // local-part (e.g. "y.zuniga@..." -> "YZ") so the avatar is never blank.
    const localPart = (user?.email ?? '').split('@')[0] ?? '';
    return localPart
      .split(/[._-]+/)
      .filter(part => !!part)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getPlatformRole() {
    return this.api.rolesSE.roles?.application?.description ?? 'Guest';
  }

  toggleSearch() {
    this.isSearchMode.update(v => !v);
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

  isInNotificationsRoute(): boolean {
    return this.router.url.includes('results-notifications');
  }

  // --- Text-size radiogroup: roving-tabindex keyboard nav (WCAG 2.2) ---
  selectFontScale(value: FontScale): void {
    this.fontScaleSE.set(value);
  }

  onFontRadioKeydown(event: KeyboardEvent, currentIndex: number): void {
    const last = this.fontScaleOptions.length - 1;
    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = currentIndex >= last ? 0 : currentIndex + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = currentIndex <= 0 ? last : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = last;
        break;
      default:
        return;
    }

    event.preventDefault();
    const option = this.fontScaleOptions[nextIndex];
    this.fontScaleSE.set(option.value);
    this.fontRadios()[nextIndex]?.nativeElement.focus();
  }

  closeSettingsAndRefocus(trigger: HTMLElement): void {
    this.settingsMenuOpen.set(false);
    trigger.focus();
  }
}
