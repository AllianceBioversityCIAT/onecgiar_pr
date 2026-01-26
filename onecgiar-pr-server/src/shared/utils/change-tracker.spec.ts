import { ChangeTracker } from './change-tracker';

describe('ChangeTracker', () => {
  describe('trackChangesForObjects', () => {
    it('debe detectar added (incluyendo los sin key) y removed por key', () => {
      type E = { id?: number; name: string };

      const oldList: E[] = [
        { id: 1, name: 'old-1' },
        { id: 2, name: 'old-2' },
      ];
      const newList: E[] = [
        { id: 2, name: 'new-2' },
        { id: 3, name: 'new-3' },
        { name: 'no-id' },
      ];

      const res = ChangeTracker.trackChangesForObjects(oldList, newList, 'id');

      expect(res.added).toEqual(
        expect.arrayContaining([{ id: 3, name: 'new-3' }, { name: 'no-id' }]),
      );
      expect(res.removed).toEqual([{ id: 1, name: 'old-1' }]);
    });
  });

  describe('trackChangesForArrays', () => {
    it('debe detectar added y removed para arrays simples', () => {
      const res = ChangeTracker.trackChangesForArrays([1, 2, 3], [2, 3, 4]);
      expect(res.added).toEqual([4]);
      expect(res.removed).toEqual([1]);
    });
  });
});

