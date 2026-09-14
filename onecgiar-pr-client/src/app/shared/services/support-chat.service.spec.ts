import { TestBed } from '@angular/core/testing';

import { SupportChatService } from './support-chat.service';

/**
 * The widget is a third-party global that may be absent (anonymous users, local, a script that
 * failed to load), so every branch here is about NOT throwing at the caller.
 */
describe('SupportChatService', () => {
  let service: SupportChatService;

  const setTawk = (api: unknown): void => {
    (window as unknown as { Tawk_API?: unknown }).Tawk_API = api;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SupportChatService);
  });

  afterEach(() => {
    delete (window as unknown as { Tawk_API?: unknown }).Tawk_API;
  });

  it('reports unavailable and refuses to open when the embed never loaded', () => {
    expect(service.available).toBe(false);
    expect(service.open()).toBe(false);
  });

  it('reports unavailable when the global is there but half-built', () => {
    // Tawk defines `Tawk_API` as an empty object BEFORE the script loads, so the property
    // existing is not the same as the widget being usable.
    setTawk({});

    expect(service.available).toBe(false);
    expect(service.open()).toBe(false);
  });

  it('shows the launcher before maximising, in that order', () => {
    const calls: string[] = [];
    setTawk({
      showWidget: () => calls.push('showWidget'),
      maximize: () => calls.push('maximize')
    });

    expect(service.available).toBe(true);
    expect(service.open()).toBe(true);
    // The bubble is hidden by TawkComponent, and some sessions cannot reopen a chat that was
    // maximised while the launcher was still hidden.
    expect(calls).toEqual(['showWidget', 'maximize']);
  });

  it('still opens when the build has no showWidget', () => {
    const maximize = jest.fn();
    setTawk({ maximize });

    expect(service.open()).toBe(true);
    expect(maximize).toHaveBeenCalledTimes(1);
  });

  it('reports failure instead of throwing when the widget blows up', () => {
    setTawk({
      maximize: () => {
        throw new Error('embed not ready');
      }
    });

    expect(() => service.open()).not.toThrow();
    expect(service.open()).toBe(false);
  });
});
