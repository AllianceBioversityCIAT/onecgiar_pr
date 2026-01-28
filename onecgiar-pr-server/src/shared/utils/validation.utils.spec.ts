import { validationAttr } from './validation.utils';

describe('validationAttr', () => {
  it('should return false if any required key is undefined/null/""', () => {
    const BASE = { a: true, b: true };

    expect(validationAttr({ a: 1, b: undefined }, BASE)).toBe(false);
    expect(validationAttr({ a: 1, b: null }, BASE)).toBe(false);
    expect(validationAttr({ a: 1, b: '' }, BASE)).toBe(false);
  });

  it('should return true when all required keys are present', () => {
    const BASE = { a: true, b: true, c: true };
    expect(validationAttr({ a: 1, b: 'x', c: 0 }, BASE)).toBe(true);
  });
});
