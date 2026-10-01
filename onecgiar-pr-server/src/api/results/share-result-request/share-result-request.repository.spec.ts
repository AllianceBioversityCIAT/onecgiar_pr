// @akili-spec notifications/bilateral-primary-sp-request PSR-T-4
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ShareResultRequestRepository } from './share-result-request.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RequestTypeEnum } from './entities/share-result-request.entity';

/**
 * Forward pointer recorded against T-4 (T-2 attempt-2 / T-3 review, execution.md): the
 * owner/shared lookup in `shareResultRequestExists` (`owner_initiative_id = ? AND
 * shared_inititiative_id = ?`) can match a `primary` row, because design.md §3.1 inserts that row
 * with `owner_initiative_id = shared_inititiative_id = requested SP`. Scoping the lookup to
 * `request_type = 'contribution'` closes it.
 */
describe('ShareResultRequestRepository (PSR-T-4 — owner/shared lookup scoped to contribution rows)', () => {
  let repository: ShareResultRequestRepository;
  const mockQuery = jest.fn();
  const mockDataSource = { createEntityManager: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareResultRequestRepository,
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: HandlersError,
          useValue: {
            returnErrorRepository: jest.fn((config) => {
              throw config.error;
            }),
          },
        },
      ],
    }).compile();

    repository = module.get<ShareResultRequestRepository>(
      ShareResultRequestRepository,
    );
    repository.query = mockQuery;
  });

  describe('shareResultRequestExists', () => {
    it('scopes the owner/shared lookup to contribution rows, so an owner==shared primary row never matches', async () => {
      mockQuery
        .mockResolvedValueOnce([{ count: 0 }]) // draft-status probe
        .mockResolvedValueOnce([]); // main lookup

      // A pending primary row would have owner_initiative_id === shared_inititiative_id === 55.
      await repository.shareResultRequestExists(100, 55, 55);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const [mainSql, mainParams] = mockQuery.mock.calls[1];
      expect(mainSql).toMatch(/srr\.request_type\s*=\s*\?/);
      expect(mainParams).toEqual([
        100,
        55,
        55,
        1, // requestStatusId (no drafts found)
        RequestTypeEnum.CONTRIBUTION,
      ]);
    });

    it('still resolves an existing contribution row (regression: filter does not over-scope)', async () => {
      const existingRow = {
        share_result_request_id: 42,
        request_status_id: 1,
        owner_initiative_id: 1,
        shared_inititiative_id: 2,
      };
      mockQuery
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([existingRow]);

      const result = await repository.shareResultRequestExists(10, 1, 2);

      expect(result).toEqual(existingRow);
    });
  });
});
