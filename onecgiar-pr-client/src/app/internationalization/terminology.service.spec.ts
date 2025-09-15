import { TestBed } from '@angular/core/testing';
import { TerminologyService } from './terminology.service';
import { TermKey, LEGACY_TERMS, NEW_TERMS } from './terminology.config';

describe('TerminologyService', () => {
  let service: TerminologyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TerminologyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('t method', () => {
    it('should return legacy term when portfolioAcronym is null', () => {
      const testKey: TermKey = 'term.entity.singular';
      const result = service.t(testKey, null);

      expect(result).toBe(LEGACY_TERMS[testKey]);
    });

    it('should return legacy term when portfolioAcronym is undefined', () => {
      const testKey: TermKey = 'term.entity.plural';
      const result = service.t(testKey, undefined);

      expect(result).toBe(LEGACY_TERMS[testKey]);
    });

    it('should return legacy term when portfolioAcronym is empty string', () => {
      const testKey: TermKey = 'term.entity.orPlatforms';
      const result = service.t(testKey, '');

      expect(result).toBe(LEGACY_TERMS[testKey]);
    });

    it('should return new term when portfolioAcronym is P25', () => {
      const testKey: TermKey = 'term.entity.singular';
      const result = service.t(testKey, 'P25');

      expect(result).toBe(NEW_TERMS[testKey]);
    });

    it('should return legacy term when portfolioAcronym is not P25', () => {
      const testKey: TermKey = 'term.entity.singular';
      const result = service.t(testKey, 'P10');

      expect(result).toBe(LEGACY_TERMS[testKey]);
    });

    it('should return legacy term when portfolioAcronym is any other value', () => {
      const testKey: TermKey = 'term.entity.plural';
      const result = service.t(testKey, 'SOME_OTHER_VALUE');

      expect(result).toBe(LEGACY_TERMS[testKey]);
    });

    it('should handle all TermKey types with P25 portfolio', () => {
      const termKeys: TermKey[] = [
        'term.entity.singular',
        'term.entity.plural',
        'term.entity.orPlatforms',
        'term.entity.orPlatformsPlural',
        'term.entity.orPlatformsWith()',
        'term.entity.singularWith()',
        'term.entity.orPlatformsOrSGP'
      ];

      termKeys.forEach(key => {
        const result = service.t(key, 'P25');
        expect(result).toBe(NEW_TERMS[key]);
      });
    });

    it('should handle all TermKey types with non-P25 portfolio', () => {
      const termKeys: TermKey[] = [
        'term.entity.singular',
        'term.entity.plural',
        'term.entity.orPlatforms',
        'term.entity.orPlatformsPlural',
        'term.entity.orPlatformsWith()',
        'term.entity.singularWith()',
        'term.entity.orPlatformsOrSGP'
      ];

      termKeys.forEach(key => {
        const result = service.t(key, 'P10');
        expect(result).toBe(LEGACY_TERMS[key]);
      });
    });

    it('should return the key itself when term is not found in dictionary', () => {
      // This test assumes there might be a key not in the dictionary
      // Since all TermKey values are defined in the config, we'll test with a mock scenario
      const mockKey = 'non.existent.key' as TermKey;
      const result = service.t(mockKey, 'P25');

      expect(result).toBe(mockKey);
    });

    it('should be case sensitive for portfolioAcronym', () => {
      const testKey: TermKey = 'term.entity.singular';

      const resultLowercase = service.t(testKey, 'p25');
      const resultUppercase = service.t(testKey, 'P25');

      expect(resultLowercase).toBe(LEGACY_TERMS[testKey]);
      expect(resultUppercase).toBe(NEW_TERMS[testKey]);
    });

    it('should handle whitespace in portfolioAcronym', () => {
      const testKey: TermKey = 'term.entity.singular';

      const resultWithSpaces = service.t(testKey, ' P25 ');
      const resultWithTabs = service.t(testKey, '\tP25\t');

      expect(resultWithSpaces).toBe(LEGACY_TERMS[testKey]);
      expect(resultWithTabs).toBe(LEGACY_TERMS[testKey]);
    });
  });

  describe('getActiveDict method (private method testing through public interface)', () => {
    it('should return LEGACY_TERMS for null portfolioAcronym', () => {
      const testKey: TermKey = 'term.entity.singular';
      const result = service.t(testKey, null);

      expect(result).toBe('Initiative'); // From LEGACY_TERMS
    });

    it('should return NEW_TERMS for P25 portfolioAcronym', () => {
      const testKey: TermKey = 'term.entity.singular';
      const result = service.t(testKey, 'P25');

      expect(result).toBe('Science Program/Accelerator'); // From NEW_TERMS
    });

    it('should return LEGACY_TERMS for any other portfolioAcronym', () => {
      const testKey: TermKey = 'term.entity.singular';
      const result = service.t(testKey, 'P10');

      expect(result).toBe('Initiative'); // From LEGACY_TERMS
    });
  });

  describe('service configuration', () => {
    it('should be provided in root', () => {
      // This test verifies the service is properly configured
      expect(service).toBeInstanceOf(TerminologyService);
    });

    it('should be injectable', () => {
      const injectedService = TestBed.inject(TerminologyService);
      expect(injectedService).toBe(service);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined key gracefully', () => {
      const result = service.t(undefined as any, 'P25');
      expect(result).toBeUndefined();
    });

    it('should handle empty string key', () => {
      const result = service.t('' as any, 'P25');
      expect(result).toBe('');
    });

    it('should handle very long portfolioAcronym', () => {
      const longAcronym = 'A'.repeat(1000);
      const testKey: TermKey = 'term.entity.singular';
      const result = service.t(testKey, longAcronym);

      expect(result).toBe(LEGACY_TERMS[testKey]);
    });

    it('should handle special characters in portfolioAcronym', () => {
      const testKey: TermKey = 'term.entity.singular';
      const specialChars = 'P25!@#$%^&*()';
      const result = service.t(testKey, specialChars);

      expect(result).toBe(LEGACY_TERMS[testKey]);
    });
  });

  describe('performance and consistency', () => {
    it('should return consistent results for same inputs', () => {
      const testKey: TermKey = 'term.entity.singular';
      const portfolioAcronym = 'P25';

      const result1 = service.t(testKey, portfolioAcronym);
      const result2 = service.t(testKey, portfolioAcronym);

      expect(result1).toBe(result2);
    });

    it('should handle multiple calls efficiently', () => {
      const testKey: TermKey = 'term.entity.singular';
      const iterations = 100;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        service.t(testKey, 'P25');
      }
      const end = performance.now();

      // This test ensures the method doesn't have performance issues
      expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});
