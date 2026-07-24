import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { A11yModule } from '@angular/cdk/a11y';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLayoutDashboard,
  lucideFileText,
  lucidePackage,
  lucideShieldCheck,
  lucideSettings,
  lucideHandshake,
  lucideChartLine,
  lucideCircleDot,
  lucideChevronDown,
  lucideRocket,
  lucideBell,
  lucideType,
  lucideClipboardCheck,
  lucideWrench,
  lucideTicket,
  lucideLayers,
  lucideBookOpen,
  lucideUserCog,
  lucidePanelLeft,
  lucideSparkles,
  lucideBuilding2
} from '@ng-icons/lucide';
import { HlmSidebarImports, HlmSidebarService } from '@spartan/sidebar';
import { PrRoute, extraRoutingApp, routingApp } from '../../routing/routing-data';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { SPProgress } from '../../interfaces/SP-progress.interface';
import { ApiService } from '../../services/api/api.service';
import { FontScale, FONT_SCALE_OPTIONS, FontScaleService } from '../../services/font-scale.service';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';

interface ProgramGroup {
  key: string;
  label: string;
  items: SPProgress[];
}

interface NavSubLink {
  name: string;
  path: string;
  icon: string;
}

type FlyoutKey = 'rfr' | 'my-admin' | 'admin-module';

interface IconFlyout {
  key: FlyoutKey;
  top: number;
  left: number;
}

/**
 * Official Spartan sidebar — the app-level primary navigation (mounted from `app.component`).
 * Collapses to an icon rail; on hover a floating panel shows the section label and any children.
 */
@Component({
  selector: 'app-reporting-nav-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIcon, OverlayModule, A11yModule, ...HlmSidebarImports],
  templateUrl: './reporting-nav-sidebar.component.html',
  styleUrls: ['./reporting-nav-sidebar.component.scss'],
  providers: [
    provideIcons({
      lucideLayoutDashboard,
      lucideFileText,
      lucidePackage,
      lucideShieldCheck,
      lucideSettings,
      lucideHandshake,
      lucideChartLine,
      lucideCircleDot,
      lucideChevronDown,
      lucideRocket,
      lucideBell,
      lucideType,
      lucideClipboardCheck,
      lucideWrench,
      lucideTicket,
      lucideLayers,
      lucideBookOpen,
      lucideUserCog,
      lucidePanelLeft,
      lucideSparkles,
      lucideBuilding2
    })
  ]
})
export class ReportingNavSidebarComponent {
  public readonly rolesSE = inject(RolesService);
  public readonly dataControlSE = inject(DataControlService);
  public readonly homeSE = inject(ResultFrameworkReportingHomeService);
  public readonly router = inject(Router);
  public readonly api = inject(ApiService);
  public readonly fontScaleSE = inject(FontScaleService);
  public readonly resultsNotificationsSE = inject(ResultsNotificationsService);
  public readonly sidebarSE = inject(HlmSidebarService);

  readonly isProduction = environment.production;
  readonly fontScaleOptions = FONT_SCALE_OPTIONS;

  /** Icon-rail mode (Spartan `collapsible="icon"` + service state). */
  readonly isCollapsed = computed(() => this.sidebarSE.state() === 'collapsed' && !this.sidebarSE.isMobile());

  /** Floating hover panel for sections that have children while collapsed. */
  readonly iconFlyout = signal<IconFlyout | null>(null);
  private flyoutCloseTimer: ReturnType<typeof setTimeout> | null = null;

  /** Phase chip that used to live under the top-bar wordmark. */
  readonly reportingPhaseLabel = computed(() => {
    this.dataControlSE.reportingPhaseVersion();
    const phase = this.dataControlSE.reportingCurrentPhase;
    return phase?.portfolioAcronym && phase?.phaseName ? `${phase.portfolioAcronym} - ${phase.phaseName}` : '';
  });

  /** Lucide icon per top-level section (matches the section `path`). */
  private readonly sectionIcons: Record<string, string> = {
    'result-framework-reporting': 'lucideLayoutDashboard',
    result: 'lucideFileText',
    ipsr: 'lucidePackage',
    'quality-assurance': 'lucideShieldCheck',
    'init-admin-module': 'lucideSettings',
    'admin-module': 'lucideWrench',
    bilateral: 'lucideHandshake',
    'outcome-indicator-module': 'lucideChartLine'
  };

  /**
   * My Admin child links. Same set the My Admin shell used to expose in its
   * premium sidebar — Completeness stays in the route table but is not listed today.
   */
  readonly myAdminLinks: NavSubLink[] = [
    {
      name: 'General results report',
      path: '/init-admin-module/init-general-results-report',
      icon: 'lucideClipboardCheck'
    }
  ];

  /** Platform Admin module children (admin-only). Mirrors admin-section.sections. */
  readonly adminModuleLinks: NavSubLink[] = [
    { name: 'Tickets Dashboard', path: '/admin-module/tickets-dashboard', icon: 'lucideTicket' },
    { name: 'Phase management', path: '/admin-module/phase-management', icon: 'lucideLayers' },
    { name: 'Knowledge Products', path: '/admin-module/knowledge-products', icon: 'lucideBookOpen' },
    { name: 'User management', path: '/admin-module/user-management', icon: 'lucideUserCog' }
  ];

  /**
   * Conceptual RFR action links (subtle group label in the template — not a collapsible).
   * Dashboard = full bento; the other three are single-section surfaces.
   */
  readonly rfrSectionLinks: NavSubLink[] = [
    { name: 'Dashboard', path: '/result-framework-reporting/home', icon: 'lucideLayoutDashboard' },
    { name: 'Results planned in your 2026 ToC', path: '/result-framework-reporting/planned-toc', icon: 'lucideClipboardCheck' },
    { name: 'Report Emerging results', path: '/result-framework-reporting/emerging', icon: 'lucideSparkles' },
    { name: 'My CGIAR Centers', path: '/result-framework-reporting/centers', icon: 'lucideBuilding2' }
  ];

  /**
   * Primary nav sections + Admin module (admin-only, from extraRoutingApp).
   * Same role gating as the horizontal nav for My Admin.
   */
  readonly sections = computed<PrRoute[]>(() => {
    const primary = routingApp.filter(o => !(o.prHide || this.validateAdminModuleAndRole(o)));
    if (!this.rolesSE?.isAdmin) return primary;
    const admin = extraRoutingApp.find(o => o.path === 'admin-module' && !o.prHide);
    return admin ? [...primary, admin] : primary;
  });

  // --- Results Framework & Reporting: section links + lazy-expandable program tree ---
  /** Whether the RFR entry is expanded to reveal section links + Science Programs. */
  readonly rfrExpanded = signal(this.router.url.startsWith('/result-framework-reporting'));
  /** Whether My Admin is expanded to reveal its child pages. */
  readonly myAdminExpanded = signal(this.router.url.startsWith('/init-admin-module'));
  /** Whether Admin module is expanded to reveal its child pages. */
  readonly adminModuleExpanded = signal(this.router.url.startsWith('/admin-module'));
  /** Which program groups are open. "My programs" starts open, the rest collapsed. */
  readonly openGroups = signal<Set<string>>(new Set(['mine']));
  /** Ensures the (lazy) programs fetch is triggered at most once. */
  private rfrLoadTriggered = false;

  readonly programGroups = computed<ProgramGroup[]>(() => [
    { key: 'mine', label: 'My programs', items: this.homeSE.mySPsList() },
    { key: 'other', label: 'Other programs', items: this.homeSE.otherSPsList() },
    { key: 'projects', label: 'Other projects', items: this.homeSE.otherProjectsList() }
  ]);

  /** Currently selected program id from the URL `?sp=` query param (so the tree highlights it). */
  readonly activeSpId = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const raw = this.router.parseUrl(this.router.url).queryParams['sp'];
        const id = Number(raw);
        return Number.isNaN(id) ? null : id;
      })
    ),
    { initialValue: null }
  );

  /**
   * Current RFR section path (home / planned-toc / emerging / centers) so SP links
   * keep the user on the same surface when switching programs.
   */
  readonly currentRfrSectionPath = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const url = this.router.url.split('?')[0];
        const match = this.rfrSectionLinks.find(l => url === l.path || url.startsWith(l.path + '/'));
        return match?.path ?? '/result-framework-reporting/home';
      })
    ),
    { initialValue: '/result-framework-reporting/home' }
  );

  constructor() {
    // Expand collapsibles when landing inside their module (don't force-collapse on leave).
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (this.router.url.startsWith('/result-framework-reporting')) {
        this.rfrExpanded.set(true);
        this.ensureRfrLoaded();
      }
      if (this.router.url.startsWith('/init-admin-module')) this.myAdminExpanded.set(true);
      if (this.router.url.startsWith('/admin-module')) this.adminModuleExpanded.set(true);
    });
  }

  /** Active state for RFR section links (path only; ignores `?sp=`). */
  isRfrSectionActive(path: string): boolean {
    const url = this.router.url.split('?')[0];
    return url === path;
  }

  /** Query params for a section link — keep the selected Science Program. */
  rfrSectionQueryParams(): { sp?: number } {
    const sp = this.activeSpId();
    return sp != null ? { sp } : {};
  }

  // --- Footer chrome (moved from the top header) ---
  readonly userMenuOpen = signal(false);
  readonly fontMenuOpen = signal(false);
  readonly userMenuPositions: ConnectedPosition[] = [{ originX: 'start', overlayX: 'start', originY: 'top', overlayY: 'bottom' }];
  readonly fontMenuPositions: ConnectedPosition[] = [{ originX: 'start', overlayX: 'start', originY: 'top', overlayY: 'bottom' }];

  iconFor(section: PrRoute): string {
    return this.sectionIcons[section.path ?? ''] ?? 'lucideCircleDot';
  }

  ensureRfrLoaded(): void {
    if (this.rfrLoadTriggered) return;
    this.rfrLoadTriggered = true;
    const alreadyLoaded = this.homeSE.mySPsList().length || this.homeSE.otherSPsList().length || this.homeSE.otherProjectsList().length;
    if (!alreadyLoaded) this.homeSE.getScienceProgramsProgress();
  }

  /** Expand/collapse RFR. On the first expand, lazily fetch the programs (unless already cached). */
  toggleRfr(): void {
    if (this.isCollapsed()) return;
    const next = !this.rfrExpanded();
    this.rfrExpanded.set(next);
    if (next) this.ensureRfrLoaded();
  }

  toggleMyAdmin(): void {
    if (this.isCollapsed()) return;
    this.myAdminExpanded.update(open => !open);
  }

  toggleAdminModule(): void {
    if (this.isCollapsed()) return;
    this.adminModuleExpanded.update(open => !open);
  }

  openIconFlyout(key: FlyoutKey, event: Event): void {
    if (!this.isCollapsed()) return;
    if (this.flyoutCloseTimer) {
      clearTimeout(this.flyoutCloseTimer);
      this.flyoutCloseTimer = null;
    }
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    this.iconFlyout.set({ key, top: Math.max(8, rect.top), left: rect.right + 8 });
    if (key === 'rfr') this.ensureRfrLoaded();
  }

  keepIconFlyout(): void {
    if (this.flyoutCloseTimer) {
      clearTimeout(this.flyoutCloseTimer);
      this.flyoutCloseTimer = null;
    }
  }

  scheduleCloseIconFlyout(): void {
    if (this.flyoutCloseTimer) clearTimeout(this.flyoutCloseTimer);
    this.flyoutCloseTimer = setTimeout(() => {
      this.iconFlyout.set(null);
      this.flyoutCloseTimer = null;
    }, 180);
  }

  closeIconFlyout(): void {
    if (this.flyoutCloseTimer) {
      clearTimeout(this.flyoutCloseTimer);
      this.flyoutCloseTimer = null;
    }
    this.iconFlyout.set(null);
  }

  isSubLinkActive(path: string): boolean {
    return this.router.url.startsWith(path);
  }

  toggleGroup(key: string): void {
    this.openGroups.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  isGroupOpen(key: string): boolean {
    return this.openGroups().has(key);
  }

  iconSrc(sp: SPProgress): string {
    return `/assets/result-framework-reporting/SPs-Icons/${sp.initiativeCode}.png`;
  }

  /** Result count for the latest reporting version (falls back to the flat total). */
  count(sp: SPProgress): number {
    const versions = sp.versions ?? [];
    const latest = versions.length ? versions.reduce((a, b) => ((b.phaseYear ?? 0) > (a.phaseYear ?? 0) ? b : a)) : null;
    return latest?.totalResults ?? sp.totalResults ?? 0;
  }

  // Mirrors NavigationBarComponent so admin-only entries stay gated in the sidebar too.
  validateAdminModuleAndRole(option: PrRoute): boolean {
    if (option?.onlyTest && environment.production) return true;
    if (this?.rolesSE?.isAdmin) return false;
    if (option?.path === 'init-admin-module') return this.validateCoordAndLead();
    return false;
  }

  validateCoordAndLead(): boolean {
    const initiatives = this.dataControlSE?.myInitiativesList ?? [];
    const hasLeadOrCoordinator = initiatives.some(init => init?.role === 'Lead' || init?.role === 'Coordinator');
    return !hasLeadOrCoordinator;
  }

  // --- User / notifications / text-size (reuse the same shell services) ---
  getUserInitials(): string {
    const user = this.api.authSE.localStorageUser;
    if (user?.user_acronym) return user.user_acronym;
    const fromName = (user?.user_name ?? '')
      .split(' ')
      .filter(n => !!n)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    if (fromName) return fromName;
    const localPart = (user?.email ?? '').split('@')[0] ?? '';
    return localPart
      .split(/[._-]+/)
      .filter(p => !!p)
      .map(p => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getUserName(): string {
    return this.api.authSE.localStorageUser?.user_name ?? '';
  }

  getUserEmail(): string {
    return this.api.authSE.localStorageUser?.email ?? '';
  }

  getPlatformRole(): string {
    return this.api.rolesSE.roles?.application?.description ?? 'Guest';
  }

  getInitiativeSeparatedByPortfolio() {
    return this.api.dataControlSE.myInitiativesList.filter(item => item.portfolio_id == 3);
  }

  getMyCenters() {
    return this.api.rolesSE.getMyCenters();
  }

  notificationBadgeCount(): number {
    return this.resultsNotificationsSE?.updatesPopUpData?.length ?? 0;
  }

  goToNotifications(): void {
    this.router.navigate(['result/results-outlet/results-notifications/requests']);
  }

  selectFontScale(value: FontScale): void {
    this.fontScaleSE.set(value);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.api.authSE.logout();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.userMenuOpen.set(false);
    this.fontMenuOpen.set(false);
    this.closeIconFlyout();
  }
}
