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
  lucideCheck,
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
  lucideBuilding2,
  lucideMapPin,
  lucideLink,
  lucidePaperclip,
  lucideGraduationCap,
  lucideLightbulb,
  lucideScale,
  lucideGitBranch,
  lucideUsers
} from '@ng-icons/lucide';
import { HlmSidebarImports, HlmSidebarService } from '@spartan/sidebar';
import { PrRoute, extraRoutingApp, resultDetailRouting, routingApp } from '../../routing/routing-data';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { SPProgress } from '../../interfaces/SP-progress.interface';
import { ApiService } from '../../services/api/api.service';
import { FontScale, FONT_SCALE_OPTIONS, FontScaleService } from '../../services/font-scale.service';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { FieldsManagerService } from '../../services/fields-manager.service';
import { GreenChecksService } from '../../services/global/green-checks.service';
import { AiReviewService } from '../../services/api/ai-review.service';
import { SubmissionModalService } from '../../../pages/results/pages/result-detail/components/submission-modal/submission-modal.service';
import { UnsubmitModalService } from '../../../pages/results/pages/result-detail/components/unsubmit-modal/unsubmit-modal.service';

/** A result-detail section row with the (dynamically injected) green-check state. */
type RdSection = PrRoute & { validation?: number };

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
      lucideCheck,
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
      lucideBuilding2,
      lucideMapPin,
      lucideLink,
      lucidePaperclip,
      lucideGraduationCap,
      lucideLightbulb,
      lucideScale,
      lucideGitBranch,
      lucideUsers
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
  public readonly fieldsManagerSE = inject(FieldsManagerService);
  public readonly greenChecksSE = inject(GreenChecksService);
  public readonly aiReviewSE = inject(AiReviewService);
  private readonly submissionModalSE = inject(SubmissionModalService);
  private readonly unsubmitModalSE = inject(UnsubmitModalService);

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
  /**
   * Platform links under Results Center that are NOT already covered by the programme / centre
   * blocks above the divider. CURRENT reference only lists platform tools; Emerging stays because
   * it has no other entry in the shell.
   */
  readonly rfrPlatformLinks: NavSubLink[] = [
    { name: 'Report Emerging results', path: '/result-framework-reporting/emerging', icon: 'lucideSparkles' }
  ];

  /** Results Center = reporting home (reference label). SP cards deep-link into Planned ToC. */
  readonly rfrResultsCenterPath = '/result-framework-reporting/home';

  /** Planned ToC path — SP cards and the program shell land here. */
  readonly rfrPlannedPath = '/result-framework-reporting/planned-toc';

  /**
   * Overview is the OTHER tab of the same program shell. The sidebar entry must stay lit there:
   * switching tab does not leave the program, and dropping the highlight reads as "you navigated
   * away" when nothing moved.
   */
  readonly rfrOverviewPath = '/result-framework-reporting/overview';

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

  // --- Results Framework: level-1 group tag + 4 peer links; programs under Planned ---
  /** Whether My Admin is expanded to reveal its child pages. */
  readonly myAdminExpanded = signal(this.router.url.startsWith('/init-admin-module'));
  /** Whether Admin module is expanded to reveal its child pages. */
  readonly adminModuleExpanded = signal(this.router.url.startsWith('/admin-module'));
  /** Which program groups are open. "My programs" starts open, the rest collapsed. */
  readonly openGroups = signal<Set<string>>(new Set(['mine']));
  /** Ensures the (lazy) programs fetch is triggered at most once. */
  private rfrLoadTriggered = false;

  /**
   * Programmes shown on the collapsed icon rail — the user's own only. The rail has no room for
   * "other programmes" or projects, and the reference shows a dashed "+" affordance for those
   * instead of listing them.
   */
  readonly railPrograms = computed<SPProgress[]>(() => this.homeSE.mySPsList() ?? []);

  // `?? []` is load-bearing, not defensive noise: the template reads `group.items.length`, so a
  // list that arrives undefined (a failed or in-flight fetch) crashed the whole sidebar with
  // "Cannot read properties of undefined (reading 'length')" — taking the app's only navigation
  // down with it. Caught by the railPrograms test.
  readonly programGroups = computed<ProgramGroup[]>(() => [
    { key: 'mine', label: 'My programs', items: this.homeSE.mySPsList() ?? [] },
    { key: 'other', label: 'Other programs', items: this.homeSE.otherSPsList() ?? [] },
    { key: 'projects', label: 'Other projects', items: this.homeSE.otherProjectsList() ?? [] }
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

  /** True when the URL is the program shell — either of its tabs (a program is open). */
  readonly isPlannedActive = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.isProgramShellUrl(this.router.url))
    ),
    { initialValue: false }
  );

  private isProgramShellUrl(url: string): boolean {
    const path = url.split('?')[0];
    return path === this.rfrPlannedPath || path === this.rfrOverviewPath;
  }

  /**
   * Local expand/collapse for Science Programs under Planned.
   * Clicking Planned toggles this — it does NOT navigate (pick a program to enter).
   */

  // --- Result Detail context: "Results Center" expands into the open result's sections ---
  /** True when the URL is a result-detail page (the white context card is shown). */
  readonly inResultDetail = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url.includes('/result/result-detail/'))
    ),
    { initialValue: this.router.url.includes('/result/result-detail/') }
  );

  /** Whether the Results Center card is expanded (auto-opens on entering a result). */
  readonly resultCenterExpanded = signal(this.router.url.includes('/result/result-detail/'));

  /**
   * Sections of the open result — filtered by portfolio (P22/P25) and result type, with the
   * green-check state injected. Mirrors `PanelMenuPipe` so the logic lives in one shape only.
   */
  readonly resultSections = computed<RdSection[]>(() => {
    this.dataControlSE.currentResultSignal(); // react to result load
    this.dataControlSE.greenChecksString(); // react to green-check changes
    const portfolio = this.fieldsManagerSE.portfolioAcronym();
    if (!portfolio) return [];
    const typeId = this.dataControlSE.currentResult?.result_type_id;
    (this.dataControlSE.green_checks ?? []).forEach((gc: { section_name?: string; validation?: number | string }) => {
      const opt = resultDetailRouting.find(o => o.path === gc.section_name) as RdSection | undefined;
      if (opt) opt.validation = Number(gc.validation);
    });
    return (resultDetailRouting as RdSection[]).filter(o => {
      if (o.path === '**') return false;
      if (this.fieldsManagerSE.isP25() && o.portfolioAcronym === 'P22') return false;
      if (this.fieldsManagerSE.isP22() && o.portfolioAcronym === 'P25') return false;
      if (!Object.prototype.hasOwnProperty.call(o, 'prHide')) return true;
      return o.prHide == typeId;
    });
  });

  /** Lucide icon per result-detail section (matches the section `path`). */
  private readonly rdSectionIcons: Record<string, string> = {
    'general-information': 'lucideFileText',
    'theory-of-change': 'lucideGitBranch',
    partners: 'lucideHandshake',
    'contributor-partners': 'lucideUsers',
    'geographic-location': 'lucideMapPin',
    'links-to-results': 'lucideLink',
    evidences: 'lucidePaperclip',
    'cap-dev-info': 'lucideGraduationCap',
    'innovation-dev-info': 'lucideLightbulb',
    'innovation-use-info': 'lucideRocket',
    'knowledge-product-info': 'lucideBookOpen',
    'policy-change-info': 'lucideScale'
  };

  sectionIcon(path?: string): string {
    return this.rdSectionIcons[path ?? ''] ?? 'lucideCircleDot';
  }

  /** Router link for a result section (needs the open result's code + version). */
  sectionLink(section: RdSection): string {
    return `/result/result-detail/${this.dataControlSE.currentResult?.result_code}/${section.path}`;
  }

  sectionQueryParams(): { phase?: number | string } {
    const version = this.dataControlSE.currentResult?.version_id;
    return version != null ? { phase: version } : {};
  }

  toggleResultCenter(): void {
    if (this.isCollapsed()) return;
    this.resultCenterExpanded.update(v => !v);
  }

  // Result-level actions — gating mirrors panel-menu.component.html.
  get showAiReview(): boolean {
    const r = this.dataControlSE.currentResult;
    return !!(r && r.result_type_id != 6 && r.status_id == 1);
  }
  get aiReviewDisabled(): boolean {
    const r = this.dataControlSE.currentResult;
    return !this.greenChecksSE.submit || !!(r?.inQA && this.api.globalVariablesSE.get?.in_qa && r?.status_id == 1);
  }
  get showSubmit(): boolean {
    const list = this.dataControlSE.myInitiativesList ?? [];
    return this.dataControlSE.currentResult?.status_id == 1 && (this.validateMember(list) !== 6 || this.rolesSE.isAdmin);
  }
  get submitDisabled(): boolean {
    const r = this.dataControlSE.currentResult;
    return !this.greenChecksSE.submit || !!(r?.inQA && this.api.globalVariablesSE.get?.in_qa);
  }
  get showUnsubmit(): boolean {
    return this.dataControlSE.currentResult?.status_id == 3;
  }
  onAiReview(): void {
    if (!this.aiReviewDisabled) this.aiReviewSE.onAIReviewClick();
  }
  openSubmit(): void {
    this.submissionModalSE.showModal = true;
  }
  openUnsubmit(): void {
    this.unsubmitModalSE.showModal = true;
  }
  validateMember(myInitiativesList: any[]): number {
    const found = myInitiativesList.find(init => init?.initiative_id == this.dataControlSE?.currentResult?.initiative_id);
    if (!found) return 6;
    return found?.role === 'Member' ? 6 : 1;
  }

  constructor() {
    this.ensureRfrLoaded();
    // Expand collapsibles when landing inside their module (don't force-collapse on leave).
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (this.router.url.startsWith('/result-framework-reporting')) this.ensureRfrLoaded();
      if (this.router.url.includes('/result/result-detail/')) this.resultCenterExpanded.set(true);
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
    // This runs from the CONSTRUCTOR, before any fetch resolves, so the lists can legitimately be
    // absent here. Reading `.length` off undefined threw during component construction and took the
    // app's only navigation down with it.
    const alreadyLoaded =
      (this.homeSE.mySPsList()?.length ?? 0) || (this.homeSE.otherSPsList()?.length ?? 0) || (this.homeSE.otherProjectsList()?.length ?? 0);
    if (!alreadyLoaded) this.homeSE.getScienceProgramsProgress();
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

  /**
   * Per-programme dot colour, as in the approved reference (SIDEBAR-SPEC.md §2).
   *
   * The API does not carry a colour: `SPProgress` has no such field. So it is derived
   * DETERMINISTICALLY from `initiativeCode` — the same programme always gets the same dot,
   * across reloads, users and sessions, with no persistence and no extra request.
   *
   * Values are design tokens, never literals, so the palette follows any future rebrand.
   */
  /**
   * Every swatch must clear the WCAG 1.4.11 3:1 non-text floor against the DARK sidebar surface
   * (#271862) — these dots are the only thing distinguishing one programme from another on the
   * collapsed rail, so an invisible one is a real failure.
   *
   * Two candidates were dropped for measuring below it: --pr-chart-2 (#6b46e5, 2.6072 — it is the
   * primary, too dark for its own sidebar) and --pr-color-red-300 (#d00416, 2.6634). Their
   * replacements are the lighter stops of the same families.
   */
  private readonly programDotPalette: readonly string[] = [
    'var(--pr-chart-3)', // #9270f0 — 4.1615
    'var(--pr-color-green-500)', // #19ae58 — 5.1939
    'var(--pr-color-blue-500)', // #3b82f6 — 4.0981
    'var(--pr-sidebar-accent)', // #c4b5fd — 8.1642
    'var(--pr-color-yellow-300)', // #dfb400 — 7.6553
    'var(--pr-chart-4)', // #c4a0f7 — 6.9753
    'var(--pr-color-orange-500)', // #f97316 — 5.3771
    'var(--pr-color-red-100)' // #fc7c7c — 5.9666
  ];

  programDotColor(code: string | null | undefined): string {
    if (!code) return this.programDotPalette[0];
    // Programme codes are sequential (SP01, SP06, SP10…), so indexing by their NUMBER spreads
    // adjacent programmes across the palette. A character hash collided in practice — SP01 and
    // SP12 both landed on the same swatch, which reads as "these two are related".
    const digits = code.match(/\d+/)?.[0];
    const index = digits ? Number(digits) : [...code].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0);
    return this.programDotPalette[index % this.programDotPalette.length];
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
