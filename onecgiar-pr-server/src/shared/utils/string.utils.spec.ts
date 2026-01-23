import { StringUtils } from './string.utils';

describe('StringUtils', () => {
  describe('join', () => {
    it('debe retornar string vacía para array vacío', () => {
      expect(StringUtils.join([])).toBe('');
    });

    it('debe retornar el mismo elemento para array de longitud 1', () => {
      expect(StringUtils.join(['a'])).toBe('a');
    });

    it('debe usar lastSeparator cuando es diferente al separator', () => {
      expect(StringUtils.join(['a', 'b', 'c'], ', ', ' y ')).toBe('a, b y c');
    });

    it('debe usar separator cuando lastSeparator == separator', () => {
      expect(StringUtils.join(['a', 'b', 'c'], ', ', ', ')).toBe('a, b, c');
    });
  });
});

