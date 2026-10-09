import { A11yModule } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Injector, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideBookOpen,
  lucideCheck,
  lucideChevronDown,
  lucideExternalLink,
  lucideLifeBuoy,
  lucideMail,
  lucideMegaphone,
  lucideMessageCircle,
  lucideRocket,
  lucideRotateCcw,
  lucideSearch,
  lucideSparkles
} from '@ng-icons/lucide';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { bellHandoffUrl } from '../../../pages/results/pages/results-outlet/pages/results-notifications/utils/request-decision';
import { BELL_QUICK_INBOX_COPY } from '../../../internationalization/bell-quick-inbox.copy';
import { environment } from '../../../../environments/environment';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { HlmTabsImports } from '@spartan/tabs';
import { HlmBadge } from '@spartan/badge';
import { HlmButton } from '@spartan/button';
import { PopUpNotificationItemComponent } from '../header-panel/components/pop-up-notification-item/pop-up-notification-item.component';
import { GlobalSearchPaletteComponent } from '../global-search-palette/global-search-palette.component';
import { ReportFeedbackDialogComponent } from '../report-feedback-dialog/report-feedback-dialog.component';
import { ConsoleCaptureService } from '../../services/console-capture.service';
import { SupportChatService } from '../../services/support-chat.service';
import { CLARISA_GLOSSARY_URL } from '../../constants/clarisa-links.constants';
import { FontScale, FONT_SCALE_OPTIONS, FontScaleService } from '../../services/font-scale.service';
import { ReportingGuideService } from '../../../pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';

/** BELL-R-3: the popover lists at most this many rows; the rest is a "+N more" link to the inbox. */
export const BELL_MAX_ROWS = 10;
/** BELL-T-10: client-side filter of the popover rows. Never a phase filter, never touches the badge. */
export type BellTab = 'all' | 'decide' | 'updates';

/** BELL-R-1: counts above this render as `99+`. */
export const BELL_BADGE_CAP = 99;

/**
 * CURRENT shell topbar (PRMS-Shell.dc.html header):
 * centered Search · notifications · user chip.
 * The sidebar collapse/expand toggle moved into `reporting-nav-sidebar` (both states) —
 * SPEC:changes/sidebar-toggle-consolidation.
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
    ...HlmTabsImports,
    HlmBadge,
    HlmButton,
    PopUpNotificationItemComponent,
    GlobalSearchPaletteComponent,
    ReportFeedbackDialogComponent
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideBell,
      lucideCheck,
      lucideLifeBuoy,
      lucideMessageCircle,
      lucideMegaphone,
      lucideMail,
      lucideChevronDown,
      lucideExternalLink,
      lucideBookOpen,
      lucideSparkles,
      lucideRotateCcw,
      lucideRocket
    })
  ],
  templateUrl: './shell-topbar.component.html',
  styleUrls: ['./shell-topbar.component.scss']
})
export class ShellTopbarComponent {
  readonly api = inject(ApiService);
  readonly dataControlSE = inject(DataControlService);
  readonly router = inject(Router);
  readonly resultsNotificationsSE = inject(ResultsNotificationsService);

  private readonly palette = viewChild(GlobalSearchPaletteComponent);
  private readonly searchTrigger = viewChild<ElementRef<HTMLButtonElement>>('searchTrigger');

  inLocal = (environment as any)?.inLocal;
  /**
   * Hides the "Report a bug / adjustment" entry point in production: a report
   * filed from there lands straight in the team's Jira board and counts against
   * the SLA. Test environments keep it. Same flag `onlyTest` navigation entries
   * use, injected per environment by the pipeline.
   */
  readonly isProduction = environment.production;
  userMenuOpen = signal(false);
  reportFeedbackOpen = signal(false);
  supportMenuOpen = signal(false);

  private readonly supportChatSE = inject(SupportChatService);

  // P2-3682: Glossary, Tour and Text size used to hang from the sidebar's EXTRAS block, which the
  // design trims down to Release notes. Glossary and Tour moved into the Help menu; text size kept
  // its own topbar button — the requirement sent it to Settings in the account menu, and that was
  // built and then undone, because an accessibility control two clicks deep is one nobody finds.
  private readonly reportingGuideSE = inject(ReportingGuideService);
  private readonly homeSE = inject(ResultFrameworkReportingHomeService);
  readonly fontScaleSE = inject(FontScaleService);
  readonly fontScaleOptions = FONT_SCALE_OPTIONS;
  readonly clarisaGlossaryUrl = CLARISA_GLOSSARY_URL;

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
  /**
   * quick/bell-popover-hidden: the bell popover is switched off — the button goes straight to the
   * notifications inbox. The popover (template, tabs, inline decisions) is kept intact so a redesigned
   * version can reuse it: set this to `true` to bring it back.
   */
  bellPopoverEnabled = false;

  readonly userMenuPositions: ConnectedPosition[] = [
    { originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top', offsetY: 8 }
  ];
  /**
   * BELL-T-8: end-aligned under the bell (unchanged on desktop), with a start-aligned fallback for
   * viewports too narrow to hold it. Together with `notificationsViewportMargin` and `push` in the
   * template, the pane never leaves the viewport.
   */
  readonly notificationsPositions: ConnectedPosition[] = [
    { originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top', offsetY: 8 },
    { originX: 'start', overlayX: 'start', originY: 'bottom', overlayY: 'top', offsetY: 8 }
  ];
  /** Minimum gap (px) between the bell popover and every viewport edge. */
  readonly notificationsViewportMargin = 16;
  /** Space left below the bell (px); caps the panel so header and footer stay on screen. */
  readonly notificationsMaxHeight = signal<number | null>(null);
  /** Panel width in its own (zoomed) CSS px: min(360, viewport - 2 margins) under the app zoom. */
  readonly notificationsWidth = signal<number | null>(null);
  /** Support hangs from the LEFT edge of its trigger, per the reference (P2-3683). */
  readonly supportMenuPositions: ConnectedPosition[] = [
    { originX: 'start', overlayX: 'start', originY: 'bottom', overlayY: 'top', offsetY: 8 }
  ];

  /**
   * "Start a support chat" (P2-3683). Tawk's floating bubble is hidden now, so this is the only
   * way into the conversation.
   *
   * The widget is genuinely absent for anonymous users and in local (`app.component.html` skips
   * `<app-tawk>` on `!inLocal`), and the third-party script can fail to load — so when it is not
   * there the menu stays OPEN instead of closing on a click that did nothing. A menu that shuts
   * with no chat on screen reads as "it broke silently"; leaving it open lets the user try again
   * or pick the other entry.
   */
  openSupportChat(): void {
    if (this.supportChatSE.open()) this.supportMenuOpen.set(false);
  }

  /** "Give feedback" (P2-3683) — same report dialog, now reached through the Support menu. */
  openFeedbackFromSupport(): void {
    this.supportMenuOpen.set(false);
    this.openReportFeedback();
  }

  readonly bellCopy = BELL_QUICK_INBOX_COPY.popover;
  private readonly injector = inject(Injector);
  private readonly notifPanel = viewChild<ElementRef<HTMLElement>>('notifPanel');
  private readonly bellOverlay = viewChild<CdkConnectedOverlay>('bellOverlay');
  private readonly notifTriggerEl = viewChild('notifTrigger', { read: ElementRef<HTMLElement> });
  /** Index of the popover row that last held focus, so focus can land on its successor (NFR focus). */
  private lastFocusedRow = 0;

  /** BELL-T-4: everything below reads the bell's own phase-agnostic snapshot (BELL-T-2). */
  readonly bellCount = computed(() => this.resultsNotificationsSE.bellCount());
  /** BELL-T-10: the active tab. The cap (R-3) and "+N more" below count against it. */
  readonly bellTab = signal<BellTab>('all');
  /** BRS-R-6: the Decide tab counts every pending request (fresh or seen), so it ignores the badge. */
  readonly bellDecisionCount = computed(() => this.resultsNotificationsSE.bellPendingRequestCount());
  /** BRS-R-6: the Updates tab counts unread updates (the read ones listed under "Earlier" do not count). */
  readonly bellUpdatesCount = computed(() => this.resultsNotificationsSE.bellCounts().unreadUpdates);
  /** PPG-T-4: loaded read updates (the "Earlier" update rows); they are not part of the server counts. */
  private readonly bellReadOnlyCount = computed(() => this.resultsNotificationsSE.bellItems().filter(row => row?.kind === 'update' && row?.fresh === false).length);
  /**
   * BRS-R-6 / PPG-T-4: the All tab counts everything the popover could list — server pending requests +
   * server unread updates + the loaded read updates. With <=10 rows per group this equals `bellItems().length`.
   */
  readonly bellAllCount = computed(() => {
    const counts = this.resultsNotificationsSE.bellCounts();
    return counts.pendingRequests + counts.unreadUpdates + this.bellReadOnlyCount();
  });
  readonly bellTabItems = computed(() => {
    const items = this.resultsNotificationsSE.bellItems();
    const tab = this.bellTab();
    if (tab === 'decide') return items.filter(row => row?.kind === 'decision');
    if (tab === 'updates') return items.filter(row => row?.kind === 'update');
    return items;
  });
  readonly bellVisibleItems = computed(() => this.bellTabItems().slice(0, BELL_MAX_ROWS));
  /** BRS-R-8: index (within the rendered rows) of the first non-fresh row, where "Earlier" goes; -1 = none. */
  readonly bellEarlierIndex = computed(() => {
    const index = this.bellVisibleItems().findIndex(row => row?.fresh === false);
    return index > 0 ? index : -1;
  });
  /** PPG-T-4: "+N more" uses the server totals of the ACTIVE tab, not the (bounded) loaded rows. */
  readonly bellOverflow = computed(() => {
    const tab = this.bellTab();
    const total =
      tab === 'decide' ? this.bellDecisionCount() : tab === 'updates' ? this.bellUpdatesCount() + this.bellReadOnlyCount() : this.bellAllCount();
    return Math.max(0, total - BELL_MAX_ROWS);
  });
  /** BELL-T-10: in-flight "Mark as read" (blocks a double click). */
  readonly markingRead = signal(false);
  readonly bellError = computed(() => this.resultsNotificationsSE.bellError());
  readonly bellButtonLabel = computed(() => this.bellCopy.buttonLabel(this.bellCount()));
  /**
   * Which body the popover shows. `refreshBell()` resets `bellError` at the start of every call, so
   * during a retry the error line clears and `loading` takes over (only while there is nothing to
   * show). BELL-R-14: the error never hides rows we already have — see `bellError()` in the
   * template, which renders the line above the list in that case.
   */
  readonly bellState = computed<'loading' | 'error' | 'empty' | 'list'>(() => {
    // BRS-R-8: read/seen rows keep the list on screen even when the badge is 0.
    if (this.bellCount() > 0 || this.resultsNotificationsSE.bellItems().length > 0) return 'list';
    if (this.resultsNotificationsSE.bellError()) return 'error';
    if (this.resultsNotificationsSE.bellLoading()) return 'loading';
    return 'empty';
  });

  constructor() {
    // After an inline decision the row leaves the list; the focused button goes with it. Keep
    // keyboard users inside the popover instead of dropping them on <body>.
    effect(() => {
      this.resultsNotificationsSE.bellItems();
      untracked(() => {
        if (!this.notificationsOpen()) return;
        afterNextRender(() => this.restoreFocusIfLost(), { injector: this.injector });
      });
    });
  }

  notificationBadgeLength(): string {
    const n = this.bellCount();
    if (n <= 0) return '';
    return n > BELL_BADGE_CAP ? `${BELL_BADGE_CAP}+` : String(n);
  }

  /** BELL-R-4: refresh on every open, never awaited — the cached rows render meanwhile. */
  /** Bell click: the inbox while the popover is hidden (`bellPopoverEnabled`), else the popover. */
  onNotificationsClick(): void {
    if (this.bellPopoverEnabled) this.toggleNotifications();
    else this.goToNotifications();
  }

  toggleNotifications(): void {
    const opening = !this.notificationsOpen();
    this.notificationsOpen.set(opening);
    if (opening) {
      this.updateNotificationsBounds();
      // The panel exists after this render: re-measure with its own zoom, then let CDK re-place it.
      afterNextRender(
        () => {
          this.updateNotificationsBounds();
          this.bellOverlay()?.overlayRef?.updatePosition();
        },
        { injector: this.injector }
      );
      this.resultsNotificationsSE.refreshBell();
      this.resultsNotificationsSE.loadBellReadUpdates();
    }
  }

  /**
   * BELL-T-8: pure sizing maths. `zoom` is the effective CSS zoom of the panel (the app runs
   * `html { zoom: 1.15 }` at the larger text sizes): `vw`/`innerWidth`/trigger rects are device px
   * while the panel's `width`/`max-height` are zoomed CSS px, so every device-px budget is divided
   * by `zoom` to land in the panel's own units. Width is capped at `maxWidth` (the desktop width);
   * height gets what is left below the bell (+8px offset) minus the bottom margin, never < 120.
   */
  static notificationsBounds(
    viewport: { width: number; height: number },
    triggerBottom: number,
    zoom: number,
    margin = 16,
    maxWidth = 360
  ): { width: number; maxHeight: number } {
    const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    return {
      width: Math.max(Math.min(maxWidth, (viewport.width - 2 * margin) / z), 0),
      maxHeight: Math.max((viewport.height - triggerBottom - 8 - margin) / z, 120)
    };
  }

  /** Effective zoom of an element: rendered (device) width over its own CSS width. 1 without layout. */
  private measureZoom(el: HTMLElement | undefined | null): number {
    const css = el?.offsetWidth ?? 0;
    const rendered = el?.getBoundingClientRect?.().width ?? 0;
    return css > 0 && rendered > 0 ? rendered / css : 1;
  }

  /** Recompute the bell panel bounds; the panel's own zoom wins, the bell button's seeds the first pass. */
  @HostListener('window:resize')
  updateNotificationsBounds(): void {
    const trigger = this.notifTriggerEl()?.nativeElement;
    const bottom = trigger?.getBoundingClientRect?.().bottom;
    if (typeof bottom !== 'number') return;
    const zoom = this.measureZoom(this.notifPanel()?.nativeElement ?? trigger);
    const bounds = ShellTopbarComponent.notificationsBounds(
      { width: window.innerWidth, height: window.innerHeight },
      bottom,
      zoom,
      this.notificationsViewportMargin
    );
    this.notificationsWidth.set(bounds.width);
    this.notificationsMaxHeight.set(bounds.maxHeight);
  }

  rememberFocusedRow(event: Event): void {
    const row = (event.target as HTMLElement | null)?.closest?.('[data-bell-row]');
    const index = Number(row?.getAttribute('data-bell-row'));
    if (Number.isFinite(index)) this.lastFocusedRow = index;
  }

  private restoreFocusIfLost(): void {
    const panel = this.notifPanel()?.nativeElement;
    const active = document.activeElement;
    const focusIsLost = !active || active === document.body;
    if (!this.notificationsOpen() || !panel || !focusIsLost) return;
    const rows = panel.querySelectorAll<HTMLElement>('[data-bell-row]');
    const next = rows[Math.min(this.lastFocusedRow, rows.length - 1)];
    (next?.querySelector<HTMLElement>('button:not([disabled]), a[href]') ?? panel).focus();
  }

  setBellTab(tab: BellTab): void {
    this.bellTab.set(tab);
  }

  /** BELL-T-10: marks every unread update read (all phases); decisions are untouched. */
  async markAllRead(): Promise<void> {
    if (this.markingRead()) return;
    this.markingRead.set(true);
    try {
      await this.resultsNotificationsSE.markAllBellRead();
    } catch {
      // The service already logged it; rows stay as they were and the control is re-enabled below.
    } finally {
      this.markingRead.set(false);
    }
  }

  /** BELL-R-6 / R-7: a row that needs the inbox's richer step hands off; nothing is decided here. */
  onBellHandoff(event: { row: any; action: 'accept' | 'decline' }): void {
    this.notificationsOpen.set(false);
    void this.router.navigateByUrl(bellHandoffUrl(event.row, event.action));
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

  /** Generic center roles add noise when repeated on every row — hide them in the menu. */
  shouldShowAssignmentRole(role?: string | null): boolean {
    const normalized = role?.trim();
    if (!normalized) return false;
    return normalized.toLowerCase() !== 'center user';
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

  /**
   * NOTIF-T-6 rework: the routed `.../requests` destination this used to target was retired along
   * with `notificationsRouting`'s `requests`/`updates` children (`NOTIF-DD-6`) — repointed at the
   * merged `results-notifications` view, same base route `pop-up-notification-item.component.ts`'s
   * `generateUrlLink()` now uses.
   */
  goToNotifications(): void {
    void this.router.navigate(['/result/results-outlet/results-notifications']);
  }

  isInNotificationsRoute(): boolean {
    return this.router.url.includes('results-notifications');
  }

  isInWhatsNewRoute(): boolean {
    return this.router.url.includes('/whats-new');
  }

  /**
   * P2-3682. The tour itself is unchanged: its steps target `data-guide` hooks inside the sidebar
   * body, never this trigger, and `startSidebarTour` re-opens a collapsed sidebar on its own — so
   * firing it from the topbar highlights the same things in the same order. The three flags are
   * rebuilt from the same two services the sidebar read them from.
   */
  startPlatformSidebarTour(): void {
    this.supportMenuOpen.set(false);
    this.reportingGuideSE.startSidebarTour({
      hasMyPrograms: (this.homeSE.mySPsList() ?? []).length > 0,
      hasOtherPrograms: (this.homeSE.otherSPsList() ?? []).length > 0,
      hasCenters: this.getMyCenters().length > 0
    });
  }

  selectFontScale(value: FontScale): void {
    this.fontScaleSE.set(value);
  }

  /**
   * Centre ids all read `CENTER-01`, `CENTER-02`… under a heading that already says CENTERS, so the
   * prefix was the same seven characters repeated down the column, pushing every centre name to the
   * right for nothing. Only the prefix is dropped, and the full id stays in the row's title.
   */
  shortCode(code: unknown): string {
    const text = String(code ?? '');
    return text.replace(/^CENTER[-_\s]*/i, '') || text;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.userMenuOpen.set(false);
    this.notificationsOpen.set(false);
    this.supportMenuOpen.set(false);
  }
}
