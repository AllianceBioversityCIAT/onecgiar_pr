import { ObjectFlattener } from './object-flattener';

describe('ObjectFlattener', () => {
  it('debe aplanar un objeto anidado usando dot notation', () => {
    const res = ObjectFlattener.flattenObjects({ a: { b: 1 }, c: 2 });
    expect(res).toEqual({ 'a.b': 1, c: 2 });
  });

  it('debe aplanar una lista de objetos', () => {
    const res = ObjectFlattener.flattenObjects([{ a: { b: 1 }, c: 2 }]);
    expect(res).toEqual([{ 'a.b': 1, c: 2 }]);
  });

  it('debe mantener null como valor (no recursar)', () => {
    const res = ObjectFlattener.flattenObjects({ a: null });
    expect(res).toEqual({ a: null });
  });
});

