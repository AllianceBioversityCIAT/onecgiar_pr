import { ResultsTocImpactAreaTargetRepository } from './result-toc-impact-area.repository';

describe('ResultsTocImpactAreaTargetRepository', () => {
  let repository: ResultsTocImpactAreaTargetRepository;
  let mockQuery: jest.Mock;
  let mockHandlersError: { returnErrorRepository: jest.Mock };

  beforeEach(() => {
    mockHandlersError = {
      returnErrorRepository: jest.fn(),
    };

    const mockDataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };

    repository = new ResultsTocImpactAreaTargetRepository(
      mockDataSource,
      mockHandlersError as any,
    );

    mockQuery = jest.fn();
    (repository as any).query = mockQuery;
  });

  describe('fisicalDelete', () => {
    it('executes delete query and returns result', async () => {
      const expected = { affectedRows: 2 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.fisicalDelete(7);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('delete rtiat'),
        [7],
      );
      expect(result).toBe(expected);
    });

    it('delegates error handling to HandlersError', async () => {
      const dbError = new Error('delete failed');
      const handled = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handled);

      const result = await repository.fisicalDelete(7);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsTocImpactAreaTargetRepository.name,
        debug: true,
      });
      expect(result).toBe(handled);
    });
  });

  describe('logicalDelete', () => {
    it('executes update query and returns result', async () => {
      const expected = { affectedRows: 4 };
      mockQuery.mockResolvedValue(expected);

      const result = await repository.logicalDelete(11);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('update result_toc_impact_area_target'),
        [11],
      );
      expect(result).toBe(expected);
    });

    it('delegates error handling to HandlersError', async () => {
      const dbError = new Error('logical failed');
      const handled = { message: 'handled', status: 500, response: {} };
      mockQuery.mockRejectedValue(dbError);
      mockHandlersError.returnErrorRepository.mockReturnValue(handled);

      const result = await repository.logicalDelete(11);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: ResultsTocImpactAreaTargetRepository.name,
        debug: true,
      });
      expect(result).toBe(handled);
    });
  });
});
