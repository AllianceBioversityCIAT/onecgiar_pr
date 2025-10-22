import { TocLevelRepository } from './toc-level.repository';

describe('TocLevelRepository', () => {
  let repository: TocLevelRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    const mockDataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };

    repository = new TocLevelRepository(mockDataSource);
    mockQuery = jest.fn();
    (repository as any).query = mockQuery;
  });

  describe('deleteAllData', () => {
    it('returns query result on success', async () => {
      const expected = { affectedRows: 2 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.deleteAllData();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM toc_level'),
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(repository.deleteAllData()).rejects.toMatchObject({
        message: expect.stringContaining('deleteAllData error'),
        status: 500,
      });
    });
  });

  describe('getAllTocLevel', () => {
    it('returns query result on success', async () => {
      const expected = [{ id: 1 } as any];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getAllTocLevel();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('from toc_level tl;'),
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(repository.getAllTocLevel()).rejects.toMatchObject({
        message: expect.stringContaining('getAllTocResults error'),
        status: 500,
      });
    });
  });

  describe('getTocLevelByResult', () => {
    it('returns query result on success', async () => {
      const expected = [{ id: 2 } as any];
      mockQuery.mockResolvedValue(expected);

      const result = await repository.getTocLevelByResult();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('from toc_level tl;'),
      );
      expect(result).toBe(expected);
    });

    it('throws formatted error on failure', async () => {
      mockQuery.mockRejectedValue(new Error('fail'));

      await expect(repository.getTocLevelByResult()).rejects.toMatchObject({
        message: expect.stringContaining('getAllTocResults error'),
        status: 500,
      });
    });
  });
});
