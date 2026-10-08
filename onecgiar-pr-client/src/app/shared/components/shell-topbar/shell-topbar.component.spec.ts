import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, OverlayModule } from '@angular/cdk/overlay';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { readFileSync } from 'fs';
import { join } from 'path';

import { ShellTopbarComponent } from './shell-topbar.component';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { ResultsListFilterService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { environment } from '../../../../environments/environment';
import { SupportChatService } from '../../services/support-chat.service';
import { FontScaleService } from '../../services/font-scale.service';
import { ReportingGuideService } from '../../../pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { CLARISA_GLOSSARY_URL } from '../../constants/clarisa-links.constants';
import { BELL_QUICK_INBOX_COPY } from '../../../internationalization/bell-quick-inbox.copy';

/**
 * The topbar owns the ONLY user/account menu in the shell (PROGRAM-SHELL-SPEC.md §2). The
 * sidebar footer chip that used to duplicate it is gone, so the user getters — including the
 * platform role badge the chip carried — are asserted here.
 */
describe('ShellTopbarComponent', () => {
  let component: ShellTopbarComponent;
  let fixture: ComponentFixture<ShellTopbarComponent>;

  let apiMock: any;
  let dataControlMock: any;
  let routerMock: any;
  let notificationsMock: any;
  let bellRows: any;
  let filterMock: any;
  let fontScaleMock: any;
  let reportingGuideMock: any;
  let homeMock: any;

  const build = async () => {
    await TestBed.configureTestingModule({
      imports: [ShellTopbarComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: DataControlService, useValue: dataControlMock },
        { provide: Router, useValue: routerMock },
        { provide: ResultsNotificationsService, useValue: notificationsMock },
        { provide: ResultsListFilterService, useValue: filterMock },
        { provide: FontScaleService, useValue: fontScaleMock },
        { provide: ReportingGuideService, useValue: reportingGuideMock },
        { provide: ResultFrameworkReportingHomeService, useValue: homeMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(ShellTopbarComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(ShellTopbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  };

  beforeEach(() => {
    apiMock = {
      authSE: { localStorageUser: null as any, logout: jest.fn() },
      rolesSE: {
        roles: null as any,
        getMyCenters: jest.fn().mockReturnValue([{ center_id: 'CIAT', center_name: 'CIAT', role_name: 'Member' }])
      },
      dataControlSE: { myInitiativesList: [] as any[] },
      resultsSE: { PATCH_handlePopUpViewed: jest.fn() }
    };
    dataControlMock = { show_qa_full_screen: false, focusMode: signal(false) };
    routerMock = { url: '/result/results-outlet/results-list', navigate: jest.fn(), navigateByUrl: jest.fn() };
    bellRows = signal<any[]>([]);
    bellCountsOverride = signal<any>(null);
    notificationsMock = {
      updatesPopUpData: [] as any[],
      handlePopUpNotificationLastViewed: jest.fn(),
      bellItems: bellRows,
      // BRS: the badge counts fresh rows only (a row without `fresh` counts as fresh); Decide counts every request.
      bellUpdates: computed(() => bellRows().filter(row => row?.kind === 'update' && row?.fresh !== false)),
      // PPG-T-4: server counts; in this mock they mirror the rows (<=10 per group parity).
      bellCounts: computed(() => bellCountsOverride() ?? ({
        unseenRequests: bellRows().filter(row => row?.kind === 'decision' && row?.fresh !== false).length,
        pendingRequests: bellRows().filter(row => row?.kind === 'decision').length,
        unreadUpdates: bellRows().filter(row => row?.kind === 'update' && row?.fresh !== false).length
      })),
      bellLoading: signal(false),
      bellError: signal(false),
      refreshBell: jest.fn(),
      loadBellReadUpdates: jest.fn(),
      markAllBellRead: jest.fn().mockResolvedValue(undefined)
    };
    // BRS: the badge counts fresh items (unseen requests + unread updates) from the counts.
    notificationsMock.bellPendingRequestCount = computed(() => notificationsMock.bellCounts().pendingRequests);
    notificationsMock.bellCount = computed(() => notificationsMock.bellCounts().unseenRequests + notificationsMock.bellCounts().unreadUpdates);
    filterMock = { text_to_search: signal('') };
    fontScaleMock = { scale: signal('default'), set: jest.fn(), reset: jest.fn() };
    reportingGuideMock = { startSidebarTour: jest.fn() };
    homeMock = { mySPsList: signal([] as any[]), otherSPsList: signal([] as any[]) };
  });

  it('creates, and no longer syncs anything with the Results Center list filter', async () => {
    filterMock.text_to_search.set('cassava');
    await build();
    expect(component).toBeTruthy();
    // The Search control is a palette trigger now, not a filter field: it must not read or write
    // `text_to_search`. Two search models in one topbar is the thing this change removed.
    expect(filterMock.text_to_search()).toBe('cassava');
    expect((component as any).searchQuery).toBeUndefined();
    expect((component as any).onSearchInput).toBeUndefined();
    expect((component as any).onSearchSubmit).toBeUndefined();
  });

  // ------------------------------------------------------------------ user menu
  describe('user menu', () => {
    it('getUserInitials prefers the stored acronym', async () => {
      apiMock.authSE.localStorageUser = { user_acronym: 'YZ', user_name: 'Yecksin Zuniga' };
      await build();
      expect(component.getUserInitials()).toBe('YZ');
    });

    it('getUserInitials derives them from the full name', async () => {
      apiMock.authSE.localStorageUser = { user_name: 'yecksin mauricio zuniga' };
      await build();
      expect(component.getUserInitials()).toBe('YM');
    });

    it('getUserInitials falls back to the email local part', async () => {
      apiMock.authSE.localStorageUser = { user_name: '', email: 'yecksin.zuniga@cgiar.org' };
      await build();
      expect(component.getUserInitials()).toBe('YZ');
    });

    it('getUserInitials / getUserName return an empty string when there is no user', async () => {
      await build();
      expect(component.getUserInitials()).toBe('');
      expect(component.getUserName()).toBe('');
    });

    it('exposes the user name when present', async () => {
      apiMock.authSE.localStorageUser = { user_name: 'Yecksin', email: 'y@cgiar.org', user_acronym: 'Y' };
      await build();
      expect(component.getUserName()).toBe('Yecksin');
    });

    // The role badge used to live on the (now removed) sidebar footer chip.
    it('getPlatformRole surfaces the application role and falls back to Guest', async () => {
      await build();
      expect(component.getPlatformRole()).toBe('Guest');

      apiMock.rolesSE.roles = { application: { description: 'Admin' } };
      expect(component.getPlatformRole()).toBe('Admin');
    });

    it('getInitiativeSeparatedByPortfolio only keeps portfolio 3', async () => {
      apiMock.dataControlSE.myInitiativesList = [{ portfolio_id: 3 }, { portfolio_id: 2 }];
      await build();
      expect(component.getInitiativeSeparatedByPortfolio()).toHaveLength(1);
    });

    it('getInitiativeSeparatedByPortfolio tolerates a missing list', async () => {
      apiMock.dataControlSE.myInitiativesList = undefined;
      await build();
      expect(component.getInitiativeSeparatedByPortfolio()).toEqual([]);
    });

    it('getMyCenters delegates to the roles service', async () => {
      await build();
      expect(component.getMyCenters()).toEqual([{ center_id: 'CIAT', center_name: 'CIAT', role_name: 'Member' }]);
      expect(apiMock.rolesSE.getMyCenters).toHaveBeenCalled();
    });

    it('shouldShowAssignmentRole hides the generic Center User label', async () => {
      await build();
      expect(component.shouldShowAssignmentRole('Center User')).toBe(false);
      expect(component.shouldShowAssignmentRole(' center user ')).toBe(false);
      expect(component.shouldShowAssignmentRole('Coordinator')).toBe(true);
      expect(component.shouldShowAssignmentRole('')).toBe(false);
    });
  });

  // ------------------------------------------------------------- other chrome
  // BELL-T-4 (BELL-R-1): the badge reads the bell's own count, not `updatesPopUpData`.
  it('notificationBadgeLength is empty at 0, the count up to 99, and 99+ above', async () => {
    await build();
    expect(component.notificationBadgeLength()).toBe('');

    bellRows.set([{ kind: 'update' }, { kind: 'update' }]);
    expect(component.notificationBadgeLength()).toBe('2');

    bellRows.set(Array.from({ length: 99 }, () => ({ kind: 'update' })));
    expect(component.notificationBadgeLength()).toBe('99');

    bellRows.set(Array.from({ length: 100 }, () => ({ kind: 'update' })));
    expect(component.notificationBadgeLength()).toBe('99+');
  });

  describe('search palette trigger', () => {
    it('openSearchPalette opens the palette and does not navigate', async () => {
      await build();
      const palette = { openPalette: jest.fn(), toggle: jest.fn(), open: jest.fn().mockReturnValue(false) };
      (component as any).palette = () => palette;

      component.openSearchPalette();

      expect(palette.openPalette).toHaveBeenCalledTimes(1);
      expect(routerMock.navigate).not.toHaveBeenCalled();
      expect(filterMock.text_to_search()).toBe('');
    });

    it('Cmd/Ctrl+K toggles the palette and preventDefaults so the browser does not win', async () => {
      await build();
      const palette = { openPalette: jest.fn(), toggle: jest.fn(), open: jest.fn().mockReturnValue(false) };
      (component as any).palette = () => palette;

      const event: any = { key: 'k', metaKey: true, ctrlKey: false, target: document.body, preventDefault: jest.fn() };
      component.onGlobalKeydown(event);

      expect(palette.toggle).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('focuses the trigger before OPENING, so CDK has somewhere to restore focus to', async () => {
      await build();
      const palette = { openPalette: jest.fn(), toggle: jest.fn(), open: jest.fn().mockReturnValue(false) };
      const focus = jest.fn();
      (component as any).palette = () => palette;
      (component as any).searchTrigger = () => ({ nativeElement: { focus } });

      component.onGlobalKeydown({ key: 'k', metaKey: true, ctrlKey: false, target: document.body, preventDefault: jest.fn() } as any);

      // Without this the shortcut opens from `<body>`, and closing drops the keyboard user at the
      // top of the document instead of back on the Search control.
      expect(focus).toHaveBeenCalledTimes(1);
    });

    it('does NOT re-focus the trigger when the shortcut is closing an open palette', async () => {
      await build();
      const palette = { openPalette: jest.fn(), toggle: jest.fn(), open: jest.fn().mockReturnValue(true) };
      const focus = jest.fn();
      (component as any).palette = () => palette;
      (component as any).searchTrigger = () => ({ nativeElement: { focus } });

      component.onGlobalKeydown({ key: 'k', metaKey: true, ctrlKey: false, target: document.body, preventDefault: jest.fn() } as any);

      expect(focus).not.toHaveBeenCalled();
      expect(palette.toggle).toHaveBeenCalledTimes(1);
    });

    it('ignores the shortcut while the user is typing in a field', async () => {
      await build();
      const palette = { openPalette: jest.fn(), toggle: jest.fn(), open: jest.fn().mockReturnValue(false) };
      (component as any).palette = () => palette;

      const input = document.createElement('input');
      const event: any = { key: 'k', metaKey: false, ctrlKey: true, target: input, preventDefault: jest.fn() };
      component.onGlobalKeydown(event);

      expect(palette.toggle).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('still toggles closed from the palette own input', async () => {
      await build();
      const palette = { openPalette: jest.fn(), toggle: jest.fn(), open: jest.fn().mockReturnValue(true) };
      (component as any).palette = () => palette;

      const input = document.createElement('input');
      const event: any = { key: 'K', metaKey: true, ctrlKey: false, target: input, preventDefault: jest.fn() };
      component.onGlobalKeydown(event);

      expect(palette.toggle).toHaveBeenCalledTimes(1);
    });

    it('leaves other key combinations alone', async () => {
      await build();
      const palette = { openPalette: jest.fn(), toggle: jest.fn(), open: jest.fn().mockReturnValue(false) };
      (component as any).palette = () => palette;

      for (const event of [
        { key: 'b', metaKey: true, ctrlKey: false },
        { key: 'k', metaKey: false, ctrlKey: false }
      ] as any[]) {
        component.onGlobalKeydown({ ...event, target: document.body, preventDefault: jest.fn() });
      }

      expect(palette.toggle).not.toHaveBeenCalled();
    });
  });

  // NOTIF-T-6 rework: the routed `.../requests` destination was retired along with
  // `notificationsRouting`'s `requests`/`updates` children — this now targets the merged view.
  it('goToNotifications navigates to the merged results-notifications view', async () => {
    await build();
    component.goToNotifications();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/result/results-outlet/results-notifications']);
  });

  it('quick/bell-popover-hidden: by default the bell goes to the inbox and opens no popover', async () => {
    await build();
    expect(component.bellPopoverEnabled).toBe(false);
    component.onNotificationsClick();
    expect(component.notificationsOpen()).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/result/results-outlet/results-notifications']);
  });

  // BELL-DD-5 (reversion): closing the popover no longer consumes the bell. The old contract
  // ("handleClosePopUp clears updatesPopUpData and PATCHes last-viewed once") is retired - the
  // method is gone, and neither open nor close may touch the list or the last-viewed PATCH.
  it('BELL-DD-5: has no clear-on-close hook, and closing leaves the bell data alone', async () => {
    notificationsMock.updatesPopUpData = [{ id: 1 }];
    bellRows.set([{ kind: 'update', notification_id: 1 }]);
    await build();
    expect((component as any).handleClosePopUp).toBeUndefined();

    component.toggleNotifications();
    component.toggleNotifications();

    expect(notificationsMock.updatesPopUpData).toEqual([{ id: 1 }]);
    expect(bellRows()).toHaveLength(1);
    expect(notificationsMock.handlePopUpNotificationLastViewed).not.toHaveBeenCalled();
    expect(apiMock.resultsSE.PATCH_handlePopUpViewed).not.toHaveBeenCalled();
  });

  it('escape closes both popovers', async () => {
    await build();
    component.userMenuOpen.set(true);
    component.notificationsOpen.set(true);
    component.onEscape();
    expect(component.userMenuOpen()).toBe(false);
    expect(component.notificationsOpen()).toBe(false);
  });

  // ------------------------------------------------------- SPEC:changes/sidebar-toggle-consolidation
  // STC-R-1 / STC-AC-1 — the sidebar collapse/expand control moved entirely into
  // `reporting-nav-sidebar` (STC-DD-1): the topbar no longer owns, nor renders, any collapse
  // control, and `[data-guide="sidebar-toggle"]` — the anchor `ReportingGuideService`'s
  // discoverability hint targets — must resolve to ZERO elements here. Exactly one match still
  // exists app-wide, but it now lives solely on whichever of the sidebar's own two buttons
  // (`reporting-nav-sidebar.component.spec.ts`) is currently rendered.
  //
  // Same reason as `reporting-nav-sidebar.component.spec.ts`: every test above builds this fixture
  // with its template overridden to `''`, so a `TestBed`-rendered DOM assertion isn't available
  // here either. Parsing the actual `.html` file as markup proves the hook (and the control it sat
  // on) is genuinely absent from the authored template, without touching that unrelated override.
  describe('sidebar toggle data-guide hook removed from the topbar (STC-R-1/STC-AC-1)', () => {
    const readTemplateDoc = (): Document => {
      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');
      return new DOMParser().parseFromString(html, 'text/html');
    };

    it('resolves [data-guide="sidebar-toggle"] to ZERO elements — no collapse control lives here any more', () => {
      const doc = readTemplateDoc();
      const hooks = doc.querySelectorAll('[data-guide="sidebar-toggle"]');
      expect(hooks.length).toBe(0);

      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');
      expect(html).not.toContain('toggleSidebar()');
      expect(html).not.toContain('aria-label="Toggle sidebar"');
    });
  });

  // ------------------------------------------------- bug report hidden in production
  // An in-app bug report filed from production goes straight into the team's Jira board and
  // counts against the SLA, so the entry point only exists in test environments. Two halves
  // are asserted separately, because either one alone would put the button back in prod:
  // the flag has to come off `environment.production`, and the template has to gate on it.
  describe('report-a-bug entry point is test-only', () => {
    const originalProduction = environment.production;

    afterEach(() => {
      environment.production = originalProduction;
    });

    it('isProduction mirrors environment.production — both ways round', async () => {
      environment.production = true;
      await build();
      expect(component.isProduction).toBe(true);

      TestBed.resetTestingModule();
      environment.production = false;
      await build();
      expect(component.isProduction).toBe(false);
    });

    it('wraps the bug button and its dialog in @if (!isProduction) — and nothing else', () => {
      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');

      // Every `@if (!isProduction) {` block in the template, resolved to its own text by
      // walking braces, so "inside the guard" is measured and not assumed.
      const guarded: string[] = [];
      const marker = '@if (!isProduction) {';
      for (let at = html.indexOf(marker); at !== -1; at = html.indexOf(marker, at + 1)) {
        let depth = 0;
        let end = at + marker.length - 1;
        for (let i = at + marker.length - 1; i < html.length; i++) {
          if (html[i] === '{') depth++;
          if (html[i] === '}' && --depth === 0) {
            end = i;
            break;
          }
        }
        guarded.push(html.slice(at, end + 1));
      }

      expect(guarded.length).toBe(2);
      const insideGuards = guarded.join('\n');

      // Since P2-3683 the entry point is the "Give feedback" item of the Support menu, not a
      // standalone bug button — the guard has to sit on THAT, or production gets it back.
      expect(insideGuards).toContain('Give feedback');
      expect(insideGuards).toContain('openFeedbackFromSupport()');
      expect(insideGuards).toContain('<app-report-feedback-dialog');

      // Control: the brace walk must NOT swallow the whole template. If it did, the three
      // assertions above would pass no matter where the button actually sits.
      expect(insideGuards).not.toContain('aria-label="Notifications"');
      expect(insideGuards).not.toContain('<app-global-search-palette');

      // The chat and contact us link are NOT gated — they are supported routes in production.
      expect(insideGuards).not.toContain('openSupportChat()');
      expect(insideGuards).not.toContain('mailto:prmstechsupport@cgiar.org');
    });
  });

  // ------------------------------------------------------------------ support menu (P2-3683)
  describe('Support menu', () => {
    it('openSupportChat closes the menu when the chat actually opened', async () => {
      await build();
      const chat = TestBed.inject(SupportChatService);
      const open = jest.spyOn(chat, 'open').mockReturnValue(true);

      component.supportMenuOpen.set(true);
      component.openSupportChat();

      expect(open).toHaveBeenCalled();
      expect(component.supportMenuOpen()).toBe(false);
    });

    it('KEEPS the menu open when the widget is not on the page', async () => {
      await build();
      const chat = TestBed.inject(SupportChatService);
      jest.spyOn(chat, 'open').mockReturnValue(false);

      component.supportMenuOpen.set(true);
      component.openSupportChat();

      // Closing on a click that opened nothing reads as "it broke silently".
      expect(component.supportMenuOpen()).toBe(true);
    });

    it('openFeedbackFromSupport closes the menu and opens the report dialog', async () => {
      await build();
      component.supportMenuOpen.set(true);

      component.openFeedbackFromSupport();

      expect(component.supportMenuOpen()).toBe(false);
      expect(component.reportFeedbackOpen()).toBe(true);
    });

    it('offers a Contact us mailto link to prmstechsupport@cgiar.org', () => {
      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');
      expect(html).toContain('mailto:prmstechsupport@cgiar.org');
      expect(html).toContain('Contact us');
      expect(html).toContain('lucideMail');
    });

    it('escape closes the support menu too', async () => {
      await build();
      component.supportMenuOpen.set(true);

      component.onEscape();

      expect(component.supportMenuOpen()).toBe(false);
    });

    it('the standalone bug button is gone — Support is the only way in', () => {
      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');

      expect(html).not.toContain('aria-label="Report a bug or adjustment"');
      expect(html).not.toContain('lucideBug');
      // Control for the two assertions above: the entry point still exists, just moved — into the
      // menu that P2-3682 renamed from Support to Help.
      expect(html).toContain('openFeedbackFromSupport()');
      expect(html).toContain('aria-label="Help"');
    });
  });

  // ------------------------------------------------------------------ P2-3682
  // Glossary, Tour and Text size moved out of the sidebar's EXTRAS block. Two of them are help,
  // so they land under Support; Text size is a per-user preference, so it lands under Settings in
  // the account menu — which is where the design puts it.
  describe('controls moved from the sidebar (P2-3682)', () => {
    it('the help menu offers the CLARISA glossary as an external link', () => {
      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');
      const support = html.slice(html.indexOf('aria-label="Help"'), html.indexOf('<!-- Notifications popover'));

      expect(support).toContain('[href]="clarisaGlossaryUrl"');
      expect(support).toContain('target="_blank"');
      expect(support).toContain('rel="noopener noreferrer"');
      expect(support).toContain('<span>Glossary</span>');
    });

    it('exposes clarisaGlossaryUrl from the shared CLARISA constant', async () => {
      await build();
      expect(component.clarisaGlossaryUrl).toBe(CLARISA_GLOSSARY_URL);
    });

    it('the menu is labelled Help, and groups reaching a person apart from doing it yourself', () => {
      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');
      const menu = html.slice(html.indexOf('role="menu" aria-label="Help"'), html.indexOf('<!-- Notifications popover'));

      expect(html).toContain('<span>Help</span>');
      expect(html).not.toContain('<span>Support</span>');
      expect(menu.indexOf('>Get help<')).toBeGreaterThan(-1);
      expect(menu.indexOf('>Learn<')).toBeGreaterThan(menu.indexOf('>Get help<'));
      // Order: the two ways of reaching a person first, then the two you use on your own.
      expect(menu.indexOf('<span>Glossary</span>')).toBeGreaterThan(menu.indexOf('>Learn<'));
      expect(menu.indexOf('<span>Start a support chat</span>')).toBeLessThan(menu.indexOf('>Learn<'));
    });

    it('Tour forwards the programme and centre context, and closes the help menu', async () => {
      homeMock.mySPsList.set([{ initiativeId: 1, initiativeCode: 'SP01' }]);
      homeMock.otherSPsList.set([{ initiativeId: 2, initiativeCode: 'SP02' }]);
      await build();
      component.supportMenuOpen.set(true);

      component.startPlatformSidebarTour();

      expect(reportingGuideMock.startSidebarTour).toHaveBeenCalledWith({
        hasMyPrograms: true,
        hasOtherPrograms: true,
        hasCenters: true
      });
      expect(component.supportMenuOpen()).toBe(false);
    });

    it('Tour reports empty programme lists as empty, not as missing', async () => {
      apiMock.rolesSE.getMyCenters.mockReturnValue([]);
      await build();

      component.startPlatformSidebarTour();

      expect(reportingGuideMock.startSidebarTour).toHaveBeenCalledWith({
        hasMyPrograms: false,
        hasOtherPrograms: false,
        hasCenters: false
      });
    });

    it('text size sits inside the profile panel, visible the moment it opens', () => {
      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');
      const from = html.indexOf('aria-label="Account menu"');
      const to = html.indexOf('pr-topbar-logout');
      expect(from).toBeGreaterThan(-1);
      expect(to).toBeGreaterThan(from);
      const panel = html.slice(from, to);

      expect(panel).toContain('role="radiogroup"');
      expect(panel).toContain('(click)="selectFontScale(option.value)"');
      // Neither of the two places it was tried first: not behind a Settings entry (nobody finds it
      // there), and not a separate topbar button either. Written up on P2-3682.
      expect(html).not.toContain('<span>Settings</span>');
      expect(html).not.toContain('#fontTrigger="cdkOverlayOrigin"');
      expect((component as unknown as Record<string, unknown>).openSettings).toBeUndefined();
    });

    it('drops the repeated CENTER- prefix without losing the id', async () => {
      await build();
      expect(component.shortCode('CENTER-06')).toBe('06');
      expect(component.shortCode('center_02')).toBe('02');
      // A code that is not a centre is left exactly as it is, and so is an empty one.
      expect(component.shortCode('SGP-02')).toBe('SGP-02');
      expect(component.shortCode(null)).toBe('');
      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');
      expect(html).toContain('[title]="item.center_id"');
    });

    it('picking a size delegates to the font scale service', async () => {
      await build();
      component.selectFontScale('large');
      expect(fontScaleMock.set).toHaveBeenCalledWith('large');
    });

    it('offers Reset only when a non-default size is active, and sits after the information', () => {
      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');
      const from = html.indexOf('pr-topbar-account__group--text');
      const logout = html.indexOf('pr-topbar-logout');
      expect(from).toBeGreaterThan(-1);
      expect(logout).toBeGreaterThan(from);
      const group = html.slice(from, logout);

      expect(group).toContain("@if (fontScaleSE.scale() !== 'default')");
      expect(group).toContain('(click)="fontScaleSE.reset()"');
      // You open this panel to see who you are signed in as; the control comes after that, not
      // between the name and the programmes.
      expect(from).toBeGreaterThan(html.indexOf('getMyCenters()'));
      expect(from).toBeGreaterThan(html.indexOf('pr-topbar-account__id'));
    });
  });

  // ------------------------------------------------------------------ P2-3682
  // Yeck, looking at the first pass: the right-hand controls and the account menu were "un enredo
  // ... no se sabe dónde está cada cosa". Both were regrouped; these lock the grouping in.
  describe('the shell chrome is grouped (P2-3682)', () => {
    const html = () => readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');

    it('separates the labelled action, the icon actions and the identity', () => {
      const right = html();
      const from = right.indexOf('class="pr-topbar-right"');
      const to = right.indexOf('</header>');
      // The slice has to be a real one, or the counts below would be measuring the whole file.
      expect(from).toBeGreaterThan(-1);
      expect(to).toBeGreaterThan(from);
      const cluster = right.slice(from, to);

      // No divider lines between Help, Release notes, the bell and the user menu (quick/topbar-remove-sep).
      expect((cluster.match(/pr-topbar-sep/g) || []).length).toBe(0);
      expect(cluster.indexOf('pr-topbar-actions')).toBeGreaterThan(cluster.indexOf('aria-label="Help"'));
      expect(cluster.indexOf('class="pr-topbar-user"')).toBeGreaterThan(cluster.indexOf('pr-topbar-actions'));
    });

    it('the account menu groups instead of ruling off every row', () => {
      const account = html();
      const from = account.indexOf('aria-label="Account menu"');
      const to = account.indexOf('pr-topbar-logout');
      expect(from).toBeGreaterThan(-1);
      expect(to).toBeGreaterThan(from);
      const panel = account.slice(from, to);

      expect(panel).toContain('pr-topbar-account__id');
      expect(panel).toContain('pr-topbar-account__group');
      expect(panel).toContain('pr-topbar-account__code');
      // The old per-row rules came from these two classes; they are gone.
      expect(panel).not.toContain('pr-topbar-assignment');
      expect(panel).not.toContain('pr-topbar-user-card');
      // The role badge is no longer pinned beside the name, where it ate the name's width.
      expect(panel).toContain('pr-topbar-account__role');
    });
  });

  // ------------------------------------------------------------- TRN-T-1
  it('places Release notes before the notifications bell in DOM order (TRN-AC-1)', () => {
    const right = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');
    const releaseNotesIndex = right.indexOf('aria-label="Release notes"');
    // The bell button's label is bound now (BELL-R-1: it carries the count), so anchor on its origin.
    const notificationsIndex = right.indexOf('#notifTrigger');

    expect(releaseNotesIndex).toBeGreaterThan(-1);
    expect(notificationsIndex).toBeGreaterThan(-1);
    expect(releaseNotesIndex).toBeLessThan(notificationsIndex);
  });

  // ------------------------------------------------------------- BELL-T-4 (rendered popover)
  describe('bell popover (BELL-T-4)', () => {
    const copy = BELL_QUICK_INBOX_COPY;

    @Component({
      selector: 'app-pop-up-notification-item',
      standalone: true,
      template: `<span class="row-kind">{{ notification?.kind }}</span>
        <button type="button" class="row-accept" (click)="handoff.emit({ row: notification, action: 'accept' })">Accept</button>
        <a href="#" class="row-link" (click)="itemSelected.emit()">open</a>`
    })
    class RowStub {
      @Input() notification: any;
      @Output() itemSelected = new EventEmitter<void>();
      @Output() handoff = new EventEmitter<{ row: any; action: string }>();
    }

    const rows = (n: number, kind = 'update') =>
      Array.from({ length: n }, (_, i) => ({
        kind,
        notification_id: kind === 'update' ? i + 1 : undefined,
        share_result_request_id: kind === 'decision' ? i + 1 : undefined
      }));

    const buildRendered = async () => {
      await TestBed.configureTestingModule({
        imports: [ShellTopbarComponent],
        providers: [
          { provide: ApiService, useValue: apiMock },
          { provide: DataControlService, useValue: dataControlMock },
          { provide: Router, useValue: routerMock },
          { provide: ResultsNotificationsService, useValue: notificationsMock },
          { provide: ResultsListFilterService, useValue: filterMock },
          { provide: FontScaleService, useValue: fontScaleMock },
          { provide: ReportingGuideService, useValue: reportingGuideMock },
          { provide: ResultFrameworkReportingHomeService, useValue: homeMock }
        ]
      })
        .overrideComponent(ShellTopbarComponent, {
          set: { imports: [CommonModule, FormsModule, OverlayModule, A11yModule, RowStub], schemas: [NO_ERRORS_SCHEMA] }
        })
        .compileComponents();
      fixture = TestBed.createComponent(ShellTopbarComponent);
      component = fixture.componentInstance;
      // quick/bell-popover-hidden: the popover is off by default but kept; these specs keep covering it.
      component.bellPopoverEnabled = true;
      fixture.detectChanges();
    };

    const bellButton = () => fixture.nativeElement.querySelector('button[aria-label^="Notifications"]') as HTMLButtonElement;
    const badge = () => fixture.nativeElement.querySelector('.pr-topbar-badge') as HTMLElement | null;
    const panel = () => document.body.querySelector('.pr-topbar-panel--notif') as HTMLElement | null;
    const rowEls = () => Array.from(document.body.querySelectorAll('app-pop-up-notification-item'));
    const flush = () => fixture.detectChanges();
    const openBell = () => {
      bellButton().click();
      flush();
    };
    const closeByBackdrop = () => {
      (document.body.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
      flush();
    };

    afterEach(() => {
      fixture?.destroy();
      document.body.querySelectorAll('.cdk-overlay-container').forEach(el => (el.innerHTML = ''));
    });

    it('BELL-R-2: open -> close -> open keeps the badge text AND the row count (and never PATCHes last-viewed)', async () => {
      bellRows.set([...rows(3, 'decision'), ...rows(2)]);
      await buildRendered();
      flush();

      expect(badge()?.textContent?.trim()).toBe('5');
      openBell();
      expect(rowEls()).toHaveLength(5);

      closeByBackdrop();
      expect(panel()).toBeNull();
      expect(badge()?.textContent?.trim()).toBe('5');

      openBell();
      expect(rowEls()).toHaveLength(5);
      expect(badge()?.textContent?.trim()).toBe('5');

      // Esc closes too, and consumes nothing either.
      component.onEscape();
      flush();
      expect(panel()).toBeNull();
      expect(bellRows()).toHaveLength(5);
      expect(apiMock.resultsSE.PATCH_handlePopUpViewed).toHaveBeenCalledTimes(0);
      expect(notificationsMock.handlePopUpNotificationLastViewed).toHaveBeenCalledTimes(0);
    });

    it('BELL-R-3 / R-1: 140 items -> badge 99+, exactly 10 rows and a "+130 more" link', async () => {
      bellRows.set(rows(140));
      await buildRendered();
      flush();
      openBell();

      expect(badge()?.textContent?.trim()).toBe('99+');
      expect(rowEls()).toHaveLength(10);
      const more = document.body.querySelector('[data-bell-more]') as HTMLElement;
      expect(more.textContent?.trim()).toBe('+130 more');

      more.click();
      flush();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/result/results-outlet/results-notifications']);
      expect(panel()).toBeNull();
    });

    // @akili-spec notifications/admin-pending-paging — PPG-T-4 test 2 (topbar half): the numbers come from
    // the server counts while the service only holds a bounded 30 rows.
    it('PPG-R-2 admin: counts {1000, 1150, 6514} + 10 rows per group -> 99+, Decide 1150, All and "+N more" from the counts', async () => {
      bellCountsOverride.set({ unseenRequests: 1000, pendingRequests: 1150, unreadUpdates: 6514 });
      bellRows.set([...rows(10, 'decision'), ...rows(10)]);
      await buildRendered();
      flush();
      openBell();

      expect(component.bellCount()).toBe(7514);
      expect(badge()?.textContent?.trim()).toBe('99+');
      expect(component.bellDecisionCount()).toBe(1150);
      expect(component.bellUpdatesCount()).toBe(6514);
      expect(component.bellAllCount()).toBe(1150 + 6514);
      expect(rowEls()).toHaveLength(10);
      expect(component.bellOverflow()).toBe(1150 + 6514 - 10);
    });

    it('shows no "+N more" at or below the cap', async () => {
      bellRows.set(rows(10));
      await buildRendered();
      flush();
      openBell();
      expect(rowEls()).toHaveLength(10);
      expect(document.body.querySelector('[data-bell-more]')).toBeNull();
    });

    it('BELL-R-10: count 0 -> no badge element and the empty copy', async () => {
      await buildRendered();
      flush();
      expect(badge()).toBeNull();
      openBell();
      expect(panel()?.textContent).toContain(copy.popover.empty);
      expect(rowEls()).toHaveLength(0);
    });

    it('BELL-R-13: loading with no data shows the loading copy and NOT the empty copy', async () => {
      notificationsMock.bellLoading.set(true);
      await buildRendered();
      flush();
      openBell();
      expect(panel()?.textContent).toContain(copy.popover.loading);
      expect(panel()?.textContent).not.toContain(copy.popover.empty);

      // Once data arrives the list replaces it, even while a refresh is still in flight.
      bellRows.set(rows(2));
      flush();
      expect(panel()?.textContent).not.toContain(copy.popover.loading);
      expect(rowEls()).toHaveLength(2);
    });

    it('BELL-R-14: error with nothing cached shows the error line with a link to the inbox', async () => {
      notificationsMock.bellError.set(true);
      await buildRendered();
      flush();
      openBell();
      expect(panel()?.textContent).toContain(copy.popover.error);
      expect(panel()?.textContent).not.toContain(copy.popover.empty);

      (document.body.querySelector('[data-bell-error] .pr-topbar-link') as HTMLElement).click();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/result/results-outlet/results-notifications']);
    });

    it('BELL-R-14: error with cached rows keeps the rows, the badge value and shows the error line', async () => {
      bellRows.set(rows(4));
      notificationsMock.bellError.set(true);
      await buildRendered();
      flush();
      expect(badge()?.textContent?.trim()).toBe('4');
      openBell();
      expect(rowEls()).toHaveLength(4);
      expect(document.body.querySelector('[data-bell-error]')).not.toBeNull();
    });

    it('BELL-R-4: opening calls refreshBell exactly once (not awaited); closing does not', async () => {
      await buildRendered();
      flush();
      expect(notificationsMock.refreshBell).not.toHaveBeenCalled();
      openBell();
      expect(notificationsMock.refreshBell).toHaveBeenCalledTimes(1);
      closeByBackdrop();
      expect(notificationsMock.refreshBell).toHaveBeenCalledTimes(1);
    });

    it('BRS-R-8: opening also calls loadBellReadUpdates exactly once; closing does not', async () => {
      await buildRendered();
      flush();
      expect(notificationsMock.loadBellReadUpdates).not.toHaveBeenCalled();
      openBell();
      expect(notificationsMock.loadBellReadUpdates).toHaveBeenCalledTimes(1);
      closeByBackdrop();
      expect(notificationsMock.loadBellReadUpdates).toHaveBeenCalledTimes(1);
    });

    it('BELL-R-1: the button label carries the count', async () => {
      bellRows.set(rows(5));
      await buildRendered();
      flush();
      expect(bellButton().getAttribute('aria-label')).toBe('Notifications, 5 waiting');
      bellRows.set([]);
      flush();
      expect(bellButton().getAttribute('aria-label')).toBe('Notifications');
    });

    it('a handoff event closes the popover and navigates to the inbox with request= and action=', async () => {
      const decision = { kind: 'decision', share_result_request_id: 77, obj_result: { obj_version: { id: 9 } } };
      bellRows.set([decision]);
      await buildRendered();
      flush();
      openBell();

      (document.body.querySelector('.row-accept') as HTMLElement).click();
      flush();

      expect(panel()).toBeNull();
      expect(routerMock.navigateByUrl).toHaveBeenCalledTimes(1);
      const url = routerMock.navigateByUrl.mock.calls[0][0] as string;
      expect(url).toContain('request=77');
      expect(url).toContain('action=accept');
      expect(url).toContain('phase=9');
    });

    it('clicking an update row link closes the popover without consuming the bell (the row marks itself read)', async () => {
      bellRows.set(rows(2));
      await buildRendered();
      flush();
      openBell();
      (document.body.querySelector('.row-link') as HTMLElement).click();
      flush();
      expect(panel()).toBeNull();
      expect(bellRows()).toHaveLength(2);
      expect(notificationsMock.handlePopUpNotificationLastViewed).not.toHaveBeenCalled();
    });

    it('NFR focus: after a decision removes the focused row, focus moves to the next row, then the panel', async () => {
      bellRows.set(rows(3, 'decision'));
      await buildRendered();
      flush();
      openBell();

      const buttons = () => Array.from(document.body.querySelectorAll('.row-accept')) as HTMLButtonElement[];
      buttons()[0].focus();
      expect(document.activeElement).toBe(buttons()[0]);

      // The decided row leaves the bell and takes the focused button with it.
      bellRows.set(rows(3, 'decision').slice(1));
      flush();
      expect(document.activeElement).toBe(buttons()[0]);
      expect(panel()?.contains(document.activeElement)).toBe(true);

      // Last row decided: the empty state has nothing focusable, so the panel itself keeps focus.
      bellRows.set([]);
      flush();
      expect(document.activeElement).toBe(panel());
    });

    // ----------------------------------------------------------- BELL-T-10 (tabs, chip, mark as read)
    describe('BELL-T-10: tabs, "N new" chip and "Mark as read"', () => {
      const tab = (key: string) => document.body.querySelector(`[data-bell-tab="${key}"]`) as HTMLElement;
      const kinds = () => rowEls().map(el => el.querySelector('.row-kind')?.textContent?.trim());
      const newChip = () => document.body.querySelector('[data-bell-new]') as HTMLElement | null;
      const markRead = () => document.body.querySelector('[data-bell-mark-read]') as HTMLButtonElement | null;
      const mixed = () => [...rows(2, 'decision'), ...rows(3)];

      it('"Decide" shows only decision rows, "Updates" only updates, "All" both - and the badge never moves', async () => {
        bellRows.set(mixed());
        await buildRendered();
        flush();
        openBell();
        expect(kinds()).toEqual(['decision', 'decision', 'update', 'update', 'update']);

        tab('decide').click();
        flush();
        expect(kinds()).toEqual(['decision', 'decision']);
        expect(badge()?.textContent?.trim()).toBe('5');

        tab('updates').click();
        flush();
        expect(kinds()).toEqual(['update', 'update', 'update']);
        expect(badge()?.textContent?.trim()).toBe('5');

        tab('all').click();
        flush();
        expect(rowEls()).toHaveLength(5);
        expect(badge()?.textContent?.trim()).toBe('5');
        expect(component.bellCount()).toBe(5);
      });

      it('BRS-R-6: All = listed rows, Decide = "N to decide" (hidden at 0), Updates = unread updates (hidden at 0)', async () => {
        bellRows.set([...mixed(), { kind: 'update', notification_id: 99, fresh: false }]);
        await buildRendered();
        flush();
        openBell();
        expect(tab('all').textContent).toContain('6');
        expect(tab('decide').textContent).toContain(copy.popover.decideCount(2));
        expect(tab('decide').querySelector('[data-bell-decide-count]')?.className).toContain('--pr-color-orange-500');
        expect(tab('updates').textContent?.replace(/\s+/g, ' ').trim()).toBe(`${copy.popover.tabs.updates} 3`);

        bellRows.set(rows(3));
        flush();
        expect(tab('decide').querySelector('[data-bell-decide-count]')).toBeNull();
        expect(tab('decide').textContent?.trim()).toBe(copy.popover.tabs.decide);

        bellRows.set([{ kind: 'update', notification_id: 1, fresh: false }, ...rows(2, 'decision').map(r => ({ ...r, fresh: false }))]);
        flush();
        expect(tab('updates').querySelector('[data-bell-tab-count]')).toBeNull();
        expect(tab('decide').textContent).toContain(copy.popover.decideCount(2));
      });

      it('BRS-R-6 (a11y): every count sits inside its tab button, so it is part of the accessible name', async () => {
        bellRows.set(mixed());
        await buildRendered();
        flush();
        openBell();
        for (const key of ['all', 'decide', 'updates']) {
          const counts = tab(key).querySelectorAll('[data-bell-tab-count]');
          expect(counts.length).toBe(1);
          expect(counts[0].closest('[aria-hidden="true"]')).toBeNull();
          expect(tab(key).tagName).toBe('BUTTON');
        }
      });

      it('BRS-R-1: badge 0 with 40 pending requests -> no badge, but Decide still shows "40 to decide"', async () => {
        bellRows.set(rows(40, 'decision').map(r => ({ ...r, fresh: false })));
        await buildRendered();
        flush();
        expect(badge()).toBeNull();
        openBell();
        expect(newChip()).toBeNull();
        expect(markRead()).toBeNull();
        expect(tab('decide').textContent).toContain(copy.popover.decideCount(40));
      });

      it('BRS-R-1: 120 fresh items -> badge reads 99+', async () => {
        bellRows.set(rows(120));
        await buildRendered();
        flush();
        expect(badge()?.textContent?.trim()).toBe('99+');
      });

      it('BRS-R-4: after Mark as read resolves with a count of 0, badge, chip and button go and Decide is unchanged', async () => {
        bellRows.set(mixed());
        notificationsMock.markAllBellRead.mockImplementation(async () => {
          bellRows.update(list => list.map(row => ({ ...row, fresh: false })));
        });
        await buildRendered();
        flush();
        openBell();
        expect(tab('decide').textContent).toContain(copy.popover.decideCount(2));
        markRead()!.click();
        await Promise.resolve();
        await Promise.resolve();
        flush();
        expect(badge()).toBeNull();
        expect(newChip()).toBeNull();
        expect(markRead()).toBeNull();
        expect(tab('decide').textContent).toContain(copy.popover.decideCount(2));
        expect(rowEls()).toHaveLength(5);
      });

      it('BRS-R-8: the "Earlier" separator renders once, before the first non-fresh row', async () => {
        bellRows.set([
          { kind: 'update', notification_id: 1, fresh: true },
          { kind: 'update', notification_id: 2, fresh: true },
          { kind: 'update', notification_id: 3, fresh: false },
          { kind: 'update', notification_id: 4, fresh: false }
        ]);
        await buildRendered();
        flush();
        openBell();
        const seps = document.body.querySelectorAll('[data-bell-earlier]');
        expect(seps).toHaveLength(1);
        expect(seps[0].textContent?.trim()).toBe(copy.popover.earlier);
        const list = document.body.querySelector('.pr-topbar-notif-list') as HTMLElement;
        const order = Array.from(list.children).map(el => (el.hasAttribute('data-bell-earlier') ? 'sep' : 'row'));
        expect(order).toEqual(['row', 'row', 'sep', 'row', 'row']);
      });

      it('BRS-R-8: no separator when every row is fresh, or when every row is read (light rows, no empty state)', async () => {
        bellRows.set(rows(3));
        await buildRendered();
        flush();
        openBell();
        expect(document.body.querySelector('[data-bell-earlier]')).toBeNull();

        bellRows.set(rows(3).map(r => ({ ...r, fresh: false })));
        flush();
        expect(document.body.querySelector('[data-bell-earlier]')).toBeNull();
        expect(rowEls()).toHaveLength(3);
        expect(panel()?.textContent).not.toContain(copy.popover.empty);
        expect(badge()).toBeNull();
      });

      it('BRS-R-8: the separator follows the active tab (Decide tab with only seen requests shows none)', async () => {
        bellRows.set([
          { kind: 'update', notification_id: 1, fresh: true },
          { kind: 'decision', share_result_request_id: 1, fresh: false },
          { kind: 'update', notification_id: 2, fresh: false }
        ]);
        await buildRendered();
        flush();
        openBell();
        expect(document.body.querySelectorAll('[data-bell-earlier]')).toHaveLength(1);
        tab('decide').click();
        flush();
        expect(document.body.querySelector('[data-bell-earlier]')).toBeNull();
        tab('updates').click();
        flush();
        expect(document.body.querySelectorAll('[data-bell-earlier]')).toHaveLength(1);
      });

      it('the cap and "+N more" apply to the ACTIVE tab', async () => {
        bellRows.set([...rows(1, 'decision'), ...rows(12)]);
        await buildRendered();
        flush();
        openBell();
        expect(rowEls()).toHaveLength(10);
        expect(document.body.querySelector('[data-bell-more]')?.textContent?.trim()).toBe('+3 more');

        tab('updates').click();
        flush();
        expect(rowEls()).toHaveLength(10);
        expect(document.body.querySelector('[data-bell-more]')?.textContent?.trim()).toBe('+2 more');

        tab('decide').click();
        flush();
        expect(rowEls()).toHaveLength(1);
        expect(document.body.querySelector('[data-bell-more]')).toBeNull();
      });

      it('shows a per-tab empty state when the bell has rows but none for that tab', async () => {
        bellRows.set(rows(2));
        await buildRendered();
        flush();
        openBell();
        tab('decide').click();
        flush();
        expect(rowEls()).toHaveLength(0);
        expect(panel()?.textContent).toContain(copy.popover.tabEmpty.decide);
        expect(panel()?.textContent).not.toContain(copy.popover.empty);

        bellRows.set(rows(2, 'decision'));
        tab('updates').click();
        flush();
        expect(panel()?.textContent).toContain(copy.popover.tabEmpty.updates);
      });

      it('"N new" = the bell badge count (decisions included), and the chip is hidden at 0', async () => {
        bellRows.set(mixed());
        await buildRendered();
        flush();
        openBell();
        expect(newChip()?.textContent?.trim()).toBe(copy.popover.newChip(5));

        bellRows.set(rows(2, 'decision').map(r => ({ ...r, fresh: false })));
        flush();
        expect(newChip()).toBeNull();
      });

      it('"Mark as read" is visible while the badge is above 0 (even for requests only) and hidden at 0', async () => {
        bellRows.set(rows(2, 'decision'));
        await buildRendered();
        flush();
        openBell();
        expect(markRead()).not.toBeNull();

        bellRows.set(rows(2, 'decision').map(r => ({ ...r, fresh: false })));
        flush();
        expect(markRead()).toBeNull();
      });

      it('"Mark as read" calls the bell mark-all wrapper once (no args), guards a double click, and decides nothing', async () => {
        let resolve!: () => void;
        notificationsMock.markAllBellRead.mockReturnValue(new Promise<void>(r => (resolve = r)));
        notificationsMock.decideRequest = jest.fn();
        bellRows.set(mixed());
        await buildRendered();
        flush();
        openBell();

        markRead()!.click();
        markRead()!.click();
        flush();
        expect(notificationsMock.markAllBellRead).toHaveBeenCalledTimes(1);
        expect(notificationsMock.markAllBellRead.mock.calls[0]).toHaveLength(0);
        expect(markRead()!.disabled).toBe(true);
        expect(notificationsMock.decideRequest).not.toHaveBeenCalled();
        expect(panel()).not.toBeNull();

        resolve();
        await Promise.resolve();
        await Promise.resolve();
        flush();
        expect(markRead()!.disabled).toBe(false);
      });

      it('a failed "Mark as read" leaves the rows in place and re-enables the control', async () => {
        notificationsMock.markAllBellRead.mockRejectedValue(new Error('boom'));
        bellRows.set(mixed());
        await buildRendered();
        flush();
        openBell();
        markRead()!.click();
        await Promise.resolve();
        await Promise.resolve();
        flush();
        expect(rowEls()).toHaveLength(5);
        expect(markRead()!.disabled).toBe(false);
      });
    });
  });

  // ------------------------------------------------------------- BELL-T-8 (fits the viewport)
  describe('bell popover fits the viewport (BELL-T-8)', () => {
    const buildRendered = async () => {
      await TestBed.configureTestingModule({
        imports: [ShellTopbarComponent],
        providers: [
          { provide: ApiService, useValue: apiMock },
          { provide: DataControlService, useValue: dataControlMock },
          { provide: Router, useValue: routerMock },
          { provide: ResultsNotificationsService, useValue: notificationsMock },
          { provide: ResultsListFilterService, useValue: filterMock },
          { provide: FontScaleService, useValue: fontScaleMock },
          { provide: ReportingGuideService, useValue: reportingGuideMock },
          { provide: ResultFrameworkReportingHomeService, useValue: homeMock }
        ]
      })
        .overrideComponent(ShellTopbarComponent, {
          set: { imports: [CommonModule, FormsModule, OverlayModule, A11yModule], schemas: [NO_ERRORS_SCHEMA] }
        })
        .compileComponents();
      fixture = TestBed.createComponent(ShellTopbarComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('keeps the end-aligned desktop position first and adds a start-aligned fallback', async () => {
      await buildRendered();
      const positions = component.notificationsPositions;
      expect(positions[0]).toMatchObject({ originX: 'end', overlayX: 'end', originY: 'bottom', overlayY: 'top', offsetY: 8 });
      expect(positions.length).toBeGreaterThan(1);
      expect(positions.some((p) => p.originX === 'start' && p.overlayX === 'start')).toBe(true);
    });

    it('asks the overlay for a viewport margin of at least 16px', async () => {
      await buildRendered();
      expect(component.notificationsViewportMargin).toBeGreaterThanOrEqual(16);
    });

    it('wires viewport margin and push on the bell overlay directive', async () => {
      await buildRendered();
      const overlays = fixture.debugElement.queryAllNodes(By.directive(CdkConnectedOverlay)).map((d) => d.injector.get(CdkConnectedOverlay));
      const bell = overlays.find((o) => o.positions === component.notificationsPositions);
      expect(bell).toBeDefined();
      expect(bell!.viewportMargin).toBeGreaterThanOrEqual(16);
      expect(bell!.push).toBe(true);
    });

    it('sizes the panel in its own zoomed px: no zoom, 400x472 frame, bell bottom at 184', () => {
      const b = ShellTopbarComponent.notificationsBounds({ width: 400, height: 472 }, 184, 1);
      expect(b.width).toBe(360);
      expect(b.maxHeight).toBe(472 - 184 - 8 - 16);
    });

    it('divides the device-px budget by the app zoom (1.15) so the rendered pane stays inside the viewport', () => {
      const zoom = 1.15;
      const b = ShellTopbarComponent.notificationsBounds({ width: 400, height: 472 }, 184, zoom);
      expect(b.width).toBeCloseTo((400 - 32) / zoom, 5);
      // Rendered width = css width * zoom = 368 device px, so 16px of margin remains on each side.
      expect(b.width * zoom).toBeCloseTo(368, 5);
      expect(b.maxHeight * zoom).toBeCloseTo(472 - 184 - 8 - 16, 5);
    });

    it('keeps the desktop width of 360px when the viewport is wide, with or without zoom', () => {
      expect(ShellTopbarComponent.notificationsBounds({ width: 1280, height: 624 }, 56, 1.15).width).toBe(360);
    });

    it('never lets the height collapse below 120px and ignores a nonsense zoom', () => {
      expect(ShellTopbarComponent.notificationsBounds({ width: 400, height: 472 }, 460, 1).maxHeight).toBe(120);
      expect(ShellTopbarComponent.notificationsBounds({ width: 400, height: 472 }, 184, 0).width).toBe(360);
    });

    it('binds the computed bounds on the panel when it is open', async () => {
      await buildRendered();
      component.notificationsOpen.set(true);
      component.notificationsWidth.set(320);
      component.notificationsMaxHeight.set(200);
      fixture.detectChanges();
      const panel = document.querySelector('.pr-topbar-panel--notif') as HTMLElement;
      expect(panel.style.width).toBe('320px');
      expect(panel.style.maxHeight).toBe('200px');
    });
  });
});
