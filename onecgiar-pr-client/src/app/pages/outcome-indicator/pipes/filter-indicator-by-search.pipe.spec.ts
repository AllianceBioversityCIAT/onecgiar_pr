import { FilterIndicatorBySearchPipe } from './filter-indicator-by-search.pipe';

describe('FilterIndicatorBySearchPipe', () => {
  let pipe: FilterIndicatorBySearchPipe;

  beforeEach(() => {
    pipe = new FilterIndicatorBySearchPipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty array if list is not an array', () => {
    expect(pipe.transform(null as any, '', false)).toEqual([]);
    expect(pipe.transform(undefined as any, '', false)).toEqual([]);
  });

  describe('Default filtering (non-WPsTable)', () => {
    const mockList = [
      {
        toc_result_title: 'Result 1',
        indicators: [
          {
            indicator_name: 'Indicator 1',
            indicator_description: 'Description 1',
            is_indicator_custom: true
          }
        ]
      },
      {
        toc_result_title: 'Result 2',
        indicators: [
          {
            indicator_name: 'Indicator 2',
            indicator_description: 'Description 2',
            is_indicator_custom: false
          }
        ]
      }
    ];

    it('should return full list when no search filter', () => {
      const result = pipe.transform(mockList, '', false);
      expect(result.length).toBe(2);
    });

    it('should filter by result description', () => {
      const result = pipe.transform(mockList, 'Result 1', false);
      expect(result.length).toBe(1);
      expect(result[0].toc_result_title).toBe('Result 1');
    });

    it('should be case insensitive', () => {
      const result = pipe.transform(mockList, 'result 1', false);
      expect(result.length).toBe(1);
      expect(result[0].toc_result_title).toBe('Result 1');
    });
  });

  describe('WPsTable filtering', () => {
    const mockWPsList = [
      {
        toc_results: [
          {
            toc_result_title: 'WP Result 1',
            indicators: [{ indicator_description: 'WP Indicator 1' }, { indicator_description: 'WP Indicator 2' }]
          }
        ]
      },
      {
        toc_results: [
          {
            toc_result_title: 'WP Result 2',
            indicators: [{ indicator_description: 'WP Indicator 3' }]
          }
        ]
      }
    ];

    it('should return full list when no search filter', () => {
      const result = pipe.transform(mockWPsList, '', true);
      expect(result.length).toBe(2);
    });

    it('should filter by result description in WPsTable mode', () => {
      const result = pipe.transform(mockWPsList, 'WP Result 1', true);
      expect(result.length).toBe(1);
      expect(result[0].toc_results[0].toc_result_title).toBe('WP Result 1');
    });

    it('should filter by indicator description in WPsTable mode', () => {
      const result = pipe.transform(mockWPsList, 'WP Indicator 1', true);
      expect(result.length).toBe(1);
      expect(result[0].toc_results[0].indicators[0].indicator_description).toBe('WP Indicator 1');
    });

    it('should preserve original indicators when resetting', () => {
      pipe.transform(mockWPsList, 'WP Indicator 1', true);
      const result = pipe.transform(mockWPsList, '', true);

      expect(result[0].toc_results[0].indicators.length).toBe(2);
      expect(result[1].toc_results[0].indicators.length).toBe(1);
    });

    it('should mark indicators as visible based on search', () => {
      const result = pipe.transform(mockWPsList, 'WP Indicator 1', true);
      expect(result[0].toc_results[0].indicators[0].isVisible).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty lists', () => {
      expect(pipe.transform([], '', false)).toEqual([]);
      expect(pipe.transform([], 'search', true)).toEqual([]);
    });

    it('should handle missing properties gracefully', () => {
      const incompleteList = [{ toc_results: [] }, { toc_results: null }, {}];
      expect(() => pipe.transform(incompleteList, 'search', false)).not.toThrow(TypeError);
    });

    it('should handle undefined search filter', () => {
      const mockList = [{ toc_result_title: 'Test' }];
      expect(() => pipe.transform(mockList, undefined as any, false)).not.toThrow();
    });
  });
});
