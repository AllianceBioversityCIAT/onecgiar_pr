import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { HlmDialogService } from '@spartan/dialog';
import { AiProcessesDrawerLauncherService } from './ai-processes-drawer-launcher.service';
import { AiProcessesDrawerHostComponent } from './ai-processes-drawer-host.component';
import { AI_PROCESSES_DRAWER_SHEET_CLASS } from './ai-processes-drawer.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';

interface FakeDialogRef {
  closed$: Subject<unknown>;
  close: jest.Mock;
}

/**
 * `AIQ-T-8` attempt 2 (Leader adjudication) — the DD-7 launcher: opens/closes the dialog by
 * reacting to `BilateralAiService.drawerOpen()`, and syncs it back to `false` when the dialog
 * closes (Esc/scrim/close-button, or a future host calling `.close()` on the ref directly).
 *
 * This service's `effect()` is not attached to any component view, so `signal.set()` alone does not
 * run it — every assertion below calls `flushEffects()` (`ApplicationRef.tick()`) first.
 */
describe('AiProcessesDrawerLauncherService', () => {
  let drawerOpen: ReturnType<typeof signal<boolean>>;
  let openSpy: jest.Mock;
  let closedSubject: Subject<unknown>;

  function flushEffects(): void {
    TestBed.inject(ApplicationRef).tick();
  }

  function setup(): AiProcessesDrawerLauncherService {
    drawerOpen = signal(false);
    closedSubject = new Subject();
    openSpy = jest.fn().mockReturnValue({ closed$: closedSubject.asObservable(), close: jest.fn() });

    TestBed.configureTestingModule({
      providers: [
        { provide: BilateralAiService, useValue: { drawerOpen } },
        { provide: HlmDialogService, useValue: { open: openSpy } },
      ],
    });
    return TestBed.inject(AiProcessesDrawerLauncherService);
  }

  it('does nothing while drawerOpen is false at construction', () => {
    setup();
    flushEffects();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('opens the drawer host with the P-18 sheet class and the a11y/dismiss options once drawerOpen turns true', () => {
    setup();
    drawerOpen.set(true);
    flushEffects();

    expect(openSpy).toHaveBeenCalledWith(
      AiProcessesDrawerHostComponent,
      expect.objectContaining({
        contentClass: AI_PROCESSES_DRAWER_SHEET_CLASS,
        showCloseButton: false,
        closeOnOutsidePointerEvents: true,
        ariaLabelledBy: 'ai-processes-drawer-title',
      }),
    );
  });

  it('guards against opening twice while already open', () => {
    setup();
    drawerOpen.set(true);
    flushEffects();
    drawerOpen.set(true);
    flushEffects();

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('mutation (b): closing the dialog (closed$) syncs drawerOpen back to false', () => {
    setup();
    drawerOpen.set(true);
    flushEffects();
    expect(drawerOpen()).toBe(true);

    closedSubject.next(undefined);

    expect(drawerOpen()).toBe(false);
  });

  it('setting drawerOpen(false) from elsewhere closes the current dialog ref', () => {
    setup();
    drawerOpen.set(true);
    flushEffects();
    const ref = openSpy.mock.results[0].value;

    drawerOpen.set(false);
    flushEffects();

    expect(ref.close).toHaveBeenCalledTimes(1);
  });

  it('reopens after a full close → open cycle', () => {
    setup();
    drawerOpen.set(true);
    flushEffects();
    closedSubject.next(undefined); // simulates Esc/scrim closing it, which also flips drawerOpen

    drawerOpen.set(true);
    flushEffects();

    expect(openSpy).toHaveBeenCalledTimes(2);
  });

  /**
   * Advisory (a11y lens, `AIQ-T-8` attempt 3): closing via the drawer's own button sets
   * `drawerOpen(false)` first, which the effect's `else if` branch answers by calling
   * `ref1.close()` and nulling `currentRef` SYNCHRONOUSLY — it does not wait for `ref1.closed$` to
   * fire. If a re-open happens before that real `closed$` finally arrives, `currentRef` already
   * points at `ref2` by the time `ref1`'s subscription callback runs. Without the `this.currentRef
   * === ref` identity guard, that stale callback would null `ref2` and set `drawerOpen(false)`
   * while the new dialog is still open — mutation (c) removes exactly that guard.
   */
  it('mutation (c): a late closed$ from a REPLACED ref never nulls the current one or reopens drawerOpen(false)', () => {
    const refs: FakeDialogRef[] = [];
    drawerOpen = signal(false);
    const openSpy2 = jest.fn().mockImplementation(() => {
      const ref: FakeDialogRef = { closed$: new Subject(), close: jest.fn() };
      refs.push(ref);
      return ref;
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: BilateralAiService, useValue: { drawerOpen } },
        { provide: HlmDialogService, useValue: { open: openSpy2 } },
      ],
    });
    TestBed.inject(AiProcessesDrawerLauncherService);

    // Cycle 1: open ref1.
    drawerOpen.set(true);
    flushEffects();
    expect(refs).toHaveLength(1);
    const ref1 = refs[0];

    // Close via the drawer's own button → `drawerOpen(false)` → effect calls `ref1.close()`
    // synchronously and nulls `currentRef`, WITHOUT `ref1.closed$` having fired yet.
    drawerOpen.set(false);
    flushEffects();
    expect(ref1.close).toHaveBeenCalledTimes(1);

    // Fast re-open before ref1's real closed$ arrives → opens ref2.
    drawerOpen.set(true);
    flushEffects();
    expect(refs).toHaveLength(2);
    const ref2 = refs[1];
    expect(drawerOpen()).toBe(true);

    // ref1's closed$ finally fires, late.
    ref1.closed$.next(undefined);
    flushEffects();

    // ref2 must be untouched: still the current dialog, `drawerOpen` still true, never closed.
    expect(drawerOpen()).toBe(true);
    expect(ref2.close).not.toHaveBeenCalled();
  });
});
