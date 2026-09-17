import { shouldOpenUpward } from './dropdown-placement';

describe('shouldOpenUpward (P2-3737)', () => {
  let scroller: HTMLDivElement;
  let trigger: HTMLDivElement;
  let panel: HTMLDivElement;

  const rect = (top: number, bottom: number) =>
    ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

  /** Viewport 800 high; scroller fills it with an 88px bottom reserve for the floating bar. */
  const layout = (fieldTop: number, panelHeight: number, withScroller = true) => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    scroller.style.overflowY = withScroller ? 'auto' : 'visible';
    scroller.style.paddingBottom = '88px';
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: withScroller ? 3000 : 800 });
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 800 });
    scroller.getBoundingClientRect = () => rect(0, 800);
    trigger.getBoundingClientRect = () => rect(fieldTop, fieldTop + 40);
    Object.defineProperty(panel, 'offsetHeight', { configurable: true, value: panelHeight });
  };

  beforeEach(() => {
    scroller = document.createElement('div');
    trigger = document.createElement('div');
    panel = document.createElement('div');
    trigger.appendChild(panel);
    scroller.appendChild(trigger);
    document.body.appendChild(scroller);
  });

  afterEach(() => scroller.remove());

  it('opens downwards when the panel fits below the field', () => {
    layout(100, 300);
    expect(shouldOpenUpward(trigger, panel)).toBe(false);
  });

  it('opens upwards when the panel would run under the floating bottom bar', () => {
    // Field ends at 640; the visible form ends at 800 - 88 = 712 → 64px below, 300 needed.
    layout(600, 300);
    expect(shouldOpenUpward(trigger, panel)).toBe(true);
  });

  it('counts the bar reserve: a panel that fits the window but not above the bar still flips', () => {
    // 140px to the window edge would fit a 120px panel; 52px above the bar does not.
    layout(620, 120);
    expect(shouldOpenUpward(trigger, panel)).toBe(true);
  });

  it('keeps opening downwards when there is even less room above', () => {
    layout(30, 900);
    expect(shouldOpenUpward(trigger, panel)).toBe(false);
  });

  it('keeps opening downwards when the panel would be cut at the top instead', () => {
    // 60px below, but only 200px above for a 300px panel: flipping would hide the search box.
    layout(208, 300);
    expect(shouldOpenUpward(trigger, panel)).toBe(false);
  });

  it('falls back to the window when no ancestor scrolls', () => {
    layout(700, 300, false);
    expect(shouldOpenUpward(trigger, panel)).toBe(true);
  });

  it('does nothing for a panel that is not rendered', () => {
    layout(600, 0);
    expect(shouldOpenUpward(trigger, panel)).toBe(false);
  });
});
