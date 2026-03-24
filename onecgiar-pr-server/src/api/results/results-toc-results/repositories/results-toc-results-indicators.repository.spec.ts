import { ResultsTocResultIndicatorsRepository } from './results-toc-results-indicators.repository';

describe('ResultsTocResultIndicatorsRepository', () => {
  let repository: ResultsTocResultIndicatorsRepository;
  let mockQuery: jest.Mock;
  let mockHandlersError: { returnErrorRepository: jest.Mock };

  beforeEach(() => {
    mockHandlersError = {
      returnErrorRepository: jest.fn(),
    };

    const mockDataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };

    repository = new ResultsTocResultIndicatorsRepository(
      mockDataSource,
      mockHandlersError as any,
    );

    mockQuery = jest.fn();
    (repository as any).query = mockQuery;
  });

  describe('fisicalDelete', () => {
    it('executes delete statement and returns result', async () => {
      const expected = { affectedRows: 9 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.fisicalDelete(101);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          'delete rtri from results_toc_result_indicators',
        ),
        [101],
      );
      expect(result).toBe(expected);
    });

    it('delegates errors to HandlersError', async () => {
      const dbError = new Error('delete failed');
      const handled = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handled);

      const result = await repository.fisicalDelete(101);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsTocResultIndicatorsRepository.name,
        debug: true,
      });
      expect(result).toBe(handled);
    });
  });

  describe('logicalDelete', () => {
    it('executes update statement and returns result', async () => {
      const expected = { affectedRows: 11 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.logicalDelete(202);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('update results_toc_result_indicators'),
        [202],
      );
      expect(result).toBe(expected);
    });

    it('delegates errors to HandlersError', async () => {
      const dbError = new Error('logical failed');
      const handled = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handled);

      const result = await repository.logicalDelete(202);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsTocResultIndicatorsRepository.name,
        debug: true,
      });
      expect(result).toBe(handled);
    });
  });
});
