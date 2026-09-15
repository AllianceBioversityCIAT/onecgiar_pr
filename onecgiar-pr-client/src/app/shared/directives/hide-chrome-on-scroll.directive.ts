import { Directive, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';
import { ScrollChromeService } from '../services/scroll-chrome.service';

/**
 * Put on the element that actually scrolls (result detail scrolls its own column, not the
 * document) to fold the topbar and the bottom bar away while the user reads downwards.
 *
 * Reads are coalesced into one animation frame: `scrollTop` is a layout read, and doing it on
 * every raw scroll event is what makes this pattern janky.
 */
@Directive({
  selector: '[appHideChromeOnScroll]',
  standalone: true
})
export class HideChromeOnScrollDirective implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly chromeSE = inject(ScrollChromeService);
  private queued = false;

  @HostListener('scroll')
  onScroll(): void {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      this.chromeSE.track(this.host.nativeElement.scrollTop);
    });
  }

  ngOnDestroy(): void {
    this.chromeSE.reset();
  }
}
