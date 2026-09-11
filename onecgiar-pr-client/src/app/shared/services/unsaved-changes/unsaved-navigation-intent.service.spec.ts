import { UnsavedNavigationIntentService } from './unsaved-navigation-intent.service';

describe('UnsavedNavigationIntentService', () => {
  let service: UnsavedNavigationIntentService;

  beforeEach(() => {
    service = new UnsavedNavigationIntentService();
  });

  it('consumeSilent() returns false when markSilent() was never called', () => {
    expect(service.consumeSilent()).toBe(false);
  });

  it('consumeSilent() returns true exactly once after markSilent(), then false on every subsequent call', () => {
    service.markSilent();

    expect(service.consumeSilent()).toBe(true);
    expect(service.consumeSilent()).toBe(false);
    expect(service.consumeSilent()).toBe(false);
  });

  it('a later markSilent() call re-arms the flag after it was consumed', () => {
    service.markSilent();
    service.consumeSilent();

    service.markSilent();

    expect(service.consumeSilent()).toBe(true);
    expect(service.consumeSilent()).toBe(false);
  });
});
