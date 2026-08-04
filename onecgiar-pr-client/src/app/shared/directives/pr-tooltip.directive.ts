import { Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2 } from '@angular/core';

/**
 * Lightweight guidance tooltip, introduced by P2-3201 (INC-158283).
 *
 * Mounts a positioned tooltip on `document.body` on hover (so it is never clipped by an
 * ancestor's `overflow: hidden`) and removes it on leave/destroy. Content is rendered as HTML,
 * because the guidance it carries is authored as `<ul>` / `<strong>` / `<a>` markup.
 *
 * Why not PrimeNG's `pTooltip`: the ticket requires the tooltip to stay **pinned on click** and
 * dismiss on outside-click or Escape, so the guidance that used to sit in an always-visible grey
 * box stays readable — and so the links inside it (CGIAR 2030 Strategy, CLARISA Glossary) remain
 * clickable. `pTooltip` is hover-only and offers no pinning.
 *
 * Import `PrTooltipDirectiveModule` (re-exported by `CustomFieldsModule`) and use `[appPrTooltip]`.
 */
@Directive({
  selector: '[appPrTooltip]',
  standalone: false
})
export class PrTooltipDirective implements OnDestroy {
  @Input('appPrTooltip') text: string = '';
  @Input() appPrTooltipPosition: 'right' | 'left' | 'top' | 'bottom' = 'top';
  @Input() appPrTooltipStyleClass: string = '';
  /** When true, the tooltip never shows (mirrors PrimeNG `tooltipDisabled`). */
  @Input() appPrTooltipDisabled: boolean = false;
  /** Delay in ms before the tooltip appears on hover (mirrors PrimeNG `showDelay`). */
  @Input() appPrTooltipShowDelay: number = 0;
  /**
   * P2-3201: opt-in "pinnable" behaviour for guidance tooltips.
   *
   * Default (`false`) keeps the historical contract used by ~40 templates: click hides.
   * When `true`, click pins the tooltip open and it stays until the user clicks outside
   * it or presses Escape — required because guidance tooltips carry links (e.g. the
   * CLARISA Glossary) that a hover-only tooltip makes unreachable.
   */
  @Input() appPrTooltipPinnable: boolean = false;

  private tooltipEl: HTMLElement | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private pinned = false;
  /** Teardown callbacks for the document listeners registered while pinned. */
  private pinnedListeners: (() => void)[] = [];

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {}

  @HostListener('mouseenter')
  onEnter(): void {
    if (this.appPrTooltipDisabled || !this.text || this.pinned) return;
    if (this.appPrTooltipShowDelay > 0) {
      this.clearTimer();
      this.showTimer = setTimeout(() => this.show(), this.appPrTooltipShowDelay);
    } else {
      this.show();
    }
  }

  @HostListener('mouseleave')
  onLeave(): void {
    // A pinned tooltip survives the pointer leaving — that is the point of pinning.
    if (this.pinned) return;
    this.hide();
  }

  @HostListener('click')
  onClick(): void {
    if (!this.appPrTooltipPinnable) {
      // Hide on click so it doesn't linger over the action just taken.
      this.hide();
      return;
    }
    if (this.pinned) {
      this.hide();
      return;
    }
    this.clearTimer();
    this.show();
    // Only pin if the tooltip actually rendered (disabled / empty text short-circuit `show`).
    if (this.tooltipEl) this.pin();
  }

  private show(): void {
    if (this.tooltipEl || this.appPrTooltipDisabled || !this.text) return;

    const el = this.renderer.createElement('div') as HTMLElement;
    this.renderer.addClass(el, 'pr-tooltip');
    if (this.appPrTooltipStyleClass) {
      this.appPrTooltipStyleClass.split(' ').forEach(cls => cls && this.renderer.addClass(el, cls));
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

    switch (this.appPrTooltipPosition) {
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

  /**
   * Keeps the tooltip open and starts listening for the two dismiss gestures.
   * Clicks landing inside the tooltip (its links) or back on the trigger are ignored —
   * the trigger's own `click` handler already toggles it.
   */
  private pin(): void {
    this.pinned = true;
    // The base .pr-tooltip sets `pointer-events: none` so a hover tooltip never blocks the cursor.
    // A pinned one must accept the pointer, otherwise its own links (e.g. the CGIAR 2030 Strategy
    // link in the Impact Area guidance) are unreachable — which defeats the purpose of pinning.
    if (this.tooltipEl) {
      this.renderer.addClass(this.tooltipEl, 'pr-tooltip--pinned');
      // Tell the user how to dismiss it — a pinned tooltip that stays put looks stuck otherwise.
      // Requested by Santiago (Slack, 4 Aug) and shown in his mockup.
      const hint = this.renderer.createElement('div') as HTMLElement;
      this.renderer.addClass(hint, 'pr-tooltip__hint');
      this.renderer.setProperty(hint, 'textContent', 'Click outside to close');
      this.renderer.appendChild(this.tooltipEl, hint);
    }
    this.pinnedListeners.push(
      this.renderer.listen('document', 'click', (event: Event) => {
        const target = event.target as Node | null;
        if (!target) return;
        if (this.tooltipEl?.contains(target)) return;
        if (this.host.nativeElement.contains(target)) return;
        this.hide();
      }),
      this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape') this.hide();
      })
    );
  }

  private clearTimer(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private clearPinnedListeners(): void {
    this.pinnedListeners.forEach(unlisten => unlisten());
    this.pinnedListeners = [];
    this.pinned = false;
  }

  private hide(): void {
    this.clearTimer();
    this.clearPinnedListeners();
    if (this.tooltipEl) {
      // Guard: the node may already have been detached from outside (route change,
      // a parent wiping innerHTML). `removeChild` on an orphan throws NotFoundError.
      if (this.tooltipEl.parentNode) this.renderer.removeChild(this.tooltipEl.parentNode, this.tooltipEl);
      this.tooltipEl = null;
    }
  }

  ngOnDestroy(): void {
    this.hide();
  }
}
