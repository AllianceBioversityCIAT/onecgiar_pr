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
  /** Full RFR action list (Dashboard → Planned → Emerging → Centers). */
  readonly rfrSectionLinks: NavSubLink[] = [
    { name: 'Dashboard', path: '/result-framework-reporting/home', icon: 'lucideLayoutDashboard' },
    { name: 'Results planned in your 2026 ToC', path: '/result-framework-reporting/planned-toc', icon: 'lucideClipboardCheck' },
    { name: 'Report Emerging results', path: '/result-framework-reporting/emerging', icon: 'lucideSparkles' },
    { name: 'My CGIAR Centers', path: '/result-framework-reporting/centers', icon: 'lucideBuilding2' }
  ];

  /** Planned ToC path — Science Programs nest under this entry (AoW children live on that surface). */
  readonly rfrPlannedPath = '/result-framework-reporting/planned-toc';

  /** Section links that sit above the Planned + programs block. */
  readonly rfrLinksBeforePrograms: NavSubLink[] = [this.rfrSectionLinks[0]];

  /** Section links that sit below the Planned + programs block. */
  readonly rfrLinksAfterPrograms: NavSubLink[] = this.rfrSectionLinks.slice(2);

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

  /** True when the URL is Planned ToC (a program is open). */
  readonly isPlannedActive = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url.split('?')[0] === this.rfrPlannedPath)
    ),
    { initialValue: false }
  );

  /**
   * Local expand/collapse for Science Programs under Planned.
   * Clicking Planned toggles this — it does NOT navigate (pick a program to enter).
   */
  readonly plannedExpanded = signal(this.router.url.split('?')[0] === this.rfrPlannedPath);

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
      const path = this.router.url.split('?')[0];
      if (path === this.rfrPlannedPath) {
        this.plannedExpanded.set(true);
        this.ensureRfrLoaded();
      } else {
        // Leaving Planned (Dashboard / Emerging / Centers / elsewhere) collapses the tree
        this.plannedExpanded.set(false);
      }
      if (this.router.url.startsWith('/result-framework-reporting')) this.ensureRfrLoaded();
      if (this.router.url.includes('/result/result-detail/')) this.resultCenterExpanded.set(true);
      if (this.router.url.startsWith('/init-admin-module')) this.myAdminExpanded.set(true);
      if (this.router.url.startsWith('/admin-module')) this.adminModuleExpanded.set(true);
    });
  }

  /** Expand/collapse Planned programs only — never navigates by itself. */
  togglePlanned(): void {
    if (this.isCollapsed()) return;
    const next = !this.plannedExpanded();
    this.plannedExpanded.set(next);
    if (next) this.ensureRfrLoaded();
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
