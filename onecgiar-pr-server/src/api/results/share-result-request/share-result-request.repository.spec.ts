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

    // `PNS-T-1` (design.md §5 item 6): status 4 is now ALSO used by a saved-but-not-sent `primary`
    // row (`PNS-DD-1`) — without a `request_type` filter, the draft-count probe would be tripped
    // by a draft `primary` row that has nothing to do with contribution drafts. Must be seen red:
    // today's draft-count query has no `request_type` column at all.
    it('scopes the draft-status probe to contribution rows (PNS-R-1)', async () => {
      mockQuery.mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([]);

      await repository.shareResultRequestExists(100, 55, 56);

      const [draftSql, draftParams] = mockQuery.mock.calls[0];
      expect(draftSql).toMatch(/srr\.request_type\s*=\s*\?/);
      expect(draftParams).toEqual([100, RequestTypeEnum.CONTRIBUTION]);
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

  // `PNS-T-1` (design.md §1A P-5) — verified gap: `getRequestByUser` had no `request_status_id`
  // filter at all, so a DRAFT (4) `primary` row (`approving_inititiative_id` = the requested SP,
  // same as a sent request) would have rendered as an actionable inbox row for that SP's members.
  // Must be seen red: today's query has no such exclusion.
  describe('getRequestByUser — PNS-R-1 (P-5: a draft primary row must not reach the inbox)', () => {
    it('excludes an active DRAFT (status 4) primary row from the inbox query', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await repository.getRequestByUser(7, 3);

      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toMatch(
        /not\s*\(\s*srr\.request_type\s*=\s*'primary'\s*and\s*srr\.request_status_id\s*=\s*4\s*\)/i,
      );
    });
  });
});
