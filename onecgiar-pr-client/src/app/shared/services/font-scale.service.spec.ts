import { TestBed } from '@angular/core/testing';
import { FontScaleService, FONT_SCALE_OPTIONS } from './font-scale.service';

const STORAGE_KEY = 'pr.a11y.fontScale';
const FONT_VAR = '--pr-font-scale';

describe('FontScaleService', () => {
  const rootStyle = () => document.documentElement.style.getPropertyValue(FONT_VAR);

  /** Fresh service after localStorage/DOM are prepared (readInitial runs on construction). */
  const createService = () => TestBed.inject(FontScaleService);

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty(FONT_VAR);
    jest.restoreAllMocks();
    TestBed.configureTestingModule({});
  });

  describe('FONT_SCALE_OPTIONS', () => {
    it('exposes the five expected steps with their factors', () => {
      expect(FONT_SCALE_OPTIONS.map(o => o.value)).toEqual(['small', 'default', 'large', 'larger', 'largest']);
      expect(FONT_SCALE_OPTIONS.map(o => o.factor)).toEqual([0.9, 1, 1.15, 1.3, 1.5]);
      expect(FONT_SCALE_OPTIONS.map(o => o.label)).toEqual(['Small', 'Default', 'Large', 'Larger', 'Largest']);
    });
  });

  describe('initial value', () => {
    it('defaults to "default" when nothing is stored', () => {
      const service = createService();
      expect(service.scale()).toBe('default');
    });

    it('reads a valid persisted value from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'larger');
      const service = createService();
      expect(service.scale()).toBe('larger');
    });

    it('falls back to "default" for an unknown persisted value', () => {
      localStorage.setItem(STORAGE_KEY, 'gigantic');
      const service = createService();
      expect(service.scale()).toBe('default');
    });

    it('does not throw when localStorage.getItem is unavailable', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      expect(() => createService()).not.toThrow();
      expect(createService().scale()).toBe('default');
    });
  });

  describe('applying the scale (effect)', () => {
    it('writes the CSS var and persists on init at the default factor', () => {
      const service = createService();
      TestBed.tick();
      expect(rootStyle()).toBe('1');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('default');
      expect(service.scale()).toBe('default');
    });

    it.each([
      ['default', '1'],
      ['large', '1.15'],
      ['larger', '1.3'],
      ['largest', '1.5']
    ] as const)('set("%s") writes --pr-font-scale=%s and persists', (value, factor) => {
      const service = createService();
      TestBed.tick();

      service.set(value);
      TestBed.tick();

      expect(rootStyle()).toBe(factor);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(value);
    });

    it('reset() returns the scale to default', () => {
      const service = createService();
      TestBed.tick();

      service.set('largest');
      TestBed.tick();
      expect(service.scale()).toBe('largest');

      service.reset();
      TestBed.tick();
      expect(service.scale()).toBe('default');
      expect(rootStyle()).toBe('1');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('default');
    });

    it('does not throw when localStorage.setItem is unavailable', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota / blocked');
      });
      const service = createService();
      TestBed.tick();

      expect(() => {
        service.set('large');
        TestBed.tick();
      }).not.toThrow();

      // The visual scale still applies even though persistence failed.
      expect(rootStyle()).toBe('1.15');
      expect(service.scale()).toBe('large');
    });
  });

  describe('currentLabel', () => {
    it('returns the label of the current scale', () => {
      const service = createService();
      expect(service.currentLabel()).toBe('Default');

      service.set('larger');
      expect(service.currentLabel()).toBe('Larger');
    });
  });
});
