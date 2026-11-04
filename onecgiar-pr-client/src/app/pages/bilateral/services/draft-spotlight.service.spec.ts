// @akili-spec bilateral/ai-draft-spotlight (ADS-T-2, ADS-D4, XSS)
import { TestBed } from '@angular/core/testing';

jest.mock('driver.js', () => ({ driver: jest.fn() }));

import { driver } from 'driver.js';
import { DraftSpotlightService } from './draft-spotlight.service';

const driverMock = driver as unknown as jest.Mock;

interface FakeInstance {
  highlight: jest.Mock;
  destroy: jest.Mock;
  refresh: jest.Mock;
  config: any;
}

let instances: FakeInstance[] = [];
let callOrder: string[] = [];

describe('DraftSpotlightService', () => {
  let service: DraftSpotlightService;
  let card: HTMLElement;
  let container: HTMLElement;
  let onDismiss: jest.Mock;

  const options = (overrides: Partial<{ title: string; description: string; buttonText: string }> = {}) => ({
    title: '3 new drafts from Project X',
    description: 'Open each one with <strong>Review</strong>.',
    buttonText: 'Got it',
    onDismiss,
    ...overrides
  });

  const popover = (i = instances.length - 1) => instances[i].highlight.mock.calls[0][0].popover;

  beforeEach(() => {
    instances = [];
    callOrder = [];
    driverMock.mockReset();
    driverMock.mockImplementation((config: any) => {
      const index = instances.length;
      const instance: FakeInstance = {
        highlight: jest.fn(),
        destroy: jest.fn(() => callOrder.push(`destroy:${index}`)),
        refresh: jest.fn(),
        config
      };
      instances.push(instance);
      callOrder.push(`driver:${index}`);
      return instance;
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(DraftSpotlightService);
    card = document.createElement('div');
    container = document.createElement('div');
    container.appendChild(card);
    document.body.appendChild(container);
    onDismiss = jest.fn();
  });

  afterEach(() => {
    container.remove();
  });

  it('1. puts the Got it button in the step popover (not the driver config) and uses the pr-guide look', () => {
    service.show(card, container, options());

    expect(instances[0].config).toEqual(expect.objectContaining({ animate: false, popoverClass: 'pr-guide', allowClose: true }));
    expect(instances[0].highlight).toHaveBeenCalledTimes(1);
    const step = instances[0].highlight.mock.calls[0][0];
    expect(step.element).toBe(card);
    expect(step.popover.showButtons).toEqual(['next']);
    expect(step.popover.nextBtnText).toBe('Got it');
    expect(typeof step.popover.onNextClick).toBe('function');
    expect(service.isActive()).toBe(true);
    expect(service.active()).toBe(true);
  });

  it('2. Got it then Esc/overlay right after show destroys and dismisses exactly once (never via onDestroyed)', () => {
    service.show(card, container, options());

    popover().onNextClick();
    instances[0].config.onDestroyStarted();

    expect(instances[0].destroy).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(service.isActive()).toBe(false);
    expect(instances[0].config.onDestroyed).toBeUndefined();
  });

  it('2b. Esc or overlay alone (onDestroyStarted) dismisses once', () => {
    service.show(card, container, options());

    instances[0].config.onDestroyStarted();

    expect(instances[0].destroy).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('3. close(programmatic) destroys without calling onDismiss', () => {
    service.show(card, container, options());

    service.close('programmatic');

    expect(instances[0].destroy).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(service.isActive()).toBe(false);
  });

  it('3b. close with nothing active is a no-op', () => {
    expect(() => service.close('dismiss')).not.toThrow();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('4. show while active destroys the previous instance before the new one is created', () => {
    service.show(card, container, options());
    service.show(card, container, options());

    expect(instances).toHaveLength(2);
    expect(callOrder).toEqual(['driver:0', 'destroy:0', 'driver:1']);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('5. a container scroll refreshes the cut-out while active, and stops after close', () => {
    service.show(card, container, options());

    container.dispatchEvent(new Event('scroll'));
    expect(instances[0].refresh).toHaveBeenCalledTimes(1);

    service.close('programmatic');
    container.dispatchEvent(new Event('scroll'));
    expect(instances[0].refresh).toHaveBeenCalledTimes(1);
  });

  it('5b. refresh() only reaches driver while active', () => {
    service.refresh();
    service.show(card, container, options());
    service.refresh();
    service.close('dismiss');
    service.refresh();

    expect(instances[0].refresh).toHaveBeenCalledTimes(1);
  });

  it('5c. a null container still shows (no scroll listener)', () => {
    expect(() => service.show(card, null, options())).not.toThrow();
    expect(service.isActive()).toBe(true);
  });

  it('6. escapes an HTML label so driver.js innerHTML renders it as text', () => {
    service.show(card, container, options({ title: '1 new draft from <img src=x onerror=alert(1)>' }));

    const title: string = popover().title;
    expect(title).toContain('&lt;img');
    expect(title).not.toContain('<img');
    expect(title).toContain('1 new draft from');
  });

  it('6b. escapes & < > " \' in the title and button text, and leaves the static description markup', () => {
    service.show(card, container, options({ title: `A&B <b> "q" 'p'`, buttonText: '<i>ok</i>' }));

    expect(popover().title).toBe('A&amp;B &lt;b&gt; &quot;q&quot; &#39;p&#39;');
    expect(popover().nextBtnText).toBe('&lt;i&gt;ok&lt;/i&gt;');
    expect(popover().description).toBe('Open each one with <strong>Review</strong>.');
  });
  // @akili-spec bilateral/ai-draft-spotlight (ADS-T-4, DD-10, NFR-3)
  describe('ADS-T-4 pivot fixes', () => {
    let chrome: HTMLElement;

    beforeEach(() => {
      chrome = document.createElement('div');
      chrome.className = 'app-shell-header';
      chrome.getBoundingClientRect = () => ({ top: 0, bottom: 120, height: 120, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      document.body.appendChild(chrome);
    });

    afterEach(() => chrome.remove());

    it('T4-1. the driver config uses the same overlay colour as the guided tour', () => {
      service.show(card, container, options());

      expect(instances[0].config.overlayColor).toBe('#1e202f');
    });

    it('T4-2. scroll-margin-top is chrome height + 8 px BEFORE highlight() scrolls the card', () => {
      let marginAtHighlight: string | null = null;
      driverMock.mockImplementationOnce((config: any) => {
        const instance: FakeInstance = {
          highlight: jest.fn(() => {
            marginAtHighlight = card.style.scrollMarginTop;
          }),
          destroy: jest.fn(),
          refresh: jest.fn(),
          config
        };
        instances.push(instance);
        return instance;
      });

      service.show(card, container, options());

      expect(marginAtHighlight).toBe('128px');
    });

    it.each([['dismiss' as const], ['programmatic' as const]])('T4-3. close(%s) restores an empty previous inline margin', reason => {
      service.show(card, container, options());
      expect(card.style.scrollMarginTop).toBe('128px');

      service.close(reason);

      expect(card.style.scrollMarginTop).toBe('');
    });

    it.each([['dismiss' as const], ['programmatic' as const]])('T4-3b. close(%s) restores a pre-set inline margin', reason => {
      card.style.scrollMarginTop = '24px';
      service.show(card, container, options());
      expect(card.style.scrollMarginTop).toBe('128px');

      service.close(reason);

      expect(card.style.scrollMarginTop).toBe('24px');
    });
  });
});
