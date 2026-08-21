import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HlmSidebarService } from '@spartan/sidebar';

import { ShellTopbarComponent } from './shell-topbar.component';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { ResultsNotificationsService } from '../../../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
import { ResultsListFilterService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service';

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
  let sidebarMock: any;

  const build = async () => {
    await TestBed.configureTestingModule({
      imports: [ShellTopbarComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: DataControlService, useValue: dataControlMock },
        { provide: Router, useValue: routerMock },
        { provide: ResultsNotificationsService, useValue: notificationsMock },
        { provide: ResultsListFilterService, useValue: filterMock },
        { provide: HlmSidebarService, useValue: sidebarMock }
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
    sidebarMock = { toggleSidebar: jest.fn(), state: signal('expanded'), isMobile: signal(false) };
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
  });

  // ------------------------------------------------------------- other chrome
  it('toggleSidebar delegates to the sidebar service', async () => {
    await build();
    component.toggleSidebar();
    expect(sidebarMock.toggleSidebar).toHaveBeenCalled();
  });

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
});
