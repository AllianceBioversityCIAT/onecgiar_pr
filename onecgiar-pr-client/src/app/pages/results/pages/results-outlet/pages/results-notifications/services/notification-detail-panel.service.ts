import { Injectable, Signal, WritableSignal, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Portal } from '@angular/cdk/portal';
import { Observable, Subject, map } from 'rxjs';

/** DSP-DD-2 / design.md §6.2: the single breakpoint that decides docked-panel vs drawer. Kept as a
 * named constant so the page's media query (used only for the CSS width steps, not this signal) and
 * this service's own test fixtures can both point at the one number. */
const WIDE_QUERY = '(min-width: 1280px)';

/**
 * @akili-spec notifications/detail-side-panel (DSP-T-6, design.md §6.2)
 *
 * Page-scoped coordinator for the notification detail panel (DSP-DD-1/DD-2). Provided per
 * `ResultsNotificationsComponent` instance — each page gets its own, nothing is shared with the
 * header bell or across pages.
 *
 * Decides WHERE one notification's detail template renders, and WHICH notification is "active":
 * - `isWide()` true (viewport ≥ 1280 px, DSP-R-1): the page's docked `<aside>` projects `portal()`
 *   via `cdkPortalOutlet`.
 * - `isWide()` false: the owning row's own drawer renders the same template directly (T-7).
 *
 * This service holds no PER-ROW state (mode, Align selection, chain) — that stays on the row
 * (DSP-DD-1 "Option B"). It only tracks: which key is active, what portal to render, and an
 * optional `labelledBy` id for the aside's accessible name. A row's own `activeKey` effect (T-7) is
 * what resets a previously-active row's in-progress state once it loses ownership here.
 *
 * `open`/`close`/`closeAll` API (design.md §6.2):
 * - `open(key, portal, labelledBy?)` — makes `key` the active one, replacing whatever was active
 *   (DSP-R-2). Re-opening the SAME key is intentionally NOT a toggle at this layer — "re-activate
 *   closes" (`NOTIF-R-11`) is the ROW's own decision (T-7 calls `close()` itself in that case), not
 *   something this service infers from being asked to open an already-active key again.
 * - `close(key)` — no-op unless `key` is the CURRENTLY active one. A stale/late `close()` from a row
 *   that already lost ownership (its own `ngOnDestroy` racing another row's `open()`) must never
 *   clear a DIFFERENT, now-active row.
 * - `closeAll()` — unconditional close regardless of which key owns it (DSP-R-3: Received/Sent
 *   switch, `setActiveSource()`).
 */
@Injectable()
export class NotificationDetailPanelService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  /** DSP-R-1 / DSP-DD-2: the one signal that drives both containers. The aside's 380/440 px widths
   * are pure CSS (min-[1600px]:w-[440px]) — this signal only decides docked vs drawer. */
  readonly isWide: Signal<boolean> = toSignal(
    this.breakpointObserver.observe(WIDE_QUERY).pipe(map(state => state.matches)),
    { initialValue: this.breakpointObserver.isMatched(WIDE_QUERY) }
  );

  private readonly activeKeySignal: WritableSignal<string | null> = signal(null);
  private readonly portalSignal: WritableSignal<Portal<unknown> | null> = signal(null);
  private readonly labelledBySignal: WritableSignal<string | null> = signal(null);

  readonly activeKey: Signal<string | null> = this.activeKeySignal.asReadonly();
  readonly portal: Signal<Portal<unknown> | null> = this.portalSignal.asReadonly();

  /** Set by `open()`'s optional third argument (design.md §6.2 note under DSP-R-13/a11y). T-7 passes
   * the detail content's heading id here so the docked `<aside role="complementary">` can bind
   * `[attr.aria-labelledby]` without this service knowing anything about the content component. */
  readonly labelledBy: Signal<string | null> = this.labelledBySignal.asReadonly();

  open(key: string, portal: Portal<unknown>, labelledBy?: string): void {
    this.activeKeySignal.set(key);
    this.portalSignal.set(portal);
    this.labelledBySignal.set(labelledBy ?? null);
  }

  close(key: string): void {
    if (this.activeKeySignal() !== key) return;
    this.activeKeySignal.set(null);
    this.portalSignal.set(null);
    this.labelledBySignal.set(null);
  }

  closeAll(): void {
    this.activeKeySignal.set(null);
    this.portalSignal.set(null);
    this.labelledBySignal.set(null);
  }

  /**
   * @akili-spec notifications/detail-side-panel (DSP-T-7, design.md §6.2 table)
   * Forward pointer from DSP-T-6: a user-initiated close that does not go through any row's own
   * ✕/toggle — today the docked `<aside>`'s own Escape handler (DSP-R-3). This service only
   * notifies; it never closes anything itself. The active row's own subscription (notification-item)
   * routes the notification through its `closeDrawer()`, so the row still resets its state and
   * restores focus to itself exactly like a ✕ click would (design.md "Leader hint").
   */
  private readonly closedByUserSubject = new Subject<void>();
  readonly closedByUser$: Observable<void> = this.closedByUserSubject.asObservable();

  /** DSP-T-7: called by the page's docked `<aside>` on Escape. */
  requestClose(): void {
    this.closedByUserSubject.next();
  }
}
