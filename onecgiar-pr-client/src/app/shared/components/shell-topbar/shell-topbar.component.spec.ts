import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
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
      dataControlSE: { myInitiativesList: [] as any[] }
    };
    dataControlMock = { show_qa_full_screen: false, focusMode: signal(false) };
    routerMock = { url: '/result/results-outlet/results-list', navigate: jest.fn() };
    notificationsMock = {
      updatesPopUpData: [] as any[],
      handlePopUpNotificationLastViewed: jest.fn()
    };
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
  it('notificationBadgeLength is empty with no notifications', async () => {
    await build();
    expect(component.notificationBadgeLength()).toBe('');

    notificationsMock.updatesPopUpData = [{ id: 1 }, { id: 2 }];
    expect(component.notificationBadgeLength()).toBe('2');
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

  it('goToNotifications navigates to the requests tab', async () => {
    await build();
    component.goToNotifications();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/result/results-outlet/results-notifications/requests']);
  });

  it('handleClosePopUp clears the pending updates once', async () => {
    notificationsMock.updatesPopUpData = [{ id: 1 }];
    await build();
    component.handleClosePopUp();
    expect(notificationsMock.updatesPopUpData).toEqual([]);
    expect(notificationsMock.handlePopUpNotificationLastViewed).toHaveBeenCalledTimes(1);

    component.handleClosePopUp();
    expect(notificationsMock.handlePopUpNotificationLastViewed).toHaveBeenCalledTimes(1);
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

      // The chat is NOT gated — it is the supported route in production.
      expect(insideGuards).not.toContain('openSupportChat()');
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

    it('offers Reset only when a non-default size is active', () => {
      const html = readFileSync(join(__dirname, 'shell-topbar.component.html'), 'utf8');
      const from = html.indexOf('pr-topbar-account__group--text');
      expect(from).toBeGreaterThan(-1);
      const group = html.slice(from, html.indexOf('pr-topbar-panel__body', from));

      expect(group).toContain("@if (fontScaleSE.scale() !== 'default')");
      expect(group).toContain('(click)="fontScaleSE.reset()"');
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

      // Two rules: Help | bell | user.
      expect((cluster.match(/pr-topbar-sep/g) || []).length).toBe(2);
      expect(cluster.indexOf('pr-topbar-actions')).toBeGreaterThan(cluster.indexOf('pr-topbar-sep'));
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
});
