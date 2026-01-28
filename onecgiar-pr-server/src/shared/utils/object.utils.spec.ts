import {
  cleanObject,
  defaultValue,
  isEmpty,
  parseBoolean,
  setDefaultValueInObject,
  setNull,
  validObject,
} from './object.utils';

describe('object.utils', () => {
  describe('isEmpty', () => {
    it('should return true for null/undefined/""/NaN/[]', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('' as any)).toBe(true);
      expect(isEmpty(Number('not-a-number') as any)).toBe(true);
      expect(isEmpty([] as any)).toBe(true);
    });

    it('should return false for valid values', () => {
      expect(isEmpty(0 as any)).toBe(false);
      expect(isEmpty(false as any)).toBe(false);
      expect(isEmpty('x' as any)).toBe(false);
      expect(isEmpty([1] as any)).toBe(false);
      expect(isEmpty({} as any)).toBe(false);
    });
  });

  describe('cleanObject', () => {
    it('should remove null, "" and NaN (number)', () => {
      const input = {
        a: 'ok',
        b: '',
        c: null,
        d: NaN,
        e: 123,
        f: 0,
      };

      expect(cleanObject(input)).toEqual({
        a: 'ok',
        e: 123,
        f: 0,
      });
    });
  });

  describe('parseBoolean', () => {
    it('should convert "true" to true and everything else to false', () => {
      expect(parseBoolean({ a: 'true', b: 'false', c: '1' } as any)).toEqual({
        a: true,
        b: false,
        c: false,
      });
    });
  });

  describe('validObject', () => {
    it('should return isValid=false and invalidFields when required fields are missing', () => {
      const res = validObject({ a: '', b: 2 } as any, ['a', 'c'] as any);
      expect(res.isValid).toBe(false);
      expect(res.invalidFields.sort((a, b) => a.localeCompare(b))).toEqual([
        'a',
        'c',
      ]);
    });

    it('should return isValid=true when all required fields are present', () => {
      const res = validObject({ a: 1, b: 'x' } as any, ['a', 'b'] as any);
      expect(res).toEqual({ isValid: true, invalidFields: [] });
    });
  });

  describe('setDefaultValueInObject', () => {
    it('should return {} if obj is not an object', () => {
      expect(setDefaultValueInObject(null as any, ['a'] as any)).toEqual({});
      expect(setDefaultValueInObject(undefined as any, ['a'] as any)).toEqual(
        {},
      );
      expect(setDefaultValueInObject('x' as any, ['a'] as any)).toEqual({});
    });

    it('should set attributes on the object (and return a copy)', () => {
      const obj: any = { a: 1 };
      const res = setDefaultValueInObject(obj, ['a', 'b'] as any, 9);
      expect(res).toEqual({ a: 9, b: 9 });
      // Mutation is expected by the current implementation
      expect(obj).toEqual({ a: 9, b: 9 });
    });
  });

  describe('setNull', () => {
    it('should convert empty values to null', () => {
      expect(setNull('' as any)).toBeNull();
      expect(setNull([] as any)).toBeNull();
      expect(setNull(undefined as any)).toBeNull();
    });

    it('should keep non-empty values unchanged', () => {
      expect(setNull('x' as any)).toBe('x');
      expect(setNull(0 as any)).toBe(0);
    });
  });

  describe('defaultValue', () => {
    it('should return data when condition=true', () => {
      expect(defaultValue('x', true, 'y')).toBe('x');
    });

    it('should return defaultValue when condition=false', () => {
      expect(defaultValue('x', false, 'y')).toBe('y');
      expect(defaultValue('x', false)).toBeNull();
    });
  });
});
