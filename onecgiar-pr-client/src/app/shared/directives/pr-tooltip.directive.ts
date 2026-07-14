import { Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2 } from '@angular/core';

/**
 * Lightweight app-wide tooltip (PrimeNG `pTooltip` replacement — 0 PrimeNG, no brain directives).
 *
 * Mounts a positioned tooltip on `document.body` on hover (so it is never clipped by an
 * ancestor's `overflow: hidden`) and removes it on leave/destroy. Content is rendered as
 * HTML (covers the old `[escape]="false"` usages). Mirrors the `pTooltip` options actually
 * used in the app: text, position, style class, disabled, show delay.
 *
 * Promoted from `custom-fields/pr-button` into `shared/directives` so any module can import
 * `PrTooltipDirectiveModule` and use `[prTooltip]`.
 */
@Directive({
  selector: '[prTooltip]',
  standalone: false
})
export class PrTooltipDirective implements OnDestroy {
  @Input('prTooltip') text: string = '';
  @Input() prTooltipPosition: 'right' | 'left' | 'top' | 'bottom' = 'top';
  @Input() prTooltipStyleClass: string = '';
  /** When true, the tooltip never shows (mirrors PrimeNG `tooltipDisabled`). */
  @Input() prTooltipDisabled: boolean = false;
  /** Delay in ms before the tooltip appears on hover (mirrors PrimeNG `showDelay`). */
  @Input() prTooltipShowDelay: number = 0;

  private tooltipEl: HTMLElement | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {}

  @HostListener('mouseenter')
  onEnter(): void {
    if (this.prTooltipDisabled || !this.text) return;
    if (this.prTooltipShowDelay > 0) {
      this.clearTimer();
      this.showTimer = setTimeout(() => this.show(), this.prTooltipShowDelay);
    } else {
      this.show();
    }
  }

  @HostListener('mouseleave')
  onLeave(): void {
    this.hide();
  }

  @HostListener('click')
  onClick(): void {
    // Hide on click so it doesn't linger over the action just taken.
    this.hide();
  }

  private show(): void {
    if (this.tooltipEl || this.prTooltipDisabled || !this.text) return;

    const el = this.renderer.createElement('div') as HTMLElement;
    this.renderer.addClass(el, 'pr-tooltip');
    if (this.prTooltipStyleClass) {
      this.prTooltipStyleClass.split(' ').forEach(cls => cls && this.renderer.addClass(el, cls));
    }
    this.renderer.setProperty(el, 'innerHTML', this.text);
    this.renderer.appendChild(document.body, el);
    this.tooltipEl = el;

    this.position(el);
  }

  private position(el: HTMLElement): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const tip = el.getBoundingClientRect();
    const gap = 8;
    let top = 0;
    let left = 0;

    switch (this.prTooltipPosition) {
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tip.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tip.height / 2;
        left = rect.left - tip.width - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tip.height / 2;
        left = rect.right + gap;
        break;
      case 'top':
      default:
        top = rect.top - tip.height - gap;
        left = rect.left + rect.width / 2 - tip.width / 2;
        break;
    }

    // Keep inside the viewport horizontally.
    left = Math.max(gap, Math.min(left, window.innerWidth - tip.width - gap));

    this.renderer.setStyle(el, 'top', `${top + window.scrollY}px`);
    this.renderer.setStyle(el, 'left', `${left + window.scrollX}px`);
  }

  private clearTimer(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private hide(): void {
    this.clearTimer();
    if (this.tooltipEl) {
      this.renderer.removeChild(document.body, this.tooltipEl);
      this.tooltipEl = null;
    }
  }

  ngOnDestroy(): void {
    this.hide();
  }
}
