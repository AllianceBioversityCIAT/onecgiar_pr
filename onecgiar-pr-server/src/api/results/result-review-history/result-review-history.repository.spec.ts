import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultReviewHistoryRepository } from './result-review-history.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

describe('ResultReviewHistoryRepository', () => {
  let repository: ResultReviewHistoryRepository;
  const mockQuery = jest.fn();
  const mockHandlersError = { returnErrorRepository: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultReviewHistoryRepository,
        {
          provide: DataSource,
          useValue: { createEntityManager: jest.fn() },
        },
        { provide: HandlersError, useValue: mockHandlersError },
      ],
    }).compile();

    repository = module.get<ResultReviewHistoryRepository>(
      ResultReviewHistoryRepository,
    );
    (repository as any).query = mockQuery;
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  // P2-3157 AC4 — the centre-facing read of the rejection justification.
  describe('getReviewHistoryByResultId', () => {
    it('returns the review trail for the result', async () => {
      const rows = [
        {
          id: 2,
          result_id: 55,
          action: 'REJECT',
          comment: 'Geo-scope is missing',
          created_at: '2026-08-19T10:00:00.000Z',
          created_by: 9,
          first_name: 'Ana',
          last_name: 'Reviewer',
          email: 'ana@example.com',
        },
      ];
      mockQuery.mockResolvedValue(rows);

      const result = await repository.getReviewHistoryByResultId(55);

      expect(result).toEqual(rows);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [55]);
    });

    it('selects the comment and orders newest first', async () => {
      mockQuery.mockResolvedValue([]);

      await repository.getReviewHistoryByResultId(55);

      const [query] = mockQuery.mock.calls.at(-1);
      expect(query).toContain('rrh.comment');
      expect(query).toContain('ORDER BY rrh.created_at DESC');
    });

    it('returns an empty array when the result has no review entries', async () => {
      mockQuery.mockResolvedValue([]);

      expect(await repository.getReviewHistoryByResultId(999)).toEqual([]);
    });

    it('delegates failures to the shared error handler', async () => {
      const error = new Error('db down');
      mockQuery.mockRejectedValue(error);
      mockHandlersError.returnErrorRepository.mockReturnValue(error);

      await expect(repository.getReviewHistoryByResultId(55)).rejects.toBe(
        error,
      );
      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith(
        expect.objectContaining({
          className: ResultReviewHistoryRepository.name,
        }),
      );
    });
  });
});
