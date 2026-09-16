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
      const top = this.host.nativeElement.scrollTop;
      if (this.dropdownOpen()) {
        this.chromeSE.rebaseline(top);
        return;
      }
      this.chromeSE.track(top);
    });
  }

  /**
   * 🛑 With a dropdown open the chrome stays exactly as it is (Cami, 16-sep-2026). The `custom_select`
   * lists open on `:focus-within`, so ticking a checkbox moves focus and the browser scrolls it into
   * view; that scroll folded or unfolded the topbar, the form jumped ~175px under the pointer and the
   * next click landed on another partner — picking several External partners in a row was a fight.
   * Folding is for reading, not for choosing from a list.
   */
  private dropdownOpen(): boolean {
    const active = document.activeElement;
    return !!active && this.host.nativeElement.contains(active) && !!active.closest('.custom_select');
  }

  ngOnDestroy(): void {
    this.chromeSE.reset();
  }
}
