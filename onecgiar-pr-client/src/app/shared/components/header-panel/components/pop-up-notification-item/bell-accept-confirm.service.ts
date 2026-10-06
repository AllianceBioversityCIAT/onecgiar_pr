import { Injectable, signal } from '@angular/core';

export type BellConfirmAction = 'accept' | 'decline';

/**
 * BELL-T-11 / BELL-T-12: which bell button (card + action) is waiting for the second click of its two-step
 * confirm. A single root-level signal holding the (card, action) pair makes "only one armed button" structural:
 * arming any button replaces the owner, so every other Accept/Decline (this card or another) flips back.
 */
@Injectable({ providedIn: 'root' })
export class BellAcceptConfirmService {
  readonly owner = signal<{ card: object; action: BellConfirmAction } | null>(null);

  enter(card: object, action: BellConfirmAction): void {
    this.owner.set({ card, action });
  }

  /** Releases the confirm state only if `card` still holds it (a stale timer cannot cancel another card). */
  release(card: object): void {
    if (this.owner()?.card === card) this.owner.set(null);
  }

  isArmed(card: object, action: BellConfirmAction): boolean {
    const o = this.owner();
    return o?.card === card && o.action === action;
  }
}
