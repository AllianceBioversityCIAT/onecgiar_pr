import { Injectable } from '@angular/core';

/**
 * The slice of Tawk's global API this app uses. Tawk ships no types, and the object only exists
 * once the embed script in `TawkComponent` has finished loading — every member is optional on
 * purpose so a half-loaded widget cannot throw.
 */
interface TawkApi {
  maximize?: () => void;
  showWidget?: () => void;
  hideWidget?: () => void;
}

/**
 * Opens the support chat on demand (P2-3683).
 *
 * The chat used to advertise itself with Tawk's own floating bubble pinned to the bottom-right
 * corner; that bubble is gone and the only way in is now the topbar's Support menu. `TawkComponent`
 * hides the bubble as soon as the embed loads, so this service is what puts the conversation back
 * on screen when somebody actually asks for it.
 *
 * Why a service and not a `window` call in the component: the topbar must stay testable without a
 * real Tawk embed, and the widget genuinely may not be there — it is skipped for anonymous users
 * and in local (`app.component.html`, `!inLocal`), and the third-party script can simply fail to
 * load. Every caller therefore gets a boolean instead of an exception.
 */
@Injectable({ providedIn: 'root' })
export class SupportChatService {
  private get tawk(): TawkApi | undefined {
    return (window as unknown as { Tawk_API?: TawkApi })?.Tawk_API;
  }

  /** Whether the embed is loaded and can be opened right now. */
  get available(): boolean {
    return typeof this.tawk?.maximize === 'function';
  }

  /**
   * Brings up the chat window. `showWidget` first because the bubble is hidden: Tawk restores its
   * launcher before maximising, and skipping it leaves some sessions with a chat that opens once
   * and cannot be reopened.
   *
   * @returns `false` when the widget is not on the page, so the caller can fall back instead of
   * leaving the user clicking a dead menu entry.
   */
  open(): boolean {
    const api = this.tawk;
    if (typeof api?.maximize !== 'function') return false;

    try {
      api.showWidget?.();
      api.maximize();
      return true;
    } catch {
      return false;
    }
  }
}
