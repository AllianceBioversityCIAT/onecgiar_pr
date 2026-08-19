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
    // P2-3201: pinning registers document listeners; mirror Renderer2's "returns an unlisten fn" contract.
    listen: (target: 'document' | Node, event: string, handler: (e: any) => void) => {
      const node: any = target === 'document' ? document : target;
      node.addEventListener(event, handler);
      return () => node.removeEventListener(event, handler);
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
    expect(fresh.prTooltipPosition).toBe('top');
    expect(fresh.prTooltipStyleClass).toBe('');
    expect(fresh.prTooltipDisabled).toBe(false);
    expect(fresh.prTooltipShowDelay).toBe(0);
    expect(fresh.prTooltipPinnable).toBe(false);
  });

  describe('onEnter', () => {
    it('shows immediately when there is no delay', () => {
      directive.onEnter();
      expect(tooltipEl()).not.toBeNull();
      expect(tooltipEl()!.innerHTML).toBe('Hello');
    });

    it('does nothing when disabled', () => {
      directive.prTooltipDisabled = true;
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
      directive.prTooltipShowDelay = 300;
      directive.onEnter();
      expect(tooltipEl()).toBeNull();
      jest.advanceTimersByTime(300);
      expect(tooltipEl()).not.toBeNull();
    });

    it('clears a pending timer when hovered twice', () => {
      jest.useFakeTimers();
      directive.prTooltipShowDelay = 300;
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
      directive.prTooltipStyleClass = 'wide  danger';
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
    const positions: Array<PrTooltipDirective['prTooltipPosition']> = ['top', 'bottom', 'left', 'right'];

    positions.forEach(position => {
      it(`positions the tooltip for "${position}"`, () => {
        directive.prTooltipPosition = position;
        directive.onEnter();
        const el = tooltipEl()!;
        expect(el.style.top).toMatch(/px$/);
        expect(el.style.left).toMatch(/px$/);
      });
    });

    it('falls back to the top branch for an unknown position', () => {
      directive.prTooltipPosition = 'diagonal' as any;
      directive.onEnter();
      // rect.top (100) - tip.height (0) - gap (8)
      expect(tooltipEl()!.style.top).toBe('92px');
    });

    it('clamps the tooltip to the left edge of the viewport', () => {
      directive = build({ left: -500, right: -400, top: 10, bottom: 40, width: 100, height: 30 });
      directive.text = 'Edge';
      directive.prTooltipPosition = 'left';
      directive.onEnter();
      expect(tooltipEl()!.style.left).toBe('8px');
    });

    it('clamps the tooltip to the right edge of the viewport', () => {
      directive = build({ left: 99999, right: 100099, top: 10, bottom: 40, width: 100, height: 30 });
      directive.text = 'Edge';
      directive.prTooltipPosition = 'right';
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
      directive.prTooltipShowDelay = 300;
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

  /**
   * P2-3201 (INC-158283): guidance tooltips carry links and long scrollable text, so they must
   * survive the pointer leaving. Opt-in — the ~40 existing hover-only triggers keep click-hides.
   */
  describe('pinnable', () => {
    beforeEach(() => {
      directive.prTooltipPinnable = true;
    });

    it('pins on click and keeps the tooltip after the pointer leaves', () => {
      directive.onEnter();
      directive.onClick();
      directive.onLeave();
      expect(tooltipEl()).not.toBeNull();
    });

    it('marks the pinned tooltip so it can accept the pointer', () => {
      directive.onClick();
      expect(tooltipEl()!.classList.contains('pr-tooltip--pinned')).toBe(true);
    });

    it('shows the tooltip when clicked without a previous hover', () => {
      directive.onClick();
      expect(tooltipEl()).not.toBeNull();
    });

    it('unpins on a second click', () => {
      directive.onClick();
      directive.onClick();
      expect(tooltipEl()).toBeNull();
    });

    it('ignores hover while pinned so no second tooltip is created', () => {
      directive.onClick();
      directive.onEnter();
      expect(document.body.querySelectorAll('.pr-tooltip')).toHaveLength(1);
    });

    it('closes on a click outside the tooltip and outside the trigger', () => {
      directive.onClick();
      const outside = document.createElement('div');
      document.body.appendChild(outside);
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(tooltipEl()).toBeNull();
    });

    it('stays open when the click lands inside the tooltip, so its links stay usable', () => {
      directive.text = '<a href="#">Glossary</a>';
      directive.onClick();
      const link = tooltipEl()!.querySelector('a')!;
      link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(tooltipEl()).not.toBeNull();
    });

    it('stays open when the click lands back on the trigger (the host toggles it itself)', () => {
      document.body.appendChild(host);
      directive.onClick();
      host.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(tooltipEl()).not.toBeNull();
    });

    it('closes on Escape', () => {
      directive.onClick();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(tooltipEl()).toBeNull();
    });

    it('ignores other keys', () => {
      directive.onClick();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(tooltipEl()).not.toBeNull();
    });

    it('stops listening once dismissed, so a later Escape cannot throw', () => {
      directive.onClick();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))).not.toThrow();
    });

    it('does not pin when the tooltip never rendered (disabled trigger)', () => {
      directive.prTooltipDisabled = true;
      directive.onClick();
      expect(tooltipEl()).toBeNull();
      // Not pinned → a later enable + hover + leave behaves like a plain hover tooltip.
      directive.prTooltipDisabled = false;
      directive.onEnter();
      directive.onLeave();
      expect(tooltipEl()).toBeNull();
    });

    it('cleans up a pinned tooltip on destroy', () => {
      directive.onClick();
      directive.ngOnDestroy();
      expect(tooltipEl()).toBeNull();
    });
  });

  describe('show guards', () => {
    it('ignores a delayed show that fires after the directive got disabled', () => {
      jest.useFakeTimers();
      directive.prTooltipShowDelay = 100;
      directive.onEnter();
      directive.prTooltipDisabled = true;
      jest.advanceTimersByTime(100);
      expect(tooltipEl()).toBeNull();
    });

    it('ignores a delayed show that fires after the text was cleared', () => {
      jest.useFakeTimers();
      directive.prTooltipShowDelay = 100;
      directive.onEnter();
      directive.text = '';
      jest.advanceTimersByTime(100);
      expect(tooltipEl()).toBeNull();
    });
  });
});
