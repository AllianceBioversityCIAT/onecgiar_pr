import { ElementRef, Renderer2 } from '@angular/core';
import { PrTooltipDirective } from './pr-tooltip.directive';

/** Minimal Renderer2 that performs the real DOM operations the directive needs. */
function fakeRenderer(): Renderer2 {
  return {
    createElement: (name: string) => document.createElement(name),
    addClass: (el: HTMLElement, cls: string) => el.classList.add(cls),
    setProperty: (el: any, name: string, value: any) => (el[name] = value),
    appendChild: (parent: Node, child: Node) => parent.appendChild(child),
    removeChild: (parent: Node, child: Node) => parent.removeChild(child),
    setStyle: (el: HTMLElement, style: string, value: string) => el.style.setProperty(style, value),
    listen: (target: 'document' | Node, event: string, handler: (e: Event) => void) => {
      const node = target === 'document' ? document : (target as Node);
      node.addEventListener(event, handler as EventListener);
      return () => node.removeEventListener(event, handler as EventListener);
    }
  } as unknown as Renderer2;
}

function makeHost(rect: Partial<DOMRect> = {}): HTMLElement {
  const host = document.createElement('button');
  const full = { top: 100, left: 100, right: 200, bottom: 140, width: 100, height: 40, x: 100, y: 100, ...rect };
  host.getBoundingClientRect = () => full as DOMRect;
  return host;
}

function tooltipEl(): HTMLElement | null {
  return document.body.querySelector('.pr-tooltip');
}

describe('PrTooltipDirective', () => {
  let directive: PrTooltipDirective;
  let host: HTMLElement;

  function build(rect?: Partial<DOMRect>): PrTooltipDirective {
    host = makeHost(rect);
    return new PrTooltipDirective(new ElementRef(host), fakeRenderer());
  }

  beforeEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
    directive = build();
    directive.text = 'Hello';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is created with the documented defaults', () => {
    const fresh = build();
    expect(fresh.text).toBe('');
    expect(fresh.appPrTooltipPosition).toBe('top');
    expect(fresh.appPrTooltipStyleClass).toBe('');
    expect(fresh.appPrTooltipDisabled).toBe(false);
    expect(fresh.appPrTooltipShowDelay).toBe(0);
  });

  describe('onEnter', () => {
    it('shows immediately when there is no delay', () => {
      directive.onEnter();
      expect(tooltipEl()).not.toBeNull();
      expect(tooltipEl()!.innerHTML).toBe('Hello');
    });

    it('does nothing when disabled', () => {
      directive.appPrTooltipDisabled = true;
      directive.onEnter();
      expect(tooltipEl()).toBeNull();
    });

    it('does nothing when the text is empty', () => {
      directive.text = '';
      directive.onEnter();
      expect(tooltipEl()).toBeNull();
    });

    it('defers the tooltip when a show delay is configured', () => {
      jest.useFakeTimers();
      directive.appPrTooltipShowDelay = 300;
      directive.onEnter();
      expect(tooltipEl()).toBeNull();
      jest.advanceTimersByTime(300);
      expect(tooltipEl()).not.toBeNull();
    });

    it('clears a pending timer when hovered twice', () => {
      jest.useFakeTimers();
      directive.appPrTooltipShowDelay = 300;
      directive.onEnter();
      directive.onEnter();
      jest.advanceTimersByTime(300);
      expect(document.body.querySelectorAll('.pr-tooltip')).toHaveLength(1);
    });

    it('does not create a second tooltip when already shown', () => {
      directive.onEnter();
      directive.onEnter();
      expect(document.body.querySelectorAll('.pr-tooltip')).toHaveLength(1);
    });
  });

  describe('style classes', () => {
    it('applies every non-empty extra class', () => {
      directive.appPrTooltipStyleClass = 'wide  danger';
      directive.onEnter();
      const el = tooltipEl()!;
      expect(el.classList.contains('wide')).toBe(true);
      expect(el.classList.contains('danger')).toBe(true);
    });

    it('adds only the base class when no extra class is given', () => {
      directive.onEnter();
      expect(tooltipEl()!.className).toBe('pr-tooltip');
    });

    it('renders the text as HTML', () => {
      directive.text = '<b>bold</b>';
      directive.onEnter();
      expect(tooltipEl()!.innerHTML).toBe('<b>bold</b>');
    });
  });

  describe('position', () => {
    const positions: Array<PrTooltipDirective['appPrTooltipPosition']> = ['top', 'bottom', 'left', 'right'];

    positions.forEach(position => {
      it(`positions the tooltip for "${position}"`, () => {
        directive.appPrTooltipPosition = position;
        directive.onEnter();
        const el = tooltipEl()!;
        expect(el.style.top).toMatch(/px$/);
        expect(el.style.left).toMatch(/px$/);
      });
    });

    it('falls back to the top branch for an unknown position', () => {
      directive.appPrTooltipPosition = 'diagonal' as any;
      directive.onEnter();
      // rect.top (100) - tip.height (0) - gap (8)
      expect(tooltipEl()!.style.top).toBe('92px');
    });

    it('clamps the tooltip to the left edge of the viewport', () => {
      directive = build({ left: -500, right: -400, top: 10, bottom: 40, width: 100, height: 30 });
      directive.text = 'Edge';
      directive.appPrTooltipPosition = 'left';
      directive.onEnter();
      expect(tooltipEl()!.style.left).toBe('8px');
    });

    it('clamps the tooltip to the right edge of the viewport', () => {
      directive = build({ left: 99999, right: 100099, top: 10, bottom: 40, width: 100, height: 30 });
      directive.text = 'Edge';
      directive.appPrTooltipPosition = 'right';
      directive.onEnter();
      expect(tooltipEl()!.style.left).toBe(`${window.innerWidth - 8}px`);
    });
  });

  describe('hide', () => {
    it('removes the tooltip on mouse leave', () => {
      directive.onEnter();
      directive.onLeave();
      expect(tooltipEl()).toBeNull();
    });

    it('removes the tooltip on click', () => {
      directive.onEnter();
      directive.onClick();
      expect(tooltipEl()).toBeNull();
    });

    it('is a no-op when there is nothing shown', () => {
      expect(() => directive.onLeave()).not.toThrow();
      expect(tooltipEl()).toBeNull();
    });

    it('cancels a pending delayed tooltip', () => {
      jest.useFakeTimers();
      directive.appPrTooltipShowDelay = 300;
      directive.onEnter();
      directive.onLeave();
      jest.advanceTimersByTime(300);
      expect(tooltipEl()).toBeNull();
    });

    it('cleans up on destroy', () => {
      directive.onEnter();
      directive.ngOnDestroy();
      expect(tooltipEl()).toBeNull();
    });

    it('destroy without a visible tooltip does not throw', () => {
      expect(() => directive.ngOnDestroy()).not.toThrow();
    });
  });

  describe('show guards', () => {
    it('ignores a delayed show that fires after the directive got disabled', () => {
      jest.useFakeTimers();
      directive.appPrTooltipShowDelay = 100;
      directive.onEnter();
      directive.appPrTooltipDisabled = true;
      jest.advanceTimersByTime(100);
      expect(tooltipEl()).toBeNull();
    });

    it('ignores a delayed show that fires after the text was cleared', () => {
      jest.useFakeTimers();
      directive.appPrTooltipShowDelay = 100;
      directive.onEnter();
      directive.text = '';
      jest.advanceTimersByTime(100);
      expect(tooltipEl()).toBeNull();
    });
  });

  // P2-3201: guidance tooltips opt into pinning so their links stay reachable.
  describe('pinnable (P2-3201)', () => {
    beforeEach(() => {
      directive.appPrTooltipPinnable = true;
      document.body.appendChild(host);
    });

    // Pinned tooltips register document listeners — drop them so they cannot leak
    // into the next test through `document`, which `body.innerHTML = ''` does not clear.
    afterEach(() => directive.ngOnDestroy());

    it('still opens on hover and closes on leave while unpinned', () => {
      directive.onEnter();
      expect(tooltipEl()).not.toBeNull();
      directive.onLeave();
      expect(tooltipEl()).toBeNull();
    });

    it('pins the tooltip open on click', () => {
      directive.onClick();
      expect(tooltipEl()).not.toBeNull();
      directive.onLeave();
      expect(tooltipEl()).not.toBeNull();
    });

    it('closes a pinned tooltip when Escape is pressed', () => {
      directive.onClick();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(tooltipEl()).toBeNull();
    });

    it('ignores other keys while pinned', () => {
      directive.onClick();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(tooltipEl()).not.toBeNull();
    });

    it('closes a pinned tooltip on an outside click', () => {
      directive.onClick();
      const outside = document.createElement('div');
      document.body.appendChild(outside);
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(tooltipEl()).toBeNull();
    });

    it('does NOT close when the click lands inside the tooltip (its links stay usable)', () => {
      directive.text = 'See the <a href="https://example.org">Glossary</a>';
      directive.onClick();
      const link = tooltipEl()?.querySelector('a') as HTMLElement;
      expect(link).toBeTruthy();
      link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(tooltipEl()).not.toBeNull();
    });

    it('does not close when the click bubbles from the trigger itself', () => {
      directive.onClick();
      host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(tooltipEl()).not.toBeNull();
    });

    it('a second click on the trigger unpins and hides it', () => {
      directive.onClick();
      directive.onClick();
      expect(tooltipEl()).toBeNull();
    });

    it('hover does not re-create a tooltip while pinned', () => {
      directive.onClick();
      directive.onEnter();
      expect(document.body.querySelectorAll('.pr-tooltip')).toHaveLength(1);
    });

    it('removes the document listeners on destroy while pinned', () => {
      directive.onClick();
      directive.ngOnDestroy();
      expect(tooltipEl()).toBeNull();
      // A stale listener would throw or re-hide; dispatching after destroy must be inert.
      expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))).not.toThrow();
    });

    it('shows the dismiss hint only while pinned', () => {
      directive.onEnter();
      expect(tooltipEl()?.querySelector('.pr-tooltip__hint')).toBeNull();
      directive.onLeave();

      directive.onClick();
      const hint = tooltipEl()?.querySelector('.pr-tooltip__hint');
      expect(hint).not.toBeNull();
      expect(hint?.textContent).toBe('Click outside to close');
    });

    it('clicking the dismiss hint does not close the tooltip (it is inside)', () => {
      directive.onClick();
      const hint = tooltipEl()?.querySelector('.pr-tooltip__hint') as HTMLElement;
      hint.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(tooltipEl()).not.toBeNull();
    });

    it('does not pin when the tooltip is disabled', () => {
      directive.appPrTooltipDisabled = true;
      directive.onClick();
      expect(tooltipEl()).toBeNull();
    });
  });

  describe('non-pinnable keeps the historical contract', () => {
    it('click hides the tooltip when pinning is not opted into', () => {
      directive.onEnter();
      expect(tooltipEl()).not.toBeNull();
      directive.onClick();
      expect(tooltipEl()).toBeNull();
    });
  });
});
