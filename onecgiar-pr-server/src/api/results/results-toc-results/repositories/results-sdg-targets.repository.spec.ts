import { ResultsSdgTargetRepository } from './results-sdg-targets.repository';

describe('ResultsSdgTargetRepository', () => {
  let repository: ResultsSdgTargetRepository;
  let mockQuery: jest.Mock;
  let mockHandlersError: { returnErrorRepository: jest.Mock };

  beforeEach(() => {
    mockHandlersError = {
      returnErrorRepository: jest.fn(),
    };

    const mockDataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };

    repository = new ResultsSdgTargetRepository(
      mockDataSource,
      mockHandlersError as any,
    );

    mockQuery = jest.fn();
    (repository as any).query = mockQuery;
  });

  describe('fisicalDelete', () => {
    it('executes delete statement and returns result', async () => {
      const expected = { affectedRows: 10 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.fisicalDelete(3);

      expect(mockQuery).toHaveBeenCalledWith(
        'delete rst from result_sdg_targets rst where rst.result_id = ?;',
        [3],
      );
      expect(result).toBe(expected);
    });

    it('delegates errors to HandlersError', async () => {
      const dbError = new Error('delete failed');
      const handled = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handled);

      const result = await repository.fisicalDelete(3);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsSdgTargetRepository.name,
        debug: true,
      });
      expect(result).toBe(handled);
    });
  });

  describe('logicalDelete', () => {
    it('executes update statement and returns result', async () => {
      const expected = { affectedRows: 4 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.logicalDelete(5);

      expect(mockQuery).toHaveBeenCalledWith(
        'update result_sdg_targets rst set rst.is_active = 0 where rst.result_id = ?;',
        [5],
      );
      expect(result).toBe(expected);
    });

    it('delegates errors to HandlersError', async () => {
      const dbError = new Error('logical failed');
      const handled = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handled);

      const result = await repository.logicalDelete(5);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsSdgTargetRepository.name,
        debug: true,
      });
      expect(result).toBe(handled);
    });
  });
});
