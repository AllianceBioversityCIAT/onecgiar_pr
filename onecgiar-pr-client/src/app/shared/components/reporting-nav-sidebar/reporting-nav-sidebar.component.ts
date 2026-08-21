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
import { PrRoute, extraRoutingApp, routingApp } from '../../routing/routing-data';
import { RolesService } from '../../services/global/roles.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { APP_VERSION } from '../../constants/app-version.constants';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { SPProgress } from '../../interfaces/SP-progress.interface';
import { ApiService } from '../../services/api/api.service';
import { FontScale, FONT_SCALE_OPTIONS, FontScaleService } from '../../services/font-scale.service';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';

/** A result-detail section row with the (dynamically injected) green-check state. */

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

  readonly isProduction = environment.production;
  readonly appVersion = APP_VERSION;
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
  /** Sentence case throughout, matching the reference and the two siblings already spelled that way. */
  readonly adminModuleLinks: NavSubLink[] = [
    { name: 'Tickets dashboard', path: '/admin-module/tickets-dashboard', icon: 'lucideTicket' },
    { name: 'Phase management', path: '/admin-module/phase-management', icon: 'lucideLayers' },
    { name: 'Knowledge products', path: '/admin-module/knowledge-products', icon: 'lucideBookOpen' },
    { name: 'User management', path: '/admin-module/user-management', icon: 'lucideUserCog' }
  ];

  /**
   * Planned ToC / program shell — SP cards and the band land here.
   * Emerging is NOT a Platform item (CURRENT): open it from the program band CTA.
   */
  readonly rfrPlannedPath = '/result-framework-reporting/planned-toc';
  /** Programme pages are addressed by CODE in the path, like prtest. */
  readonly rfrProgramPath = '/result-framework-reporting/entity-details';

  /**
   * Overview is the OTHER tab of the same program shell. Highlighting the active SP still
   * applies here; switching tab does not leave the program.
   */
  readonly rfrOverviewPath = '/result-framework-reporting/overview';

  /**
   * Platform list order matches CURRENT reference:
   * Results Center · Innovation Packages · Quality Assurance · Bilateral Results · My Admin
   * (+ Admin module at the end when the user is admin — product need, not in the mock).
   *
   * `result-framework-reporting` is omitted: programme entry is My science programs above.
   */
  private static readonly PLATFORM_ORDER = [
    'result',
    'ipsr',
    'quality-assurance',
    'bilateral',
    'init-admin-module',
    'admin-module'
  ] as const;

  readonly sections = computed<PrRoute[]>(() => {
    const primary = routingApp.filter(
      o =>
        !(o.prHide || this.validateAdminModuleAndRole(o)) &&
        o.path !== 'result-framework-reporting' &&
        o.path !== 'outcome-indicator-module'
    );
    const withAdmin =
      this.rolesSE?.isAdmin
        ? (() => {
            const admin = extraRoutingApp.find(o => o.path === 'admin-module' && !o.prHide);
            return admin ? [...primary, admin] : primary;
          })()
        : primary;

    const rank = (path: string) => {
      const i = ReportingNavSidebarComponent.PLATFORM_ORDER.indexOf(path as (typeof ReportingNavSidebarComponent.PLATFORM_ORDER)[number]);
      return i === -1 ? 99 : i;
    };
    return [...withAdmin].sort((a, b) => rank(a.path) - rank(b.path));
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

  // ══════════════════════════════════════════════════════════════════════════
  // Pinned programmes (favourites) — reference: a star on every "Other science
  // programs" row, capped at 5, pinned ones lifted into their own block above
  // the rest and carried onto the collapsed rail.
  // ══════════════════════════════════════════════════════════════════════════

  /** localStorage key. Project convention: every key this app owns starts with `pr-`. */
  private static readonly PINNED_STORAGE_KEY = 'pr-sidebar-pinned-programs';

  /** The reference caps favourites at 5 and shows a tooltip when a 6th is attempted. */
  static readonly MAX_PINNED = 5;

  /** Pinned programme CODES, in the order the user pinned them. Survives reloads. */
  readonly pinnedCodes = signal<string[]>(ReportingNavSidebarComponent.readPinnedCodes());

  /**
   * Code of the row currently showing the "you can pin up to 5 programs." tooltip.
   * Kept as a single code rather than a boolean so only the hovered/attempted row shows it.
   */
  readonly pinLimitWarningCode = signal<string | null>(null);

  /** Whether the user still has room for another favourite. */
  readonly canPinMore = computed(() => this.pinnedCodes().length < ReportingNavSidebarComponent.MAX_PINNED);

  /**
   * Pinned programmes resolved against the "other" list, in PIN order (not API order) —
   * a favourites list that reshuffles itself on every fetch is not a favourites list.
   * Codes that no longer resolve (programme gone from the user's portfolio) simply drop out.
   */
  readonly pinnedPrograms = computed<SPProgress[]>(() => {
    const others = this.homeSE.otherSPsList() ?? [];
    return this.pinnedCodes()
      .map(code => others.find(sp => sp.initiativeCode === code))
      .filter((sp): sp is SPProgress => !!sp);
  });

  /** "Other science programs" minus whatever is already rendered in the pinned block. */
  readonly otherProgramsRest = computed<SPProgress[]>(() => {
    const pinned = new Set(this.pinnedCodes());
    return (this.homeSE.otherSPsList() ?? []).filter(sp => !pinned.has(sp.initiativeCode));
  });

  /** Rows a collapsible group renders: "other" hides whatever the pinned block already shows. */
  rowsOf(group: ProgramGroup): SPProgress[] {
    return group.key === 'other' ? this.otherProgramsRest() : group.items;
  }

  /** Only "Other science programs" is pinnable — "my" programmes are permanent by definition. */
  isPinnable(group: ProgramGroup): boolean {
    return group.key === 'other';
  }

  isPinned(code: string | null | undefined): boolean {
    return !!code && this.pinnedCodes().includes(code);
  }

  /**
   * Pin / unpin from a row that is itself a router link — hence the explicit
   * `preventDefault()`: without it the click both toggles the star AND navigates away.
   */
  togglePin(code: string | null | undefined, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!code) return;

    const current = this.pinnedCodes();
    if (current.includes(code)) {
      this.persistPinned(current.filter(c => c !== code));
      if (this.pinLimitWarningCode() === code) this.pinLimitWarningCode.set(null);
      return;
    }
    if (current.length >= ReportingNavSidebarComponent.MAX_PINNED) {
      // Silently ignoring the click reads as a broken button, so explain the cap instead.
      this.pinLimitWarningCode.set(code);
      return;
    }
    this.persistPinned([...current, code]);
  }

  /** Hovering an unpinnable row explains WHY the star will not take, before the click. */
  onOtherRowEnter(code: string | null | undefined): void {
    if (code && !this.canPinMore() && !this.isPinned(code)) this.pinLimitWarningCode.set(code);
  }

  onOtherRowLeave(code: string | null | undefined): void {
    if (this.pinLimitWarningCode() === code) this.pinLimitWarningCode.set(null);
  }

  private persistPinned(codes: string[]): void {
    this.pinnedCodes.set(codes);
    try {
      localStorage.setItem(ReportingNavSidebarComponent.PINNED_STORAGE_KEY, JSON.stringify(codes));
    } catch {
      // Private-browsing / quota errors must not take the navigation down: the pins simply
      // stay session-only.
    }
  }

  private static readPinnedCodes(): string[] {
    try {
      const raw = localStorage.getItem(ReportingNavSidebarComponent.PINNED_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed)) return [];
      // Re-clamp on read: the cap could have been lowered, or the value hand-edited.
      return parsed.filter((c): c is string => typeof c === 'string' && !!c).slice(0, ReportingNavSidebarComponent.MAX_PINNED);
    } catch {
      return [];
    }
  }

  /**
   * Programmes shown on the collapsed icon rail — the user's own, plus their pinned favourites
   * (that is what pinning is FOR: reaching a non-member programme without expanding the sidebar).
   * Projects are still excluded; the rail has no room for the full list.
   */
  readonly railPrograms = computed<SPProgress[]>(() => {
    const mine = this.homeSE.mySPsList() ?? [];
    const mineCodes = new Set(mine.map(sp => sp.initiativeCode));
    return [...mine, ...this.pinnedPrograms().filter(sp => !mineCodes.has(sp.initiativeCode))];
  });

  // `?? []` is load-bearing, not defensive noise: the template reads `group.items.length`, so a
  // list that arrives undefined (a failed or in-flight fetch) crashed the whole sidebar with
  // "Cannot read properties of undefined (reading 'length')" — taking the app's only navigation
  // down with it. Caught by the railPrograms test.
  readonly programGroups = computed<ProgramGroup[]>(() => [
    { key: 'mine', label: 'My science programs', items: this.homeSE.mySPsList() ?? [] },
    { key: 'other', label: 'Other science programs', items: this.homeSE.otherSPsList() ?? [] },
    // Product reality (not in the mock): non-SP projects still need a home.
    { key: 'projects', label: 'Other projects', items: this.homeSE.otherProjectsList() ?? [] }
  ]);

  /** Programme page for a card: `…/entity-details/SP01`, addressed by CODE (prtest's shape). */
  programLink(sp: SPProgress): unknown[] {
    return [this.rfrProgramPath, sp?.initiativeCode];
  }

  /**
   * Code of the programme currently open, so the tree highlights it. Read from the
   * `…/entity-details/<CODE>` path segment; the legacy `?sp=<id>` query param is still
   * honoured (mapped through the programme lists) so old saved links keep highlighting.
   */
  readonly activeSpCode = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.readActiveSpCode())
    ),
    { initialValue: null as string | null }
  );

  private readActiveSpCode(): string | null {
    const url = this.router.url;
    const fromPath = /\/result-framework-reporting\/entity-details\/([^/?#]+)/.exec(url.split('?')[0]);
    if (fromPath) return decodeURIComponent(fromPath[1]);

    const raw = Number(this.router.parseUrl(url).queryParams['sp']);
    if (Number.isNaN(raw)) return null;

    const all = [...(this.homeSE.mySPsList() ?? []), ...(this.homeSE.otherSPsList() ?? []), ...(this.homeSE.otherProjectsList() ?? [])];
    return all.find(sp => sp.initiativeId === raw)?.initiativeCode ?? null;
  }

  /** Currently selected program id — kept for the legacy `?sp=` section links. */
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

  // The open result's sections, progress and Submit / AI review actions used to live here as a
  // collapsible subtree. They now belong to `ResultSectionsService` + `app-result-sections-sidebar`
  // (pages/results/pages/result-detail/components/result-sections-sidebar), so this nav no longer
  // knows about green checks or submission state.

  constructor() {
    this.ensureRfrLoaded();
    // Expand collapsibles when landing inside their module (don't force-collapse on leave).
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (this.router.url.startsWith('/result-framework-reporting')) this.ensureRfrLoaded();
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

  // --- Footer chrome. The user/account menu is NOT here: it lives in the topbar
  // (PROGRAM-SHELL-SPEC.md §2), so only the text-size popover remains. ---
  readonly fontMenuOpen = signal(false);
  readonly fontMenuPositions: ConnectedPosition[] = [{ originX: 'start', overlayX: 'start', originY: 'top', overlayY: 'bottom' }];

  iconFor(section: PrRoute): string {
    return this.sectionIcons[section.path ?? ''] ?? 'lucideCircleDot';
  }

  /**
   * Router target of a Platform row. Deliberately shared by every branch of the template —
   * including the in-result "Results Center" row — so the label always resolves to the same
   * destination whether or not a result happens to be open. `/result` redirects through
   * `results-outlet` to `results-list` (see `resultRouting` in `shared/routing/routing-data.ts`).
   */
  sectionRootLink(section: PrRoute): string {
    return `/${section.path}`;
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
    // A centre with no acronym AND no id would build `/bilateral/undefined/home`, which the
    // `:acronym` route happily matches — rendering a bilateral shell for a nonexistent centre.
    return (this.api.rolesSE.getMyCenters() ?? []).filter((center: { center_acronym?: string; center_id?: unknown }) =>
      Boolean(center?.center_acronym || center?.center_id)
    );
  }

  /** Bilateral home for a centre, falling back to its id when the acronym is missing. */
  centerHomeLink(center: { center_acronym?: string; center_id?: unknown }): unknown[] {
    return ['/bilateral', center?.center_acronym || String(center?.center_id ?? ''), 'home'];
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

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.fontMenuOpen.set(false);
    this.closeIconFlyout();
  }
}
