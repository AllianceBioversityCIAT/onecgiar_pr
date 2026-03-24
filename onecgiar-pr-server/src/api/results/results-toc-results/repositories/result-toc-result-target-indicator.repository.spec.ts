import { ResultsTocTargetIndicatorRepository } from './result-toc-result-target-indicator.repository';

describe('ResultsTocTargetIndicatorRepository', () => {
  let repository: ResultsTocTargetIndicatorRepository;
  let mockQuery: jest.Mock;
  let mockHandlersError: { returnErrorRepository: jest.Mock };

  beforeEach(() => {
    mockHandlersError = {
      returnErrorRepository: jest.fn(),
    };

    const mockDataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };

    repository = new ResultsTocTargetIndicatorRepository(
      mockDataSource,
      mockHandlersError as any,
    );

    mockQuery = jest.fn();
    (repository as any).query = mockQuery;
  });

  describe('fisicalDelete', () => {
    it('runs delete query and returns result', async () => {
      const expected = { affectedRows: 1 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.fisicalDelete(13);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('delete rit from result_indicators_targets'),
        [13],
      );
      expect(result).toBe(expected);
    });

    it('delegates errors to HandlersError', async () => {
      const dbError = new Error('delete failed');
      const handled = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handled);

      const result = await repository.fisicalDelete(13);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsTocTargetIndicatorRepository.name,
        debug: true,
      });
      expect(result).toBe(handled);
    });
  });

  describe('logicalDelete', () => {
    it('runs update query and returns result', async () => {
      const expected = { affectedRows: 2 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.logicalDelete(21);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('update result_indicators_targets'),
        [21],
      );
      expect(result).toBe(expected);
    });

    it('delegates errors to HandlersError', async () => {
      const dbError = new Error('logical failed');
      const handled = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handled);

      const result = await repository.logicalDelete(21);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsTocTargetIndicatorRepository.name,
        debug: true,
      });
      expect(result).toBe(handled);
    });
  });
});
