import { ApplicationRef, DOCUMENT, PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmSidebarService } from './hlm-sidebar.service';
import { provideHlmSidebarConfig } from './hlm-sidebar.token';

interface FakeMediaQueryList {
  matches: boolean;
  handlers: Array<(e: any) => void>;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
}

function fakeMql(matches = false): FakeMediaQueryList {
  const mql: FakeMediaQueryList = {
    matches,
    handlers: [],
    addEventListener: jest.fn((_: string, handler: (e: any) => void) => mql.handlers.push(handler)),
    removeEventListener: jest.fn()
  };
  return mql;
}

/** Clears every cookie jsdom currently holds for the test document. */
function clearCookies(): void {
  document.cookie.split(';').forEach(c => {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  });
}

describe('HlmSidebarService', () => {
  let originalMatchMedia: any;

  beforeEach(() => {
    originalMatchMedia = (window as any).matchMedia;
    clearCookies();
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', { value: originalMatchMedia, configurable: true, writable: true });
    clearCookies();
    jest.useRealTimers();
  });

  function setup(providers: any[] = []): HlmSidebarService {
    TestBed.configureTestingModule({ providers: [HlmSidebarService, ...providers] });
    return TestBed.inject(HlmSidebarService);
  }

  /** Runs the pending afterNextRender callbacks. */
  function render(): void {
    TestBed.inject(ApplicationRef).tick();
  }

  describe('cookie restore (browser)', () => {
    it('defaults to open when there is no cookie', () => {
      const service = setup();
      expect(service.open()).toBe(true);
      expect(service.state()).toBe('expanded');
    });

    it('restores a collapsed sidebar from the cookie', () => {
      document.cookie = 'sidebar_state=false; path=/';
      const service = setup();
      expect(service.open()).toBe(false);
      expect(service.state()).toBe('collapsed');
    });

    it('restores an expanded sidebar from the cookie', () => {
      document.cookie = 'sidebar_state=true; path=/';
      expect(setup().open()).toBe(true);
    });

    it('ignores unrelated cookies', () => {
      document.cookie = 'other_cookie=false; path=/';
      expect(setup().open()).toBe(true);
    });

    it('honours a custom cookie name from the config', () => {
      document.cookie = 'my_sidebar=false; path=/';
      const service = setup([provideHlmSidebarConfig({ sidebarCookieName: 'my_sidebar' })]);
      expect(service.open()).toBe(false);
    });
  });

  describe('cookie restore (server)', () => {
    const serverProviders = (cookie: string | null) => [
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: REQUEST, useValue: { headers: { get: jest.fn().mockReturnValue(cookie) } } }
    ];

    it('reads the cookie from the request headers', () => {
      expect(setup(serverProviders('sidebar_state=false')).open()).toBe(false);
    });

    it('falls back to open when the request carries no cookie header', () => {
      expect(setup(serverProviders(null)).open()).toBe(true);
    });

    it('falls back to open when there is no request at all', () => {
      expect(setup([{ provide: PLATFORM_ID, useValue: 'server' }]).open()).toBe(true);
    });
  });

  describe('setOpen', () => {
    it('writes the state and the cookie', () => {
      const service = setup();
      service.setOpen(false);
      expect(service.open()).toBe(false);
      expect(document.cookie).toContain('sidebar_state=false');

      service.setOpen(true);
      expect(service.open()).toBe(true);
      expect(document.cookie).toContain('sidebar_state=true');
    });
  });

  describe('setVariant', () => {
    it('defaults to "sidebar" and accepts the other variants', () => {
      const service = setup();
      expect(service.variant()).toBe('sidebar');
      service.setVariant('floating');
      expect(service.variant()).toBe('floating');
      service.setVariant('inset');
      expect(service.variant()).toBe('inset');
    });
  });

  describe('mobile behaviour', () => {
    it('ignores setOpenMobile while on desktop', () => {
      const service = setup();
      service.setOpenMobile(true);
      expect(service.openMobile()).toBe(false);
    });

    it('toggles the desktop sidebar when not mobile', () => {
      const service = setup();
      service.toggleSidebar();
      expect(service.open()).toBe(false);
      expect(service.openMobile()).toBe(false);
      service.toggleSidebar();
      expect(service.open()).toBe(true);
    });

    it('picks up the media query on render and switches to the mobile toggle', () => {
      const mql = fakeMql(true);
      Object.defineProperty(window, 'matchMedia', { value: jest.fn().mockReturnValue(mql), configurable: true, writable: true });

      const service = setup();
      render();

      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
      expect(service.isMobile()).toBe(true);

      service.setOpenMobile(true);
      expect(service.openMobile()).toBe(true);

      service.toggleSidebar();
      expect(service.openMobile()).toBe(false);
      expect(service.open()).toBe(true);
    });

    it('closes the mobile sidebar when going back to desktop', () => {
      const mql = fakeMql(true);
      Object.defineProperty(window, 'matchMedia', { value: jest.fn().mockReturnValue(mql), configurable: true, writable: true });

      const service = setup();
      render();
      service.setOpenMobile(true);
      expect(service.openMobile()).toBe(true);

      mql.handlers.forEach(h => h({ matches: false }));
      expect(service.isMobile()).toBe(false);
      expect(service.openMobile()).toBe(false);

      mql.handlers.forEach(h => h({ matches: true }));
      expect(service.isMobile()).toBe(true);
    });

    it('does nothing on render when matchMedia is unavailable', () => {
      Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true, writable: true });
      const service = setup();
      expect(() => render()).not.toThrow();
      expect(service.isMobile()).toBe(false);
    });

    it('does nothing on render when the document has no window (SSR-like document)', () => {
      const fakeDocument = { defaultView: null, cookie: 'sidebar_state=false' };
      const service = setup([{ provide: DOCUMENT, useValue: fakeDocument }]);
      expect(service.open()).toBe(false);
      expect(() => render()).not.toThrow();
      expect(service.isMobile()).toBe(false);

      service.setOpen(true);
      expect(fakeDocument.cookie).toContain('sidebar_state=true');
    });
  });

  describe('keyboard shortcut', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'matchMedia', { value: jest.fn().mockReturnValue(fakeMql(false)), configurable: true, writable: true });
    });

    it('toggles on ctrl+b', () => {
      const service = setup();
      render();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
      expect(service.open()).toBe(false);
    });

    it('toggles on meta+b', () => {
      const service = setup();
      render();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true }));
      expect(service.open()).toBe(false);
    });

    it('ignores the key without a modifier', () => {
      const service = setup();
      render();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
      expect(service.open()).toBe(true);
    });

    it('ignores a different key with the modifier', () => {
      const service = setup();
      render();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      expect(service.open()).toBe(true);
    });

    it('honours a custom shortcut from the config', () => {
      const service = setup([provideHlmSidebarConfig({ sidebarKeyboardShortcut: 'k' })]);
      render();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      expect(service.open()).toBe(false);
    });
  });

  describe('resize handling', () => {
    it('re-reads the media query after the debounce, on every resize', () => {
      jest.useFakeTimers();
      const mql = fakeMql(false);
      Object.defineProperty(window, 'matchMedia', { value: jest.fn().mockReturnValue(mql), configurable: true, writable: true });

      const service = setup();
      render();

      mql.matches = true;
      window.dispatchEvent(new Event('resize'));
      // A second resize inside the debounce window clears the first timer.
      window.dispatchEvent(new Event('resize'));
      expect(service.isMobile()).toBe(false);

      jest.advanceTimersByTime(100);
      expect(service.isMobile()).toBe(true);
    });
  });

  describe('teardown', () => {
    it('removes every listener when the injector is destroyed', () => {
      jest.useFakeTimers();
      const mql = fakeMql(false);
      Object.defineProperty(window, 'matchMedia', { value: jest.fn().mockReturnValue(mql), configurable: true, writable: true });
      const removeSpy = jest.spyOn(window, 'removeEventListener');

      setup();
      render();
      window.dispatchEvent(new Event('resize'));

      TestBed.resetTestingModule();

      expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      removeSpy.mockRestore();
    });
  });
});
