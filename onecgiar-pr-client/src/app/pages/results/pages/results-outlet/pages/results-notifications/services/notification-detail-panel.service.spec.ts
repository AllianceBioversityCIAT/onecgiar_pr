import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { TemplatePortal } from '@angular/cdk/portal';
import { NotificationDetailPanelService } from './notification-detail-panel.service';

describe('NotificationDetailPanelService', () => {
  let service: NotificationDetailPanelService;
  let breakpointState$: Subject<{ matches: boolean }>;
  let breakpointObserverMock: { observe: jest.Mock; isMatched: jest.Mock };
  // `TemplatePortal` needs a real `TemplateRef` + `ViewContainerRef` to construct — these falsifier
  // tests only ever check IDENTITY of what `portal()` returns, never render it (DSP-T-6 scope: the
  // service, not real CDK portal attachment — see design.md DSP-P-10), so a loosely-typed stand-in
  // object is enough and keeps the test independent of a component fixture.
  const portalA = { kind: 'A' } as unknown as TemplatePortal;
  const portalB = { kind: 'B' } as unknown as TemplatePortal;

  beforeEach(() => {
    breakpointState$ = new Subject<{ matches: boolean }>();
    breakpointObserverMock = {
      observe: jest.fn().mockReturnValue(breakpointState$.asObservable()),
      isMatched: jest.fn().mockReturnValue(false)
    };

    TestBed.configureTestingModule({
      providers: [NotificationDetailPanelService, { provide: BreakpointObserver, useValue: breakpointObserverMock }]
    });

    service = TestBed.inject(NotificationDetailPanelService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('isWide', () => {
    it('initializes from BreakpointObserver.isMatched and updates as observe() emits', () => {
      expect(breakpointObserverMock.observe).toHaveBeenCalledWith('(min-width: 1280px)');
      expect(service.isWide()).toBe(false);

      breakpointState$.next({ matches: true });
      expect(service.isWide()).toBe(true);

      breakpointState$.next({ matches: false });
      expect(service.isWide()).toBe(false);
    });
  });

  describe('open / close / closeAll (DSP-T-6 falsifiers)', () => {
    it('FALSIFIER: open(B) while A is active must move activeKey to B, not leave it at A', () => {
      service.open('A', portalA);
      expect(service.activeKey()).toBe('A');

      service.open('B', portalB);

      // Broken-code check performed manually (see task report): guarding `open()` with
      // `if (this.activeKeySignal()) return;` makes this assertion fail with `activeKey() === 'A'`
      // instead of 'B' — restored before this run.
      expect(service.activeKey()).toBe('B');
      expect(service.portal()).toBe(portalB);
    });

    it('FALSIFIER: close(A) while B is active must be a no-op and must NOT clear B', () => {
      service.open('A', portalA);
      service.open('B', portalB);

      service.close('A');

      // Broken-code check performed manually: removing the `if (this.activeKeySignal() !== key) return;`
      // guard makes this assertion fail because B gets cleared by a stale close('A').
      expect(service.activeKey()).toBe('B');
      expect(service.portal()).toBe(portalB);
    });

    it('close(key) clears the active key when key IS the active one', () => {
      service.open('A', portalA);

      service.close('A');

      expect(service.activeKey()).toBeNull();
      expect(service.portal()).toBeNull();
    });

    it('closeAll() clears the active key/portal/labelledBy unconditionally', () => {
      service.open('A', portalA, 'heading-A');
      expect(service.labelledBy()).toBe('heading-A');

      service.closeAll();

      expect(service.activeKey()).toBeNull();
      expect(service.portal()).toBeNull();
      expect(service.labelledBy()).toBeNull();
    });

    it('open() without labelledBy clears any previous labelledBy', () => {
      service.open('A', portalA, 'heading-A');
      service.open('B', portalB);

      expect(service.labelledBy()).toBeNull();
    });
  });

  // @akili-spec notifications/detail-side-panel (DSP-T-7, forward pointer from DSP-T-6)
  describe('closedByUser$ / requestClose() (DSP-T-7)', () => {
    it('requestClose() emits on closedByUser$ without closing anything itself', () => {
      service.open('A', portalA);
      const emissions: void[] = [];
      service.closedByUser$.subscribe(value => emissions.push(value));

      service.requestClose();

      expect(emissions.length).toBe(1);
      // This service only notifies — the active row's own subscription is what actually closes.
      expect(service.activeKey()).toBe('A');
      expect(service.portal()).toBe(portalA);
    });

    it('requestClose() with no subscriber is a safe no-op', () => {
      expect(() => service.requestClose()).not.toThrow();
    });
  });
});
