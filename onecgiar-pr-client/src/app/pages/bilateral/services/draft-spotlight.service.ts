// @akili-spec bilateral/ai-draft-spotlight (ADS-T-2, ADS-DD-4, ADS-DD-7, ADS-DD-9)
import { Injectable, signal } from '@angular/core';
import { driver, Driver } from 'driver.js';

export type DraftSpotlightCloseReason = 'dismiss' | 'programmatic';

export interface DraftSpotlightOptions {
  /** Plain text. It may embed user-entered data (the project name), so the service HTML-escapes it. */
  title: string;
  /** Static, trusted copy that may carry markup (the `<strong>` in the copy file). Never put dynamic values here. */
  description: string;
  /** Plain text; escaped like the title. */
  buttonText: string;
  /** Called only when the user dismisses (Got it, Esc, overlay), never on a programmatic close. */
  onDismiss: () => void;
}

/** `ADS-DD-7`: driver.js writes title, description and button texts with `innerHTML` (P-11). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Thin wrapper over driver.js that lights one element. It owns a single close path so the
 * lifecycle never depends on `onDestroyed` (P-15): Got it, Esc and overlay all end in `close('dismiss')`.
 */
@Injectable({ providedIn: 'root' })
export class DraftSpotlightService {
  readonly active = signal(false);

  private instance: Driver | null = null;
  private scrollContainer: HTMLElement | null = null;
  private onDismiss: (() => void) | null = null;
  private readonly onContainerScroll = (): void => this.refresh();

  isActive(): boolean {
    return this.active();
  }

  show(card: HTMLElement, container: HTMLElement | null, options: DraftSpotlightOptions): void {
    this.close('programmatic');

    const instance = driver({
      popoverClass: 'pr-guide',
      overlayOpacity: 0.65,
      stagePadding: 6,
      animate: false,
      allowClose: true,
      // Esc and overlay click land here. The public `destroy()` skips this hook (P-9), so `close` cannot loop.
      onDestroyStarted: () => this.close('dismiss'),
    });
    this.instance = instance;
    this.onDismiss = options.onDismiss;

    // The buttons live in the STEP popover: `highlight()` forces `showButtons: []` over the config (P-17).
    instance.highlight({
      element: card,
      popover: {
        title: escapeHtml(options.title),
        description: options.description,
        showButtons: ['next'],
        nextBtnText: escapeHtml(options.buttonText),
        onNextClick: () => this.close('dismiss'),
      },
    });

    // driver.js re-measures on WINDOW scroll only (P-14); Draft Results scrolls inside a nested container.
    if (container) {
      container.addEventListener('scroll', this.onContainerScroll, { passive: true });
      this.scrollContainer = container;
    }
    this.active.set(true);
  }

  /** Idempotent. Only `'dismiss'` calls `onDismiss`. */
  close(reason: DraftSpotlightCloseReason): void {
    const instance = this.instance;
    if (!instance) return;
    const onDismiss = this.onDismiss;
    this.instance = null;
    this.onDismiss = null;
    this.scrollContainer?.removeEventListener('scroll', this.onContainerScroll);
    this.scrollContainer = null;
    this.active.set(false);
    instance.destroy();
    if (reason === 'dismiss') onDismiss?.();
  }

  refresh(): void {
    this.instance?.refresh();
  }
}
