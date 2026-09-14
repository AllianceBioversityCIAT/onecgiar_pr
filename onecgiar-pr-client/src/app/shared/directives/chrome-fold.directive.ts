import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';
import { ScrollChromeService } from '../services/scroll-chrome.service';

/**
 * Folds its host out of the layout while the user reads downwards, and brings it back on the way
 * up (state owned by `ScrollChromeService`).
 *
 * It slides with `transform` and recovers the space with a negative margin, rather than animating
 * the height. Two measured reasons:
 *  - `grid-template-rows: 1fr → 0fr` does not collapse at all once a `transition` is declared on
 *    it here — verified on this app, header AND bottom bar, including at 1ms.
 *  - `max-height` + `overflow: hidden` would work, but the clipping is permanent, and both hosts
 *    have things that deliberately overflow them (the topbar's menus, the bottom bar's
 *    "Still missing" popover, which opens upwards).
 *
 * The margin needs the host's own height, so it is measured here and published as `--fold-h`.
 */
@Directive({
  selector: '[appChromeFold]',
  standalone: true,
  host: {
    '[class.chrome-fold]': 'true',
    '[class.chrome-fold--folded]': 'chromeSE.hidden()',
    '[class.chrome-fold--down]': "foldDirection() === 'down'"
  }
})
export class ChromeFoldDirective implements OnDestroy {
  /** Which way the host leaves: `up` for the topbar, `down` for a bottom bar. */
  readonly foldDirection = input<'up' | 'down'>('up', { alias: 'appChromeFold' });

  readonly chromeSE = inject(ScrollChromeService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  // jsdom has no ResizeObserver, and neither does every embedded browser. The effect below
  // already publishes a usable height, so its absence degrades the tracking, never the fold.
  private readonly observer: ResizeObserver | null = null;

  constructor() {
    const el = this.host.nativeElement;
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(entries => {
        const height = entries[0]?.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight;
        // Only while OPEN: measuring a folded host would publish its collapsed height and the
        // element could never come back.
        if (!this.chromeSE.hidden() && height > 0) el.style.setProperty('--fold-h', `${height}px`);
      });
      this.observer.observe(el);
    }

    // Seed the value before the first fold, in case nothing resizes in between.
    effect(() => {
      if (this.chromeSE.hidden()) return;
      queueMicrotask(() => {
        const height = el.offsetHeight;
        if (height > 0) el.style.setProperty('--fold-h', `${height}px`);
      });
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
