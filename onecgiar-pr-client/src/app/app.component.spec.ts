import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ShareRequestModalComponent } from './pages/results/pages/result-detail/components/share-request-modal/share-request-modal.component';
import { ExternalToolsComponent } from './shared/components/external-tools/external-tools.component';
import { GoogleAnalyticsComponent } from './shared/components/external-tools/components/google-analytics/google-analytics.component';
import { PrToastComponent } from './shared/components/pr-toast/pr-toast.component';
import { PrToastService } from './shared/components/pr-toast/pr-toast.service';
import { STALE_BUNDLE_REFRESH_COPY } from './internationalization/stale-bundle-refresh.copy';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule, PrToastComponent],
      declarations: [AppComponent, ShareRequestModalComponent, ExternalToolsComponent, GoogleAnalyticsComponent],
      providers: []
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it(`should have as title 'onecgiar-pr-client'`, () => {
    expect(component.title).toEqual('onecgiar-pr-client');
  });

  describe('On init', () => {
    it('should have a method copyTokenToClipboard', () => {
      const copyTokenToClipboardSpy = jest.spyOn(component, 'copyTokenToClipboard');
      component.ngOnInit();
      expect(copyTokenToClipboardSpy).toHaveBeenCalled();
    });
    it('shoud have a method copyTokenToClipboard', () => {
      expect(component.copyTokenToClipboard).toBeDefined();
    });
  });

  describe('Session bootstrap (BELL-T-2)', () => {
    it('loads the bell on boot and no longer calls the last-viewed pop-up feed (BELL-R-12)', () => {
      const notificationsSE = (component as any).resultsNotificationsSE;
      const refreshBell = jest.spyOn(notificationsSE, 'refreshBell').mockImplementation(() => {});
      const popUp = jest.spyOn(notificationsSE, 'get_updates_pop_up_notifications').mockImplementation(() => {});
      jest.spyOn(component.AuthService, 'localStorageUser', 'get').mockReturnValue({ id: 1 } as any);
      jest.spyOn(component.api, 'updateUserData').mockImplementation((cb: any) => cb());
      jest.spyOn(component.api.dataControlSE, 'getCurrentPhases').mockReturnValue({ subscribe: () => {} } as any);

      (component as any).bootstrapUserSession();

      expect(refreshBell).toHaveBeenCalledTimes(1);
      expect(popUp).not.toHaveBeenCalled();
    });
  });

  describe('Stale-bundle refresh prompt (SBR-T-1)', () => {
    const STALE_CHUNK_ERROR = new Error(
      'TypeError: Failed to fetch dynamically imported module: https://prtest.ciat.cgiar.org/bilateral.module-abc123.js'
    );
    const UNRELATED_ERROR = new Error('Guard rejected');

    /** Fresh TestBed per test: `/bilateral`'s `loadChildren` is overridden per-case. */
    async function setupWithRejectingRoute(rejection: Error) {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [
          RouterTestingModule.withRoutes([{ path: 'bilateral', loadChildren: () => Promise.reject(rejection) }]),
          HttpClientTestingModule,
          PrToastComponent
        ],
        declarations: [AppComponent, ShareRequestModalComponent, ExternalToolsComponent, GoogleAnalyticsComponent],
        providers: []
      }).compileComponents();

      const localFixture = TestBed.createComponent(AppComponent);
      const localComponent = localFixture.componentInstance;
      const router = TestBed.inject(Router);
      const prToastSE = TestBed.inject(PrToastService);
      localComponent.ngOnInit();
      return { localComponent, router, prToastSE, localFixture };
    }

    /** `navigateByUrl`'s returned promise rejects on a failed lazy-load; the Router still emits
     *  `NavigationError` on its event stream (verified independently) — that stream, not this
     *  promise, is what `AppComponent` listens to. */
    async function navigateExpectingRejection(router: Router, url: string): Promise<void> {
      try {
        await router.navigateByUrl(url);
      } catch {
        // Expected: the lazy-route rejection surfaces here too. The behavior under test is driven
        // off `router.events`, asserted separately below.
      }
    }

    it('shows a sticky, keyed toast when a lazy route chunk fails to load (SBR-R-1, SBR-R-2)', async () => {
      const { router, prToastSE } = await setupWithRejectingRoute(STALE_CHUNK_ERROR);

      await navigateExpectingRejection(router, '/bilateral/CIAT/home');

      const toast = prToastSE.toasts().find(t => t.key === 'stale-bundle-refresh');
      expect(toast).toBeDefined();
      expect(toast?.sticky).toBe(true);
      expect(toast?.detail ?? toast?.summary).toBe(STALE_BUNDLE_REFRESH_COPY.message);
      expect(toast?.action?.label).toBe(STALE_BUNDLE_REFRESH_COPY.actionLabel);
    });

    it('reloads the page via the toast action (SBR-R-3)', async () => {
      const originalLocation = window.location;
      const { router, prToastSE } = await setupWithRejectingRoute(STALE_CHUNK_ERROR);
      const reloadSpy = jest.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, reload: reloadSpy }
      });

      try {
        await navigateExpectingRejection(router, '/bilateral/CIAT/home');
        const toast = prToastSE.toasts().find(t => t.key === 'stale-bundle-refresh');
        toast?.action?.run();

        expect(reloadSpy).toHaveBeenCalledTimes(1);
      } finally {
        // Advisory from the Reviewer's attempt-1 report: restore `window.location` so this
        // override never leaks into a later test.
        Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
      }
    });

    it('does not add a toast for an unrelated NavigationError (negative control)', async () => {
      const { router, prToastSE } = await setupWithRejectingRoute(UNRELATED_ERROR);

      await navigateExpectingRejection(router, '/bilateral/CIAT/home');

      expect(prToastSE.toasts().length).toBe(0);
    });

    it('does not stack a second toast when the qualifying error fires twice (SBR-R-10)', async () => {
      const { router, prToastSE } = await setupWithRejectingRoute(STALE_CHUNK_ERROR);

      await navigateExpectingRejection(router, '/bilateral/CIAT/home');
      await navigateExpectingRejection(router, '/bilateral/CIAT/home');

      expect(prToastSE.toasts().filter(t => t.key === 'stale-bundle-refresh').length).toBe(1);
    });

    it('actually renders the toast in the DOM via its own host, not just in the service list (SBR-P-3b)', async () => {
      const { router, localFixture, prToastSE } = await setupWithRejectingRoute(STALE_CHUNK_ERROR);

      await navigateExpectingRejection(router, '/bilateral/CIAT/home');
      // Sanity check this test's own premise: the service-level list already has the entry
      // (proved by the first test above) — this test's job is the DOM, not the service list.
      expect(prToastSE.toasts().some(t => t.key === 'stale-bundle-refresh')).toBe(true);

      localFixture.detectChanges();

      // Found by `[key]` on the component instance, not a DOM attribute selector — `key` is a
      // plain `@Input()`, so this doesn't depend on how Angular reflects it onto the element.
      const staleHost = localFixture.debugElement
        .queryAll(By.directive(PrToastComponent))
        .find(host => (host.componentInstance as PrToastComponent).key === 'stale-bundle-refresh');

      expect(staleHost).toBeDefined();
      const renderedText = (staleHost!.nativeElement as HTMLElement).textContent ?? '';
      expect(renderedText).toContain(STALE_BUNDLE_REFRESH_COPY.message);

      const actionButton = staleHost!.query(By.css('.pr-toast__action'));
      expect(actionButton).toBeTruthy();
      expect((actionButton.nativeElement as HTMLButtonElement).textContent?.trim()).toBe(STALE_BUNDLE_REFRESH_COPY.actionLabel);
    });
  });
});
