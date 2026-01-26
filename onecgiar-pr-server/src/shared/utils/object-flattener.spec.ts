import { ObjectFlattener } from './object-flattener';

describe('ObjectFlattener', () => {
  it('should flatten a nested object using dot notation', () => {
    const res = ObjectFlattener.flattenObjects({ a: { b: 1 }, c: 2 });
    expect(res).toEqual({ 'a.b': 1, c: 2 });
  });

  it('should flatten a list of objects', () => {
    const res = ObjectFlattener.flattenObjects([{ a: { b: 1 }, c: 2 }]);
    expect(res).toEqual([{ 'a.b': 1, c: 2 }]);
  });

  it('should keep null as a value (do not recurse)', () => {
    const res = ObjectFlattener.flattenObjects({ a: null });
    expect(res).toEqual({ a: null });
  });
});

