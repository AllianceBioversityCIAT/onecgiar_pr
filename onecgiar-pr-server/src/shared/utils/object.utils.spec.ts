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
    it('debe retornar true para null/undefined/""/NaN/[]', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('' as any)).toBe(true);
      expect(isEmpty(Number('not-a-number') as any)).toBe(true);
      expect(isEmpty([] as any)).toBe(true);
    });

    it('debe retornar false para valores válidos', () => {
      expect(isEmpty(0 as any)).toBe(false);
      expect(isEmpty(false as any)).toBe(false);
      expect(isEmpty('x' as any)).toBe(false);
      expect(isEmpty([1] as any)).toBe(false);
      expect(isEmpty({} as any)).toBe(false);
    });
  });

  describe('cleanObject', () => {
    it('debe eliminar null, "" y NaN (number)', () => {
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
    it('debe convertir "true" a true y el resto a false', () => {
      expect(parseBoolean({ a: 'true', b: 'false', c: '1' } as any)).toEqual({
        a: true,
        b: false,
        c: false,
      });
    });
  });

  describe('validObject', () => {
    it('debe retornar isValid=false y campos inválidos cuando falten', () => {
      const res = validObject({ a: '', b: 2 } as any, ['a', 'c'] as any);
      expect(res.isValid).toBe(false);
      expect(res.invalidFields.sort((a, b) => a.localeCompare(b))).toEqual(['a', 'c']);
    });

    it('debe retornar isValid=true cuando todos estén presentes', () => {
      const res = validObject({ a: 1, b: 'x' } as any, ['a', 'b'] as any);
      expect(res).toEqual({ isValid: true, invalidFields: [] });
    });
  });

  describe('setDefaultValueInObject', () => {
    it('debe retornar {} si obj no es objeto', () => {
      expect(setDefaultValueInObject(null as any, ['a'] as any)).toEqual({});
      expect(setDefaultValueInObject(undefined as any, ['a'] as any)).toEqual({});
      expect(setDefaultValueInObject('x' as any, ['a'] as any)).toEqual({});
    });

    it('debe setear atributos en el objeto (y retornar copia)', () => {
      const obj: any = { a: 1 };
      const res = setDefaultValueInObject(obj, ['a', 'b'] as any, 9);
      expect(res).toEqual({ a: 9, b: 9 });
      // Mutación esperada por la implementación actual
      expect(obj).toEqual({ a: 9, b: 9 });
    });
  });

  describe('setNull', () => {
    it('debe convertir empty a null', () => {
      expect(setNull('' as any)).toBeNull();
      expect(setNull([] as any)).toBeNull();
      expect(setNull(undefined as any)).toBeNull();
    });

    it('debe dejar valores no vacíos intactos', () => {
      expect(setNull('x' as any)).toBe('x');
      expect(setNull(0 as any)).toBe(0);
    });
  });

  describe('defaultValue', () => {
    it('debe retornar data cuando condition=true', () => {
      expect(defaultValue('x', true, 'y')).toBe('x');
    });

    it('debe retornar defaultValue cuando condition=false', () => {
      expect(defaultValue('x', false, 'y')).toBe('y');
      expect(defaultValue('x', false)).toBeNull();
    });
  });
});

