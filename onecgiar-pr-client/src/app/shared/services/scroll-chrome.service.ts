import { Injectable, signal } from '@angular/core';

/**
 * Whether the app chrome — the topbar and a page's bottom bar — is currently folded away because
 * the user is reading downwards.
 *
 * The page that scrolls reports its position here (see `HideChromeOnScrollDirective`) and the
 * chrome listens. Direction, not position: the bar comes back the moment the user scrolls up,
 * without having to reach the top of a very long form.
 */
@Injectable({ providedIn: 'root' })
export class ScrollChromeService {
  readonly hidden = signal(false);

  private lastTop = 0;

  /** Downward travel before folding. Above a few px, a trackpad's inertia alone would fire it. */
  private static readonly HIDE_AFTER = 14;
  /** Upward travel before unfolding. Lower than HIDE_AFTER: getting the bar back must feel instant. */
  private static readonly SHOW_AFTER = 6;
  /** Near the top the chrome is always shown — there is nothing to gain by hiding it there. */
  private static readonly TOP_ZONE = 24;

  /**
   * Folding gives the reading area ~175px back, the content reflows, and the browser emits a
   * scroll event for a move the user never made — often upwards, which would unfold the chrome
   * immediately and leave it flickering. Measured on result detail. So after every change the
   * next events only re-baseline the position; they decide nothing.
   */
  private static readonly SETTLE_MS = 320;
  private settledAt = 0;

  /**
   * A scroll the APP performed — "Go" jumping to a missing field — must leave the chrome exactly
   * as the user left it. Only a scroll the user drove decides anything, so a programmatic one
   * suspends the tracking and merely re-baselines the position.
   */
  private static readonly PROGRAMMATIC_MAX_MS = 3000;
  private static readonly PROGRAMMATIC_IDLE_MS = 260;
  private suspendedUntil = 0;
  private suspendedFrom = 0;

  /** Call right before a `scrollIntoView` / `scrollTo`; it lifts itself once the scroll stops. */
  beginProgrammaticScroll(): void {
    const now = performance.now();
    this.suspendedFrom = now;
    this.suspendedUntil = now + ScrollChromeService.PROGRAMMATIC_IDLE_MS;
  }

  private isProgrammatic(now: number): boolean {
    if (now >= this.suspendedUntil) return false;
    // Each event while suspended pushes the window forward, so a long smooth scroll stays
    // covered end to end — but never past the absolute cap, which is what stops a stuck
    // suspension from disabling the fold for the rest of the session.
    if (now - this.suspendedFrom < ScrollChromeService.PROGRAMMATIC_MAX_MS) {
      this.suspendedUntil = now + ScrollChromeService.PROGRAMMATIC_IDLE_MS;
    }
    return true;
  }

  /**
   * Record the position without deciding anything. For scrolls the user did not drive with the
   * page in mind — see `HideChromeOnScrollDirective` and open dropdowns.
   */
  rebaseline(top: number): void {
    this.lastTop = top;
  }

  track(top: number): void {
    if (this.isProgrammatic(performance.now())) {
      this.lastTop = top;
      return;
    }

    if (top <= ScrollChromeService.TOP_ZONE) {
      this.lastTop = top;
      this.setHidden(false);
      return;
    }

    if (performance.now() - this.settledAt < ScrollChromeService.SETTLE_MS) {
      this.lastTop = top;
      return;
    }

    const travelled = top - this.lastTop;
    if (travelled > ScrollChromeService.HIDE_AFTER) {
      this.lastTop = top;
      this.setHidden(true);
    } else if (travelled < -ScrollChromeService.SHOW_AFTER) {
      this.lastTop = top;
      this.setHidden(false);
    }
  }

  private setHidden(value: boolean): void {
    if (this.hidden() === value) return;
    this.hidden.set(value);
    this.settledAt = performance.now();
  }

  /** Leaving the page that scrolls must never strand the chrome folded away. */
  reset(): void {
    this.lastTop = 0;
    this.settledAt = 0;
    this.suspendedUntil = 0;
    this.suspendedFrom = 0;
    this.hidden.set(false);
  }
}
