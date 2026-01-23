import {
  extractPropertyValues,
  filterByUniqueKeyWithPriority,
  filterPersistKey,
  formatDataToArray,
  getItemsAtLevel,
  intersection,
  isArrayOfType,
  isNotEmpty,
  mergeArraysWithPriority,
  removeDuplicatesByKeys,
  transformDataToArray,
  updateArray,
  validTypeOfArray,
} from './array.util';

describe('array.util', () => {
  describe('transformDataToArray', () => {
    it('debe envolver un elemento en array', () => {
      expect(transformDataToArray(5)).toEqual([5]);
    });
    it('debe retornar el mismo array si ya lo es', () => {
      expect(transformDataToArray([1, 2])).toEqual([1, 2]);
    });
  });

  describe('isNotEmpty / formatDataToArray', () => {
    it('isNotEmpty debe ser false para null/undefined y []', () => {
      expect(isNotEmpty(undefined as any)).toBe(false);
      expect(isNotEmpty(null as any)).toBe(false);
      expect(isNotEmpty([] as any)).toBe(false);
    });

    it('isNotEmpty debe ser true para dato no-array y array con elementos', () => {
      expect(isNotEmpty({} as any)).toBe(true);
      expect(isNotEmpty([1] as any)).toBe(true);
    });

    it('formatDataToArray debe retornar [] para empty y array para non-empty', () => {
      expect(formatDataToArray(undefined as any)).toEqual([]);
      expect(formatDataToArray(null as any)).toEqual([]);
      expect(formatDataToArray([] as any)).toEqual([]);
      expect(formatDataToArray(7 as any)).toEqual([7]);
      expect(formatDataToArray([7] as any)).toEqual([7]);
    });
  });

  describe('validTypeOfArray', () => {
    it('debe convertir a string y eliminar caracteres no alfanuméricos', () => {
      expect(validTypeOfArray(['a-b', 'c d', 12, 'x_y'] as any)).toEqual([
        'ab',
        'cd',
        '12',
        'xy',
      ]);
    });
  });

  describe('updateArray', () => {
    type E = {
      id?: number;
      code: string;
      result_id?: number;
      other?: string;
      is_active?: boolean;
    };

    it('debe agregar parent a todos los items del cliente y mergear con backend por comparisonKey', () => {
      const client: Partial<E>[] = [{ code: 'A', other: 'client' }];
      const backend: E[] = [{ id: 10, code: 'A', other: 'backend' }];

      const res = updateArray<E>(
        client,
        backend,
        'code',
        { key: 'result_id', value: 99 },
        'id',
      );

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual(
        expect.objectContaining({
          id: 10, // viene del backend por primaryKey
          code: 'A',
          other: 'client', // client tiene prioridad por el spread actual
          is_active: true,
          result_id: 99,
        }),
      );
    });

    it('debe push de backend no encontrado como is_active=false, excepto si está en notDeleteIds', () => {
      const client: Partial<E>[] = [];
      const backend: E[] = [
        { id: 1, code: 'A' },
        { id: 2, code: 'B' },
      ];

      const res = updateArray<E>(
        client,
        backend,
        'code',
        { key: 'result_id', value: 5 },
        'id',
        [2],
      );

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual(
        expect.objectContaining({
          id: 1,
          code: 'A',
          is_active: false,
          result_id: 5,
        }),
      );
    });
  });

  describe('filterPersistKey', () => {
    it('debe retornar solo los ids definidos', () => {
      const res = filterPersistKey<any>('id', [
        { id: 1, is_active: true },
        { id: undefined, is_active: true },
        { id: 2, is_active: null },
      ]);
      expect(res).toEqual([1, 2]);
    });
  });

  describe('isArrayOfType', () => {
    const isNumber = (x: unknown): x is number => typeof x === 'number';
    it('debe validar el tipo por elemento', () => {
      expect(isArrayOfType([1, 2, 3], isNumber)).toBe(true);
      expect(isArrayOfType([1, '2', 3] as any, isNumber)).toBe(false);
    });
  });

  describe('intersection', () => {
    it('debe retornar intersección', () => {
      expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    });
  });

  describe('mergeArraysWithPriority', () => {
    it('debe mantener A y agregar de B los que no estén por key', () => {
      const res = mergeArraysWithPriority<any>(
        [{ id: 1, v: 'a' }],
        [{ id: 1, v: 'b' }, { id: 2, v: 'c' }],
        'id',
      );
      expect(res).toEqual([{ id: 1, v: 'a' }, { id: 2, v: 'c' }]);
    });
  });

  describe('getItemsAtLevel', () => {
    it('level<1 retorna []', () => {
      expect(getItemsAtLevel([{ children: [] } as any], 0)).toEqual([]);
    });

    it('level=1 retorna items sin children', () => {
      const res = getItemsAtLevel(
        [{ id: 1, children: [{ id: 2 }] as any } as any],
        1,
      );
      expect(res).toEqual([{ id: 1 }]);
    });

    it('level>1 retorna items del nivel indicado', () => {
      const tree: any[] = [
        { id: 1, children: [{ id: 2, children: [{ id: 3 }] }] },
      ];
      expect(getItemsAtLevel(tree, 2)).toEqual([{ id: 2 }]);
      expect(getItemsAtLevel(tree, 3)).toEqual([{ id: 3 }]);
    });
  });

  describe('filterByUniqueKeyWithPriority', () => {
    it('debe mantener un elemento por key priorizando el que tenga priorityField', () => {
      const res = filterByUniqueKeyWithPriority<any>(
        [
          { id: 1, flag: null },
          { id: 1, flag: 'x' },
          { id: 2, flag: null },
        ],
        'id',
        'flag',
      );
      expect(res).toHaveLength(2);
      expect(res.find((x) => x.id === 1)).toEqual({ id: 1, flag: 'x' });
    });
  });

  describe('removeDuplicatesByKeys', () => {
    it('debe remover duplicados por composite key (incluyendo objetos)', () => {
      const res = removeDuplicatesByKeys<any>(
        [
          { a: 1, b: { x: 1 } },
          { a: 1, b: { x: 1 } },
          { a: 1, b: { x: 2 } },
          { a: null, b: null },
          { a: '', b: [] },
        ],
        ['a', 'b'],
      );
      expect(res).toHaveLength(3);
    });
  });

  describe('extractPropertyValues', () => {
    it('debe extraer valores de una propiedad', () => {
      expect(extractPropertyValues([{ id: 1 }, { id: 2 }], 'id')).toEqual([
        1,
        2,
      ]);
    });
  });
});

