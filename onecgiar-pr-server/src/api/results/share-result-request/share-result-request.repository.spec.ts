// @akili-spec notifications/bilateral-primary-sp-request PSR-T-4
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  ShareResultRequestRepository,
  composeApprovalChain,
} from './share-result-request.repository';
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

  // @akili-spec notifications/detail-side-panel (DSP-T-1)
  describe('getResultForApprovalChain', () => {
    it('reads the result + its status name in one query', async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: 9400,
          is_active: 1,
          status_id: 3,
          result_status_name: 'Submitted',
        },
      ]);

      const row = await repository.getResultForApprovalChain(9400);

      expect(row).toEqual({
        id: 9400,
        is_active: 1,
        status_id: 3,
        result_status_name: 'Submitted',
      });
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [9400]);
    });

    it('returns undefined when the result does not exist', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const row = await repository.getResultForApprovalChain(999999);

      expect(row).toBeUndefined();
    });
  });

  describe('getApprovalChainData', () => {
    it('runs the 3 reads (submission, initiative roles, requests) and shapes the result', async () => {
      mockQuery
        .mockResolvedValueOnce([{ status: 1, created_date: '2026-09-25' }]) // submission
        .mockResolvedValueOnce([{ initiative_id: 10, initiative_role_id: 1 }]) // roles
        .mockResolvedValueOnce([{ shared_inititiative_id: 11 }]); // requests

      const data = await repository.getApprovalChainData(9400);

      expect(data.submissionRow).toEqual({
        status: 1,
        created_date: '2026-09-25',
      });
      expect(data.initiativeRoleRows).toEqual([
        { initiative_id: 10, initiative_role_id: 1 },
      ]);
      expect(data.requestRows).toEqual([{ shared_inititiative_id: 11 }]);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('returns submissionRow undefined when there is no submission row at all', async () => {
      mockQuery
        .mockResolvedValueOnce([]) // no submission row
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const data = await repository.getApprovalChainData(9400);

      expect(data.submissionRow).toBeUndefined();
    });
  });
});

// @akili-spec notifications/detail-side-panel (DSP-T-1)
// DSP-R-8, DD-4 — `composeApprovalChain` is a pure function (raw rows in, DTO out): every test
// below feeds hand-built rows directly, with no repository or service mocked, per the task's
// disqualifier ("tests that mock the repository method under test prove nothing about the
// composition").
describe('composeApprovalChain (DSP-T-1, pure composition)', () => {
  const resultRow = {
    id: 9400,
    is_active: 1,
    status_id: 3,
    result_status_name: 'Submitted',
  };

  // DSP-R-8 "Mixed statuses (mockup case)" / DSP-AC-6: result 9400, submitted by Samuel Otieno,
  // primary SP04 (owner row, no active primary request), SP07 accepted, SP01 pending and is the
  // viewer's program.
  it('matches the mockup scenario exactly (order, statuses, actor/date, is_viewer_program)', () => {
    const submissionRow = {
      status: 1,
      created_date: new Date('2026-09-25T00:00:00Z'),
      actor_first_name: 'Samuel',
      actor_last_name: 'Otieno',
    };
    const initiativeRoleRows = [
      {
        initiative_id: 4,
        official_code: 'SP04',
        short_name: 'SP04',
        name: 'Science Program 04',
        initiative_role_id: 1,
        created_by_first_name: 'Samuel',
        created_by_last_name: 'Otieno',
        created_date: new Date('2026-09-20T00:00:00Z'),
      },
    ];
    const requestRows = [
      {
        shared_inititiative_id: 7,
        owner_initiative_id: 4,
        requester_initiative_id: 4,
        approving_inititiative_id: 7,
        official_code: 'SP07',
        short_name: 'SP07',
        name: 'Science Program 07',
        request_type: 'contribution' as const,
        request_status_id: 2,
        requested_date: new Date('2026-09-24T00:00:00Z'),
        aprovaed_date: new Date('2026-09-25T00:00:00Z'),
        requested_by_first_name: 'Ana',
        requested_by_last_name: 'Diaz',
        approved_by_first_name: 'Marta',
        approved_by_last_name: 'Kowalski',
      },
      {
        shared_inititiative_id: 1,
        owner_initiative_id: 4,
        requester_initiative_id: 4,
        approving_inititiative_id: 1,
        official_code: 'SP01',
        short_name: 'SP01',
        name: 'Science Program 01',
        request_type: 'contribution' as const,
        request_status_id: 1,
        requested_date: new Date('2026-09-23T00:00:00Z'),
        aprovaed_date: null,
        requested_by_first_name: 'Carlos',
        requested_by_last_name: 'Ruiz',
        approved_by_first_name: null,
        approved_by_last_name: null,
      },
    ];

    const dto = composeApprovalChain(
      9400,
      resultRow,
      submissionRow,
      initiativeRoleRows,
      requestRows,
      [1], // viewer's program is SP01
    );

    expect(dto.result_id).toBe(9400);
    expect(dto.submission).toEqual({
      state: 'submitted',
      result_status_id: 3,
      result_status_name: 'Submitted',
      actor_name: 'Samuel Otieno',
      date: submissionRow.created_date,
    });

    // Order: primary first, then contributors by official_code (SP01 before SP07).
    expect(dto.steps.map((s) => s.official_code)).toEqual([
      'SP04',
      'SP01',
      'SP07',
    ]);

    const [primary, sp01, sp07] = dto.steps;
    expect(primary).toMatchObject({
      role: 'primary',
      status: 'accepted',
      is_viewer_program: false,
    });
    expect(sp01).toMatchObject({
      role: 'contributor',
      status: 'pending',
      is_viewer_program: true,
      actor_name: 'Carlos Ruiz',
    });
    expect(sp07).toMatchObject({
      role: 'contributor',
      status: 'accepted',
      is_viewer_program: false,
      actor_name: 'Marta Kowalski',
    });
  });

  // Falsifier: "with no submission row, `submission.state` is not `not_submitted` or
  // `result_status_name` is null" (DSP-R-8 "Result not yet submitted").
  it('with no submission row at all, reports not_submitted using the result current status', () => {
    const dto = composeApprovalChain(9400, resultRow, undefined, [], []);

    expect(dto.submission).toEqual({
      state: 'not_submitted',
      result_status_id: 3,
      result_status_name: 'Submitted',
      actor_name: null,
      date: null,
    });
  });

  // Falsifier: "a status-4 draft appears in `steps`".
  it('excludes a status-4 draft contribution request from steps', () => {
    const draftRow = {
      shared_inititiative_id: 20,
      owner_initiative_id: null,
      requester_initiative_id: null,
      approving_inititiative_id: null,
      official_code: 'SP20',
      short_name: 'SP20',
      name: 'Science Program 20',
      request_type: 'contribution' as const,
      request_status_id: 4,
      requested_date: new Date('2026-09-20T00:00:00Z'),
      aprovaed_date: null,
      requested_by_first_name: 'A',
      requested_by_last_name: 'B',
      approved_by_first_name: null,
      approved_by_last_name: null,
    };

    const dto = composeApprovalChain(
      9400,
      resultRow,
      undefined,
      [],
      [draftRow],
    );

    expect(dto.steps).toEqual([]);
  });

  // Falsifier: "a primary request with status 1 shows the primary as `accepted`".
  it('maps an active primary request with status 1 to pending, not accepted', () => {
    const pendingPrimary = {
      shared_inititiative_id: 12,
      owner_initiative_id: null,
      requester_initiative_id: 12,
      approving_inititiative_id: 12,
      official_code: 'SP12',
      short_name: 'SP12',
      name: 'Science Program 12',
      request_type: 'primary' as const,
      request_status_id: 1,
      requested_date: new Date('2026-09-20T00:00:00Z'),
      aprovaed_date: null,
      requested_by_first_name: 'Primary',
      requested_by_last_name: 'Requester',
      approved_by_first_name: null,
      approved_by_last_name: null,
    };

    const dto = composeApprovalChain(
      9400,
      resultRow,
      undefined,
      [],
      [pendingPrimary],
    );

    expect(dto.steps).toHaveLength(1);
    expect(dto.steps[0]).toMatchObject({
      role: 'primary',
      status: 'pending',
      actor_name: 'Primary Requester',
    });
  });

  // Falsifier: "a role-2 contributor that also has an older declined request comes back
  // `declined`" — DD-4: a role-2 row always wins over a declined request.
  it('a role-2 contributor with an older declined request comes back accepted, not declined', () => {
    const role2Row = {
      initiative_id: 30,
      official_code: 'SP30',
      short_name: 'SP30',
      name: 'Science Program 30',
      initiative_role_id: 2,
      created_by_first_name: 'Owner',
      created_by_last_name: 'User',
      created_date: new Date('2026-09-22T00:00:00Z'),
    };
    const declinedRequest = {
      shared_inititiative_id: 30,
      owner_initiative_id: null,
      requester_initiative_id: 30,
      approving_inititiative_id: 30,
      official_code: 'SP30',
      short_name: 'SP30',
      name: 'Science Program 30',
      request_type: 'contribution' as const,
      request_status_id: 3,
      requested_date: new Date('2026-09-10T00:00:00Z'),
      aprovaed_date: new Date('2026-09-11T00:00:00Z'),
      requested_by_first_name: 'Req',
      requested_by_last_name: 'Ester',
      approved_by_first_name: 'App',
      approved_by_last_name: 'Rover',
    };

    const dto = composeApprovalChain(
      9400,
      resultRow,
      undefined,
      [role2Row],
      [declinedRequest],
    );

    expect(dto.steps).toHaveLength(1);
    expect(dto.steps[0]).toMatchObject({
      role: 'contributor',
      status: 'accepted',
      actor_name: 'Owner User',
    });
  });

  // Falsifier: "two requests for SP01 (pending, newer than an accepted one) come back `accepted`"
  // — the latest request (by requested_date) must decide; no role-2 row in play here.
  it('the latest request wins: a newer pending request beats an older accepted one', () => {
    const olderAccepted = {
      shared_inititiative_id: 1,
      owner_initiative_id: null,
      requester_initiative_id: 1,
      approving_inititiative_id: 1,
      official_code: 'SP01',
      short_name: 'SP01',
      name: 'Science Program 01',
      request_type: 'contribution' as const,
      request_status_id: 2,
      requested_date: new Date('2026-09-10T00:00:00Z'),
      aprovaed_date: new Date('2026-09-11T00:00:00Z'),
      requested_by_first_name: 'Old',
      requested_by_last_name: 'Requester',
      approved_by_first_name: 'Old',
      approved_by_last_name: 'Approver',
    };
    const newerPending = {
      shared_inititiative_id: 1,
      owner_initiative_id: null,
      requester_initiative_id: 1,
      approving_inititiative_id: 1,
      official_code: 'SP01',
      short_name: 'SP01',
      name: 'Science Program 01',
      request_type: 'contribution' as const,
      request_status_id: 1,
      requested_date: new Date('2026-09-24T00:00:00Z'),
      aprovaed_date: null,
      requested_by_first_name: 'New',
      requested_by_last_name: 'Requester',
      approved_by_first_name: null,
      approved_by_last_name: null,
    };

    const dto = composeApprovalChain(
      9400,
      resultRow,
      undefined,
      [],
      [olderAccepted, newerPending],
    );

    expect(dto.steps).toHaveLength(1);
    expect(dto.steps[0]).toMatchObject({
      status: 'pending',
      actor_name: 'New Requester',
    });
  });

  // Reviewer FAIL (attempt 1), issue 1: the only prior primary-request test fed
  // `initiativeRoleRows = []`, so an owner row never competed with the primary request. This test
  // feeds BOTH a role-1 owner row (a different initiative, SP04) and an active status-1 primary
  // request (SP12) and asserts the primary step comes from the REQUEST, not the owner — design.md
  // §5 item 2: "an active primary request ... wins over the owner row". SP04 must not appear in
  // `steps` at all.
  it('primary from request vs owner: an active primary request outranks the owner row', () => {
    const ownerRow = {
      initiative_id: 4,
      official_code: 'SP04',
      short_name: 'SP04',
      name: 'Science Program 04',
      initiative_role_id: 1,
      created_by_first_name: 'Owner',
      created_by_last_name: 'Person',
      created_date: new Date('2026-09-01T00:00:00Z'),
    };
    const pendingPrimaryRequest = {
      shared_inititiative_id: 12,
      owner_initiative_id: null,
      requester_initiative_id: 12,
      approving_inititiative_id: 12,
      official_code: 'SP12',
      short_name: 'SP12',
      name: 'Science Program 12',
      request_type: 'primary' as const,
      request_status_id: 1,
      requested_date: new Date('2026-09-20T00:00:00Z'),
      aprovaed_date: null,
      requested_by_first_name: 'Primary',
      requested_by_last_name: 'Requester',
      approved_by_first_name: null,
      approved_by_last_name: null,
    };

    const dto = composeApprovalChain(
      9400,
      resultRow,
      undefined,
      [ownerRow],
      [pendingPrimaryRequest],
    );

    const primarySteps = dto.steps.filter((s) => s.role === 'primary');
    expect(primarySteps).toHaveLength(1);
    expect(primarySteps[0]).toMatchObject({
      official_code: 'SP12',
      status: 'pending',
      actor_name: 'Primary Requester',
    });
    expect(dto.steps.some((s) => s.official_code === 'SP04')).toBe(false);
  });
});
