import { ResultsActionAreaOutcomeRepository } from './result-toc-action-area.repository';

describe('ResultsActionAreaOutcomeRepository', () => {
  let repository: ResultsActionAreaOutcomeRepository;
  let mockQuery: jest.Mock;
  let mockHandlersError: { returnErrorRepository: jest.Mock };

  beforeEach(() => {
    mockHandlersError = {
      returnErrorRepository: jest.fn(),
    };

    const mockDataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };

    repository = new ResultsActionAreaOutcomeRepository(
      mockDataSource,
      mockHandlersError as any,
    );

    mockQuery = jest.fn();
    (repository as any).query = mockQuery;
  });

  describe('fisicalDelete', () => {
    it('should execute delete query and return result', async () => {
      const expectedResponse = { affectedRows: 3 };
      mockQuery.mockResolvedValue(expectedResponse);

      const result = await repository.fisicalDelete(42);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('delete rtaa'),
        [42],
      );
      expect(result).toBe(expectedResponse);
    });

    it('should delegate errors to HandlersError', async () => {
      const dbError = new Error('db failure');
      const handledError = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handledError);

      const result = await repository.fisicalDelete(42);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsActionAreaOutcomeRepository.name,
        debug: true,
      });
      expect(result).toBe(handledError);
    });
  });

  describe('logicalDelete', () => {
    it('should execute logical update query and return result', async () => {
      const expectedResponse = { affectedRows: 5 };
      mockQuery.mockResolvedValue(expectedResponse);

      const result = await repository.logicalDelete(99);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('update result_toc_action_area'),
        [99],
      );
      expect(result).toBe(expectedResponse);
    });

    it('should delegate errors to HandlersError', async () => {
      const dbError = new Error('logical failure');
      const handledError = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handledError);

      const result = await repository.logicalDelete(99);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsActionAreaOutcomeRepository.name,
        debug: true,
      });
      expect(result).toBe(handledError);
    });
  });
});
