import { BaseEntity } from './base-entity';
import { BaseServiceSimple } from './base-service';

class DummyEntity extends BaseEntity {
  id!: number;
  result_id!: number;
  role_id?: number;
  name?: string;
  number?: number;
  unit?: string;
  description?: string;
  other?: string;
}

class DummyService extends BaseServiceSimple<DummyEntity, any> {
  constructor(repo: any, roleKey: string | null = null) {
    super(DummyEntity, repo, 'result_id' as any, roleKey as any);
  }
}

describe('BaseServiceSimple / BaseDeleteService', () => {
  const makeRepo = () => ({
    metadata: { primaryColumns: [{ propertyName: 'id' }] },
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  });

  describe('transformArrayToSaveObject', () => {
    it('should map to objects using metadata primaryKey', () => {
      const repo = makeRepo();
      const service = new DummyService(repo);

      expect(service.transformArrayToSaveObject([1, 2], { result_id: 10 } as any))
        .toEqual([
          { id: 1, result_id: 10 },
          { id: 2, result_id: 10 },
        ]);
    });
  });

  describe('find', () => {
    it('should build where with resultKey and is_active=true', async () => {
      const repo = makeRepo();
      repo.find.mockResolvedValue([{ id: 1 }]);
      const service = new DummyService(repo, 'role_id');

      await service.find([10, 11] as any, 2 as any, { rel: true } as any);

      expect(repo.find).toHaveBeenCalledTimes(1);
      const args = repo.find.mock.calls[0][0];
      expect(args).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
          }),
          relations: { rel: true },
        }),
      );
      expect(args.where.result_id).toBeDefined(); // FindOperator(In)
      expect(args.where.role_id).toBe(2);
    });
  });

  describe('unsetMultiplesPrimary', () => {
    it('should uncheck all if there is more than one is_primary=true', () => {
      const repo = makeRepo();
      const service = new DummyService(repo);

      const input = [
        { is_primary: true },
        { is_primary: true },
        { is_primary: false },
      ];
      const res = (service as any).unsetMultiplesPrimary(input);
      expect(res.every((x: any) => x.is_primary === false)).toBe(true);
    });
  });

  describe('create', () => {
    it('should upsert by generalCompareKey, deactivate others and add audit fields', async () => {
      const repo = makeRepo();
      const service = new DummyService(repo, 'role_id');

      repo.find.mockResolvedValue([
        {
          id: 1,
          result_id: 10,
          role_id: 2,
          name: 'A',
          other: 'backend',
          is_active: true,
        },
      ]);
      repo.update.mockResolvedValue(undefined);
      repo.save.mockImplementation(async (items: any[]) => [
        { ...items[0], is_active: true },
        { ...items[0], id: 999, is_active: false },
      ]);

      const res = await service.create(
        10,
        [
          { id: 1, name: 'A', other: 'client' },
          { id: 2, name: '' }, // filtrado por isEmpty
        ],
        'name' as any,
        { dataRole: 2 as any, otherAttributes: ['other'] as any, userId: 7 },
      );

      // update to deactivate others
      expect(repo.update).toHaveBeenCalledTimes(1);
      expect(repo.update.mock.calls[0][1]).toEqual(
        expect.objectContaining({ is_active: false }),
      );

      expect(repo.save).toHaveBeenCalledTimes(1);
      const savedArg = repo.save.mock.calls[0][0];
      expect(savedArg[0]).toEqual(
        expect.objectContaining({
          created_by: 7,
          last_updated_by: 7,
          result_id: 10,
          role_id: 2,
          name: 'A',
          other: 'client',
        }),
      );

      // returns only active items
      expect(res).toHaveLength(1);
      expect(res[0]).toEqual(expect.objectContaining({ is_active: true }));
    });
  });

  describe('upsertByCompositeKeys', () => {
    it('if dataToSave is empty, should deactivate everything and return []', async () => {
      const repo = makeRepo();
      const service = new DummyService(repo, 'role_id');

      repo.update.mockResolvedValue(undefined);

      const res = await service.upsertByCompositeKeys(
        10,
        [],
        ['number', 'unit', 'description'] as any,
        2 as any,
      );

      expect(res).toEqual([]);
      expect(repo.update).toHaveBeenCalledTimes(1);
      expect(repo.update.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          result_id: 10,
          is_active: true,
          role_id: 2,
        }),
      );
    });

    it('should reuse existing items by compositeKey and deactivate missing ones', async () => {
      const repo = makeRepo();
      const service = new DummyService(repo);

      repo.find.mockResolvedValue([
        {
          id: 1,
          result_id: 10,
          number: 1,
          unit: 'kg',
          description: 'a',
          is_active: true,
        },
        {
          id: 2,
          result_id: 10,
          number: 2,
          unit: 'kg',
          description: 'b',
          is_active: true,
        },
      ]);
      repo.update.mockResolvedValue(undefined);
      repo.save.mockImplementation(async (items: any[]) => items);

      const res = await service.upsertByCompositeKeys(
        10,
        [{ number: 1, unit: 'kg', description: 'a' }],
        ['number', 'unit', 'description'] as any,
        undefined,
        undefined,
        undefined,
        7,
      );

      // one update to deactivate idsToDeactivate (id=2)
      expect(repo.update).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledTimes(1);
      const savedArg = repo.save.mock.calls[0][0];
      expect(savedArg[0]).toEqual(
        expect.objectContaining({ created_by: 7, last_updated_by: 7 }),
      );

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual(expect.objectContaining({ id: 1, is_active: true }));
    });
  });
});

