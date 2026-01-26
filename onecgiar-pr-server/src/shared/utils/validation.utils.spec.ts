import { validationAttr } from './validation.utils';

describe('validationAttr', () => {
  it('debe retornar false si alguna key requerida es undefined/null/""', () => {
    const BASE = { a: true, b: true };

    expect(validationAttr({ a: 1, b: undefined }, BASE)).toBe(false);
    expect(validationAttr({ a: 1, b: null }, BASE)).toBe(false);
    expect(validationAttr({ a: 1, b: '' }, BASE)).toBe(false);
  });

  it('debe retornar true cuando todas las keys requeridas están presentes', () => {
    const BASE = { a: true, b: true, c: true };
    expect(validationAttr({ a: 1, b: 'x', c: 0 }, BASE)).toBe(true);
  });
});

