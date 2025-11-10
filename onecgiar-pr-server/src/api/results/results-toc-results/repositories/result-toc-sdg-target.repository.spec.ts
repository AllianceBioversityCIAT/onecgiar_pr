import { ResultsTocSdgTargetRepository } from './result-toc-sdg-target.repository';

describe('ResultsTocSdgTargetRepository', () => {
  let repository: ResultsTocSdgTargetRepository;
  let mockQuery: jest.Mock;
  let mockHandlersError: { returnErrorRepository: jest.Mock };

  beforeEach(() => {
    mockHandlersError = {
      returnErrorRepository: jest.fn(),
    };

    const mockDataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };

    repository = new ResultsTocSdgTargetRepository(
      mockDataSource,
      mockHandlersError as any,
    );

    mockQuery = jest.fn();
    (repository as any).query = mockQuery;
  });

  describe('fisicalDelete', () => {
    it('executes delete query and returns result', async () => {
      const expected = { affectedRows: 6 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.fisicalDelete(55);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('delete rtrt from result_toc_sdg_targets'),
        [55],
      );
      expect(result).toBe(expected);
    });

    it('delegates errors to HandlersError', async () => {
      const dbError = new Error('delete failed');
      const handled = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handled);

      const result = await repository.fisicalDelete(55);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsTocSdgTargetRepository.name,
        debug: true,
      });
      expect(result).toBe(handled);
    });
  });

  describe('logicalDelete', () => {
    it('executes update query and returns result', async () => {
      const expected = { affectedRows: 8 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.logicalDelete(88);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('update result_toc_sdg_targets'),
        [88],
      );
      expect(result).toBe(expected);
    });

    it('delegates errors to HandlersError', async () => {
      const dbError = new Error('logical failed');
      const handled = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handled);

      const result = await repository.logicalDelete(88);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsTocSdgTargetRepository.name,
        debug: true,
      });
      expect(result).toBe(handled);
    });
  });
});
