import {
  CHART_TOKEN_NAMES,
  STATUS_TOKEN_NAMES,
  resolveChartTokens,
  resolveStatusTokens
} from './chart-tokens.util';

describe('chart-tokens.util (VCE-R-4 / VCE-DD-3 / VCE-DD-5)', () => {
  let getPropertyValueSpy: jest.SpyInstance;

  beforeEach(() => {
    getPropertyValueSpy = jest
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({
        getPropertyValue: jest.fn().mockImplementation((name: string) => '')
      } as unknown as CSSStyleDeclaration);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Token Set Integrity & Fencing', () => {
    it('queries exactly the defined CHART_TOKEN_NAMES set and maintains ramp order', () => {
      const requestedNames: string[] = [];
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: jest.fn().mockImplementation((name: string) => {
          requestedNames.push(name);
          return '';
        })
      } as unknown as CSSStyleDeclaration);

      resolveChartTokens();

      expect(requestedNames).toEqual(CHART_TOKEN_NAMES);
    });

    it('queries exactly the defined STATUS_TOKEN_NAMES set', () => {
      const requestedNames: string[] = [];
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: jest.fn().mockImplementation((name: string) => {
          requestedNames.push(name);
          return '';
        })
      } as unknown as CSSStyleDeclaration);

      resolveStatusTokens();

      expect(requestedNames).toEqual(STATUS_TOKEN_NAMES);
    });

    it('enforces complete disjointness between CHART_TOKEN_NAMES and STATUS_TOKEN_NAMES', () => {
      const chartSet = new Set(CHART_TOKEN_NAMES);
      for (const statusName of STATUS_TOKEN_NAMES) {
        expect(chartSet.has(statusName as any)).toBe(false);
      }
    });
  });

  describe('Value Resolution & Missing Token Handling (No Hex Fallback)', () => {
    it('returns trimmed property value when token is present', () => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: jest.fn().mockImplementation((name: string) => {
          if (name === '--pr-chart-1') return ' #4a2bb8 ';
          if (name === '--pr-color-primary-300') return ' #6b46e5 ';
          return '';
        })
      } as unknown as CSSStyleDeclaration);

      const tokens = resolveChartTokens();

      expect(tokens.ramp[0]).toBe('#4a2bb8');
      expect(tokens.primary).toBe('#6b46e5');
      expect(tokens.ramp[1]).toBe('');
    });

    it('returns empty string and NEVER a hex fallback for undefined tokens', () => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: jest.fn().mockReturnValue('')
      } as unknown as CSSStyleDeclaration);

      const tokens = resolveChartTokens();

      expect(tokens.ramp).toEqual(['', '', '', '']);
      expect(tokens.primary).toBe('');
      expect(tokens.primaryStrong).toBe('');
      expect(tokens.bilateralMuted).toBe('');
      expect(tokens.textSecondary).toBe('');
      expect(tokens.border).toBe('');

      // Assert no default hex color is present
      for (const val of [...tokens.ramp, tokens.primary, tokens.primaryStrong, tokens.bilateralMuted, tokens.textSecondary, tokens.border]) {
        expect(val).toBe('');
        expect(val.startsWith('#')).toBe(false);
      }
    });

    it('resolves all status token pairs correctly', () => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: jest.fn().mockImplementation((name: string) => {
          if (name === '--pr-status-approved-fg') return '#047857';
          if (name === '--pr-status-approved-bg') return '#d1fae5';
          return '';
        })
      } as unknown as CSSStyleDeclaration);

      const status = resolveStatusTokens();

      expect(status.approved.fg).toBe('#047857');
      expect(status.approved.bg).toBe('#d1fae5');
      expect(status.notStarted.fg).toBe('');
      expect(status.notStarted.bg).toBe('');
    });
  });
});
