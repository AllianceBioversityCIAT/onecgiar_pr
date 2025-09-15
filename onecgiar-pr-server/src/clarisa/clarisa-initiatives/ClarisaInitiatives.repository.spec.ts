import { ClarisaInitiativesRepository } from './ClarisaInitiatives.repository';
import { ClarisaInitiative } from './entities/clarisa-initiative.entity';

describe('ClarisaInitiativesRepository', () => {
  let repository: ClarisaInitiativesRepository;

  const dataSourceMock = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as any;

  beforeEach(() => {
    repository = new ClarisaInitiativesRepository(dataSourceMock as any);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getAllInitiatives', () => {
    it('calls find with active true and relations', async () => {
      const spy = jest
        .spyOn(repository as any, 'find')
        .mockResolvedValue([{ id: 1 } as ClarisaInitiative]);
      const res = await repository.getAllInitiatives();
      expect(spy).toHaveBeenCalled();
      const args = (spy as jest.Mock).mock.calls[0][0];
      expect(args.order).toEqual({ official_code: 'ASC' });
      expect(args.relations).toEqual({ obj_cgiar_entity_type: true });
      expect(args.where.active).toBe(true);
      expect('cgiar_entity_type_id' in args.where).toBe(true);
      expect(res).toEqual([{ id: 1 }]);
    });
  });

  describe('deleteAllData', () => {
    it('executes delete query', async () => {
      const spy = jest
        .spyOn(repository as any, 'query')
        .mockResolvedValue({ affected: 1 } as any);
      const res = await repository.deleteAllData();
      expect(spy).toHaveBeenCalled();
      expect(res).toEqual({ affected: 1 });
    });
  });

  describe('getTocIdFromOst', () => {
    it('executes query using env.DB_OST', async () => {
      process.env.DB_OST = 'mydb';
      const spy = jest
        .spyOn(repository as any, 'query')
        .mockResolvedValue([{ toc_id: 'x' }] as any);
      const res = await repository.getTocIdFromOst();
      expect(spy).toHaveBeenCalled();
      expect(res).toEqual([{ toc_id: 'x' }]);
    });
  });

  describe('getAllInitiativesWithoutCurrentInitiative', () => {
    it('executes query with resultId as param', async () => {
      const spy = jest
        .spyOn(repository as any, 'query')
        .mockResolvedValue([{ id: 9 }] as any);
      const res = await repository.getAllInitiativesWithoutCurrentInitiative(5);
      expect(spy).toHaveBeenCalled();
      const args = (spy as jest.Mock).mock.calls[0];
      expect(args[1]).toEqual([5]);
      expect(res).toEqual([{ id: 9 }]);
    });

    it('adds portfolioId to params when provided', async () => {
      const spy = jest
        .spyOn(repository as any, 'query')
        .mockResolvedValue([{ id: 9 }] as any);
      const res = await repository.getAllInitiativesWithoutCurrentInitiative(
        5,
        2,
      );
      expect(spy).toHaveBeenCalled();
      const args = (spy as jest.Mock).mock.calls[0];
      expect(args[1]).toEqual([5, 2]);
      expect(res).toEqual([{ id: 9 }]);
    });
  });
});
