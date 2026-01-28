import { StringUtils } from './string.utils';

describe('StringUtils', () => {
  describe('join', () => {
    it('should return an empty string for an empty array', () => {
      expect(StringUtils.join([])).toBe('');
    });

    it('should return the same element for an array of length 1', () => {
      expect(StringUtils.join(['a'])).toBe('a');
    });

    it('should use lastSeparator when it is different from separator', () => {
      expect(StringUtils.join(['a', 'b', 'c'], ', ', ' y ')).toBe('a, b y c');
    });

    it('should use separator when lastSeparator == separator', () => {
      expect(StringUtils.join(['a', 'b', 'c'], ', ', ', ')).toBe('a, b, c');
    });
  });
});
