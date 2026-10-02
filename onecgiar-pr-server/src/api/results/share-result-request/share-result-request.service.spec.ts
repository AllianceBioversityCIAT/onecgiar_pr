import { Test, TestingModule } from '@nestjs/testing';
import { ShareResultRequestService } from './share-result-request.service';
import { ShareResultRequestRepository } from './share-result-request.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultsTocResultRepository } from '../results-toc-results/repositories/results-toc-results.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { ResultsTocResultsService } from '../results-toc-results/results-toc-results.service';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { UserNotificationSettingRepository } from '../../user-notification-settings/user-notification-settings.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { NotificationService } from '../../notification/notification.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { PrimaryProgramRequestService } from './services/primary-program-request.service';
import { HttpStatus } from '@nestjs/common';
import { FindOperator } from 'typeorm';

describe('ShareResultRequestService', () => {
  let service: ShareResultRequestService;

  const mockShareResultRequestRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  // `PSR-T-4`
  const mockPrimaryProgramRequestService = {
    accept: jest.fn(),
    decline: jest.fn(),
  };
  const mockResultRepository = {
    findOne: jest.fn(),
  };
  const mockNotificationService = {
    emitResultNotification: jest.fn(),
  };
  const mockResultsTocResultRepository = {
    getContributionReviewTocByResultAndInitiative: jest.fn(),
  };
  const mockRoleByUserRepository = {
    $_getMaxRoleByUser: jest.fn(),
    find: jest.fn(),
  };
  // PERF-T-1: getReceivedResultRequestPopUp needs these resolvable with real values.
  const mockUserRepository = {
    findOne: jest.fn(),
  };
  const mockVersioningService = {
    $_findActivePhase: jest.fn(),
  };

  const user = { id: 10 } as TokenDto;

  // @akili-spec notifications/inbox-paginated-load (PAGE-T-2) — named so paging tests can assert
  // the error object the catch block hands it (e.g. `status === 400`) without reimplementing the
  // existing inline-mock pattern used elsewhere in this file.
  const mockHandlersError = { returnErrorRes: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareResultRequestService,
        { provide: HandlersError, useValue: mockHandlersError },
        {
          provide: ShareResultRequestRepository,
          useValue: mockShareResultRequestRepository,
        },
        { provide: ResultRepository, useValue: mockResultRepository },
        {
          provide: PrimaryProgramRequestService,
          useValue: mockPrimaryProgramRequestService,
        },
        // P2-3188 additions. Both are only exercised by the contribution-decision emission, which
        // these suites do not reach — but the constructor needs them resolvable.
        {
          provide: ResultsCenterRepository,
          useValue: { getAllResultsCenterByResultId: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        { provide: ResultByInitiativesRepository, useValue: {} },
        {
          provide: ResultsTocResultRepository,
          useValue: mockResultsTocResultRepository,
        },
        { provide: ResultInitiativeBudgetRepository, useValue: {} },
        {
          provide: RoleByUserRepository,
          useValue: mockRoleByUserRepository,
        },
        { provide: EmailNotificationManagementService, useValue: {} },
        { provide: ClarisaInitiativesRepository, useValue: {} },
        { provide: TemplateRepository, useValue: {} },
        { provide: ResultsTocResultsService, useValue: {} },
        { provide: GlobalParameterRepository, useValue: {} },
        { provide: UserNotificationSettingRepository, useValue: {} },
        { provide: VersioningService, useValue: mockVersioningService },
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get(ShareResultRequestService);
  });

  describe('getReceivedResultRequest (P2-3086)', () => {
    beforeEach(() => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
      mockRoleByUserRepository.find.mockResolvedValue([{ initiative_id: 100 }]);
    });

    it('should attach toc_contribution_review for is_map_to_toc requests', async () => {
      const tocReview = [
        {
          level: 'High Level Outcome',
          outcome_label: 'Outcome A',
          outcome_statement: 'Statement text',
          indicator_typology: 'Number of people',
          unit_of_measurement: 'People',
          target: 200,
          contribution_target: 45,
        },
      ];

      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 1,
            result_id: 500,
            shared_inititiative_id: 42,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result', result_code: 'R-500' },
            obj_shared_inititiative: { id: 42, official_code: 'SP02' },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative.mockResolvedValue(
        tocReview,
      );

      const response: any = await service.getReceivedResultRequest(user);

      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledWith(500, 42);
      expect(
        response.response.receivedContributionsPending[0]
          .toc_contribution_review,
      ).toEqual(tocReview);
    });

    it('should not attach toc_contribution_review for non-toc requests', async () => {
      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 2,
            result_id: 501,
            shared_inititiative_id: 43,
            request_status_id: 1,
            is_map_to_toc: false,
            obj_result: { source: 'Result', result_code: 'R-501' },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response: any = await service.getReceivedResultRequest(user);

      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).not.toHaveBeenCalled();
      expect(
        response.response.receivedContributionsPending[0]
          .toc_contribution_review,
      ).toBeUndefined();
    });

    // NOTIF-T-16 REWORK (Reviewer fail, attempt 2): `results_by_projects` is soft-deleted
    // (`is_active: false`), not removed, when a project is unlinked from a result
    // (`results_by_projects.service.ts:92-100`). `getRequest()` must drop inactive links before
    // the response reaches the client, mirroring `ResultTaggedNotificationService` /
    // `BilateralProjectsService.getProjectsByCenter`.
    it('drops inactive obj_result_by_project links and keeps only the active one', async () => {
      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 5,
            result_id: 700,
            shared_inititiative_id: 60,
            request_status_id: 1,
            is_map_to_toc: false,
            obj_result: {
              source: 'Result',
              result_code: 'R-700',
              obj_result_by_project: [
                {
                  id: 1,
                  project_id: 10,
                  is_active: true,
                  obj_clarisa_project: { id: 10, shortName: 'B-A1080' },
                },
                {
                  id: 2,
                  project_id: 11,
                  is_active: false,
                  obj_clarisa_project: { id: 11, shortName: 'B-A9999' },
                },
              ],
            },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response: any = await service.getReceivedResultRequest(user);

      const links =
        response.response.receivedContributionsPending[0].obj_result
          .obj_result_by_project;
      expect(links).toHaveLength(1);
      expect(links[0].id).toBe(1);
      expect(links[0].is_active).toBe(true);
    });

    it('should cache toc review lookups for duplicate result/initiative pairs', async () => {
      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 3,
            result_id: 600,
            shared_inititiative_id: 55,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result' },
          },
          {
            share_result_request_id: 4,
            result_id: 600,
            shared_inititiative_id: 55,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result' },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative.mockResolvedValue(
        [],
      );

      await service.getReceivedResultRequest(user);

      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledTimes(1);
    });
  });

  // P2-3430 (2026-09-08). A contribution request is its own durable in-app notification: the bell
  // merges pending received requests into the pop-up (`getReceivedResultRequestPopUp`) and the
  // Requests tab lists them. Writing a `notification` row here as well would show the same request
  // twice, so creating requests must persist the request and mail — and emit nothing else.
  describe('saveShareResultRequests (P2-3430)', () => {
    it('persists the requests, mails the programme, and emits no notification row', async () => {
      const sendEmails = jest
        .spyOn(service as any, 'sendEmailsForShareRequests')
        .mockResolvedValue(undefined);
      mockShareResultRequestRepository.save.mockResolvedValue([]);
      mockShareResultRequestRepository.update.mockResolvedValue(undefined);

      const fresh = { shared_inititiative_id: 42, request_status_id: 1 } as any;
      const existing = {
        share_result_request_id: 9,
        shared_inititiative_id: 43,
        request_status_id: 1,
        is_active: true,
      } as any;

      await (service as any).saveShareResultRequests(
        [fresh, existing],
        'email_template_contribution',
        500,
        user,
      );

      expect(mockShareResultRequestRepository.save).toHaveBeenCalledWith([
        fresh,
      ]);
      expect(mockShareResultRequestRepository.update).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ request_status_id: 1, is_active: true }),
      );
      expect(sendEmails).toHaveBeenCalledWith(
        [fresh, existing],
        user,
        500,
        'email_template_contribution',
      );
      expect(
        mockNotificationService.emitResultNotification,
      ).not.toHaveBeenCalled();
    });

    it('no longer knows about the socket push that had no caller', () => {
      expect((service as any).sendSocketNotification).toBeUndefined();
      expect((service as any)._socketManagementService).toBeUndefined();
    });
  });

  // PERF-T-1 (bugfix/notifications-inbox-slow-load): parallelize the 3 per-feed getRequest()
  // calls and dedupe the admin's pendingOwner/pendingShared fetch. Falsifier per tasks.md: a
  // tracer proves all calls are ISSUED before any RESOLVES (not sequential awaits), and the
  // admin branch proves the repository .find() runs once, not twice, for the shared condition.
  describe('PERF-T-1 — concurrency and admin dedupe', () => {
    /**
     * Tracer double for `ShareResultRequestRepository.find`: records `issued:N` synchronously
     * when called, then `resolved:N` after a macrotask tick. If calls are sequential awaits,
     * `resolved:N` always appears before `issued:N+1`; if concurrent, all `issued:*` entries
     * appear back-to-back before any `resolved:*`.
     */
    function installFindTracer(order: string[]) {
      let callIndex = 0;
      mockShareResultRequestRepository.find.mockImplementation(() => {
        const idx = callIndex++;
        order.push(`issued:${idx}`);
        return new Promise((resolve) => {
          setTimeout(() => {
            order.push(`resolved:${idx}`);
            resolve([]);
          }, 0);
        });
      });
    }

    describe('getReceivedResultRequest', () => {
      it('issues all 3 getRequest calls concurrently for a non-admin user', async () => {
        mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
        mockRoleByUserRepository.find.mockResolvedValue([
          { initiative_id: 100 },
        ]);
        const order: string[] = [];
        installFindTracer(order);

        await service.getReceivedResultRequest(user);

        expect(order.slice(0, 3)).toEqual(['issued:0', 'issued:1', 'issued:2']);
      });

      it('reuses the single admin fetch instead of issuing the identical query twice', async () => {
        mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(1);
        mockRoleByUserRepository.find.mockResolvedValue([
          { initiative_id: 100 },
        ]);
        mockShareResultRequestRepository.find.mockResolvedValue([]);

        await service.getReceivedResultRequest(user);

        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(2);
      });
    });

    describe('getSentResultRequest', () => {
      it('issues all 3 getRequest calls concurrently for a non-admin user', async () => {
        mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
        mockRoleByUserRepository.find.mockResolvedValue([
          { initiative_id: 100 },
        ]);
        const order: string[] = [];
        installFindTracer(order);

        await service.getSentResultRequest(user);

        expect(order.slice(0, 3)).toEqual(['issued:0', 'issued:1', 'issued:2']);
      });

      it('reuses the single admin fetch instead of issuing the identical query twice', async () => {
        mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(1);
        mockRoleByUserRepository.find.mockResolvedValue([
          { initiative_id: 100 },
        ]);
        mockShareResultRequestRepository.find.mockResolvedValue([]);

        await service.getSentResultRequest(user);

        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(2);
      });
    });

    describe('getReceivedResultRequestPopUp (2-bucket case, consumer per PERF-P-5)', () => {
      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue({
          last_pop_up_viewed: null,
        });
        mockVersioningService.$_findActivePhase.mockResolvedValue({ id: 99 });
      });

      it('issues both getRequest calls concurrently for a non-admin user', async () => {
        mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
        mockRoleByUserRepository.find.mockResolvedValue([
          { initiative_id: 100 },
        ]);
        const order: string[] = [];
        installFindTracer(order);

        await service.getReceivedResultRequestPopUp(user);

        expect(order.slice(0, 2)).toEqual(['issued:0', 'issued:1']);
      });

      it('reuses the single admin fetch instead of issuing the identical query twice', async () => {
        mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(1);
        mockRoleByUserRepository.find.mockResolvedValue([
          { initiative_id: 100 },
        ]);
        mockShareResultRequestRepository.find.mockResolvedValue([]);

        await service.getReceivedResultRequestPopUp(user);

        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(1);
      });
    });
  });

  // PERF-T-2 (bugfix/notifications-inbox-slow-load): `enrichRequestsWithTocContributionReview`
  // moves out of `getRequest` into a single per-feed orchestration pass. Falsifier per tasks.md:
  // the same (result_id, initiative_id) pair appears in two DIFFERENT buckets — the repository
  // lookup MUST fire exactly once for that pair, and BOTH rows in the response MUST carry the
  // same `toc_contribution_review`. Covers Received, Sent, and the popup (its 2-bucket case).
  describe('PERF-T-2 — batch ToC enrichment once per feed across all buckets', () => {
    const tocReview = [
      {
        level: 'High Level Outcome',
        outcome_label: 'Outcome A',
        outcome_statement: 'Statement text',
        indicator_typology: 'Number of people',
        unit_of_measurement: 'People',
        target: 200,
        contribution_target: 45,
      },
    ];

    beforeEach(() => {
      mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative.mockResolvedValue(
        tocReview,
      );
    });

    it('Received: enriches a pair spanning pendingOwner and done exactly once, on both rows', async () => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
      mockRoleByUserRepository.find.mockResolvedValue([{ initiative_id: 100 }]);

      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 10,
            result_id: 900,
            shared_inititiative_id: 77,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result' },
          },
        ]) // pendingOwner
        .mockResolvedValueOnce([]) // pendingShared
        .mockResolvedValueOnce([
          {
            share_result_request_id: 11,
            result_id: 900,
            shared_inititiative_id: 77,
            request_status_id: 2,
            is_map_to_toc: true,
            requested_date: '2026-01-05T00:00:00.000Z',
            obj_result: { source: 'Result' },
          },
        ]); // done

      const response: any = await service.getReceivedResultRequest(user);

      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledWith(900, 77);
      expect(
        response.response.receivedContributionsPending[0]
          .toc_contribution_review,
      ).toEqual(tocReview);
      expect(
        response.response.receivedContributionsDone[0].toc_contribution_review,
      ).toEqual(tocReview);
    });

    it('Sent: enriches a pair spanning pendingOwner and done exactly once, on both rows', async () => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
      mockRoleByUserRepository.find.mockResolvedValue([{ initiative_id: 100 }]);

      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 20,
            result_id: 901,
            shared_inititiative_id: 78,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result' },
          },
        ]) // pendingOwner
        .mockResolvedValueOnce([]) // pendingShared
        .mockResolvedValueOnce([
          {
            share_result_request_id: 21,
            result_id: 901,
            shared_inititiative_id: 78,
            request_status_id: 2,
            is_map_to_toc: true,
            requested_date: '2026-01-06T00:00:00.000Z',
            obj_result: { source: 'Result' },
          },
        ]); // done

      const response: any = await service.getSentResultRequest(user);

      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledWith(901, 78);
      expect(
        response.response.sentContributionsPending[0].toc_contribution_review,
      ).toEqual(tocReview);
      expect(
        response.response.sentContributionsDone[0].toc_contribution_review,
      ).toEqual(tocReview);
    });

    it('PopUp (Disqualifier guard): enriches a pair spanning its 2 buckets exactly once, on both rows', async () => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
      mockRoleByUserRepository.find.mockResolvedValue([{ initiative_id: 100 }]);
      mockUserRepository.findOne.mockResolvedValue({
        last_pop_up_viewed: null,
      });
      mockVersioningService.$_findActivePhase.mockResolvedValue({ id: 99 });

      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 30,
            result_id: 902,
            shared_inititiative_id: 79,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result' },
          },
        ]) // pendingOwner
        .mockResolvedValueOnce([
          {
            share_result_request_id: 31,
            result_id: 902,
            shared_inititiative_id: 79,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result' },
          },
        ]); // pendingShared

      const response: any = await service.getReceivedResultRequestPopUp(user);

      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledWith(902, 79);

      const bySharedId = new Map<number, any>(
        response.map((row: any) => [row.share_result_request_id, row]),
      );
      expect(bySharedId.get(30).toc_contribution_review).toEqual(tocReview);
      expect(bySharedId.get(31).toc_contribution_review).toEqual(tocReview);
    });

    it('admin dedupe case: does not double-count the shared pendingOwner/pendingShared array in the union', async () => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(1); // admin
      mockRoleByUserRepository.find.mockResolvedValue([{ initiative_id: 100 }]);

      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 40,
            result_id: 903,
            shared_inititiative_id: 80,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result' },
          },
        ]) // shared admin condition (pendingOwner === pendingShared)
        .mockResolvedValueOnce([]); // done

      const response: any = await service.getReceivedResultRequest(user);

      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledTimes(1);
      expect(
        response.response.receivedContributionsPending[0]
          .toc_contribution_review,
      ).toEqual(tocReview);
    });

    // NOTIF-BUG-1 (2026-09-30, user-reported): an application-level admin (role 1) with NO
    // initiative-level role_by_user row (`mockRoleByUserRepository.find` → []) got an
    // `In([])`-scoped `done` query — matching zero rows regardless of what resolved requests
    // actually exist — even though the `pendingOwner`/`pendingShared` buckets already bypass that
    // scoping for the same admin. Both Received and Sent must show resolved requests unfiltered
    // for an admin, exactly like pending ones.
    it('Received: an admin with no initiative-level role still sees resolved (accepted/declined) requests', async () => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(1); // admin
      mockRoleByUserRepository.find.mockResolvedValue([]); // no initiative-level role rows

      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([]) // shared admin condition (pendingOwner === pendingShared)
        .mockResolvedValueOnce([
          {
            share_result_request_id: 50,
            result_id: 904,
            shared_inititiative_id: 80,
            request_status_id: 2,
            is_map_to_toc: false,
            requested_date: '2026-01-07T00:00:00.000Z',
            obj_result: { source: 'Result' },
          },
        ]); // done

      const response: any = await service.getReceivedResultRequest(user);

      const doneWhere =
        mockShareResultRequestRepository.find.mock.calls[1][0].where;
      expect(Array.isArray(doneWhere)).toBe(true);
      expect(doneWhere).toHaveLength(1);
      expect(doneWhere[0]).not.toHaveProperty('shared_inititiative_id');
      expect(doneWhere[0]).not.toHaveProperty('owner_initiative_id');
      expect(response.response.receivedContributionsDone).toHaveLength(1);
      expect(
        response.response.receivedContributionsDone[0].share_result_request_id,
      ).toBe(50);
    });

    it('Sent: an admin with no initiative-level role still sees resolved (accepted/declined) requests', async () => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(1); // admin
      mockRoleByUserRepository.find.mockResolvedValue([]); // no initiative-level role rows

      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([]) // shared admin condition (pendingOwner === pendingShared)
        .mockResolvedValueOnce([
          {
            share_result_request_id: 51,
            result_id: 905,
            owner_initiative_id: 80,
            request_status_id: 3,
            is_map_to_toc: false,
            requested_date: '2026-01-08T00:00:00.000Z',
            obj_result: { source: 'Result' },
          },
        ]); // done

      const response: any = await service.getSentResultRequest(user);

      const doneWhere =
        mockShareResultRequestRepository.find.mock.calls[1][0].where;
      expect(Array.isArray(doneWhere)).toBe(true);
      expect(doneWhere).toHaveLength(1);
      expect(doneWhere[0]).not.toHaveProperty('shared_inititiative_id');
      expect(doneWhere[0]).not.toHaveProperty('owner_initiative_id');
      expect(response.response.sentContributionsDone).toHaveLength(1);
      expect(
        response.response.sentContributionsDone[0].share_result_request_id,
      ).toBe(51);
    });
  });

  // PERF-T-3 (bugfix/notifications-inbox-slow-load): mandatory Bug Mode regression test for
  // PERF-R-4 / PERF-AC-1 — content-parity across Received/Sent/Popup once PERF-T-1 + PERF-T-2 are
  // both applied. Leader ruling: a pure content-parity assertion necessarily passes on pre-fix code
  // too, so each scenario asserts BOTH (a) response content deep-equals a hand-authored fixture,
  // and (b) total `ShareResultRequestRepository.find` calls + total
  // `getContributionReviewTocByResultAndInitiative` calls per feed. Red run = (b) fails on pre-fix
  // code while (a) passes; green = both pass on current code. NOTIF-BUG-1's unscoped admin `done`
  // is treated as intended (per Leader ruling) — this suite never asserts on the `done` where-shape,
  // only on response content and call counts, both of which are independent of that where-shape
  // change under a mocked repository.
  describe('PERF-T-3 — content-parity regression across Received/Sent/Popup', () => {
    /**
     * Routes `ShareResultRequestRepository.find` by the STRUCTURAL shape of its `where` argument,
     * not by call order/count — this lets the exact same fixture and test body run unmodified
     * whether the code issues 2 or 3 calls (admin dedupe) and regardless of call ordering
     * (concurrent vs sequential). Bucket identity is structural and endpoint-agnostic:
     *   - `Array.isArray(where)`            -> the `done` bucket (2- or 1-part OR array).
     *   - `'shared_inititiative_id' in where` -> whichever pending bucket scopes on it
     *     (`pendingOwner` for Received, `pendingShared` for Sent).
     *   - `'owner_initiative_id' in where`     -> the other pending bucket.
     *   - neither key present                 -> the admin (`role===1`) shared `commonConditions`
     *     bucket, reused verbatim for both `pendingOwner`/`pendingShared` positions.
     */
    function installRoutedFind(routes: {
      sharedKey?: any[];
      ownerKey?: any[];
      done?: any[];
      admin?: any[];
    }) {
      mockShareResultRequestRepository.find.mockImplementation(
        async ({ where }: any) => {
          if (Array.isArray(where)) return routes.done ?? [];
          if ('shared_inititiative_id' in where) return routes.sharedKey ?? [];
          if ('owner_initiative_id' in where) return routes.ownerKey ?? [];
          return routes.admin ?? [];
        },
      );
    }

    /**
     * Mirrors `getRequest`'s fetch-and-map step so expected fixtures aren't duplicating it.
     * `PSR-T-4`: every row now also carries `request_type` (defaults to `contribution`) and
     * `creating_center` (derived from `obj_result.result_center_array`, which none of these
     * fixtures set, so it resolves to `null`) — see `attachPrimaryRequestFields`. None of these
     * fixtures are Bilateral-sourced, so `owner_program_code` is never added.
     */
    function mapExpectedRow(row: any, toc?: any[]) {
      const mapped = {
        ...row,
        obj_result: {
          ...row.obj_result,
          source_name:
            row.obj_result.source === 'Result' ? 'W1/W2' : 'W3/Bilaterals',
          obj_result_by_project: (
            row.obj_result.obj_result_by_project ?? []
          ).filter((l: any) => l.is_active),
        },
        request_type: row.request_type ?? 'contribution',
        creating_center: null,
      };
      return toc !== undefined
        ? { ...mapped, toc_contribution_review: toc }
        : mapped;
    }

    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue({
        last_pop_up_viewed: null,
      });
      mockVersioningService.$_findActivePhase.mockResolvedValue({ id: 99 });
    });

    // Scenario 1 — non-admin user with both owner-side and shared-side pending/done rows.
    describe('Scenario 1 — non-admin, owner-side + shared-side pending/done rows', () => {
      const tocReviewS1 = [
        {
          level: 'Scenario1 Outcome',
          outcome_label: 'O1',
          outcome_statement: 'S1',
          indicator_typology: 'T1',
          unit_of_measurement: 'U1',
          target: 100,
          contribution_target: 10,
        },
      ];
      const sharedKeyRow = {
        share_result_request_id: 1001,
        result_id: 6001,
        shared_inititiative_id: 310,
        request_status_id: 1,
        is_map_to_toc: false,
        obj_result: { source: 'Result' },
      };
      const ownerKeyRow = {
        share_result_request_id: 1002,
        result_id: 6002,
        shared_inititiative_id: 311,
        request_status_id: 1,
        is_map_to_toc: true,
        obj_result: { source: 'Result' },
      };
      const doneRow = {
        share_result_request_id: 1003,
        result_id: 6003,
        shared_inititiative_id: 312,
        request_status_id: 2,
        is_map_to_toc: false,
        requested_date: '2026-01-01T00:00:00.000Z',
        obj_result: { source: 'Result' },
      };

      beforeEach(() => {
        mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
        mockRoleByUserRepository.find.mockResolvedValue([
          { initiative_id: 400 },
        ]);
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative.mockResolvedValue(
          tocReviewS1,
        );
        installRoutedFind({
          sharedKey: [sharedKeyRow],
          ownerKey: [ownerKeyRow],
          done: [doneRow],
        });
      });

      it('getReceivedResultRequest: content matches the pre-fix fixture; find=3, toc lookups=1', async () => {
        const response: any = await service.getReceivedResultRequest(user);

        expect(response.response.receivedContributionsPending).toEqual([
          mapExpectedRow(sharedKeyRow),
          mapExpectedRow(ownerKeyRow, tocReviewS1),
        ]);
        expect(response.response.receivedContributionsDone).toEqual([
          mapExpectedRow(doneRow),
        ]);
        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(3);
        expect(
          mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
        ).toHaveBeenCalledTimes(1);
      });

      it('getSentResultRequest: content matches the pre-fix fixture; find=3, toc lookups=1', async () => {
        const response: any = await service.getSentResultRequest(user);

        // buildWhereSentConditions swaps which key each pending position scopes on: pendingOwner
        // -> owner_initiative_id, pendingShared -> shared_inititiative_id.
        expect(response.response.sentContributionsPending).toEqual([
          mapExpectedRow(ownerKeyRow, tocReviewS1),
          mapExpectedRow(sharedKeyRow),
        ]);
        expect(response.response.sentContributionsDone).toEqual([
          mapExpectedRow(doneRow),
        ]);
        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(3);
        expect(
          mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
        ).toHaveBeenCalledTimes(1);
      });

      it('getReceivedResultRequestPopUp: content matches the pre-fix fixture; find=2, toc lookups=1', async () => {
        const response: any = await service.getReceivedResultRequestPopUp(user);

        // Order is deterministic both pre- and post-fix: combineAndDistinct(pendingOwner,
        // pendingShared) flattens in that positional order, and pendingOwner here scopes on
        // `shared_inititiative_id` -> sharedKeyRow first, then pendingShared's ownerKeyRow.
        expect(response).toEqual([
          mapExpectedRow(sharedKeyRow),
          mapExpectedRow(ownerKeyRow, tocReviewS1),
        ]);
        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(2);
        expect(
          mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
        ).toHaveBeenCalledTimes(1);
      });
    });

    // Scenario 2 — admin user (role === 1). Also has no initiative-level role row (NOTIF-BUG-1's
    // trigger), but this suite intentionally asserts only content + call counts, never the `done`
    // where-shape (Leader ruling 3).
    describe('Scenario 2 — admin user (role === 1)', () => {
      const tocReviewS2 = [
        {
          level: 'Scenario2 Outcome',
          outcome_label: 'O2',
          outcome_statement: 'S2',
          indicator_typology: 'T2',
          unit_of_measurement: 'U2',
          target: 200,
          contribution_target: 20,
        },
      ];
      const adminRow = {
        share_result_request_id: 2001,
        result_id: 7001,
        shared_inititiative_id: 320,
        request_status_id: 1,
        is_map_to_toc: true,
        obj_result: { source: 'Result' },
      };
      const adminDoneRow = {
        share_result_request_id: 2002,
        result_id: 7002,
        shared_inititiative_id: 321,
        request_status_id: 2,
        is_map_to_toc: false,
        requested_date: '2026-01-02T00:00:00.000Z',
        obj_result: { source: 'Result' },
      };

      beforeEach(() => {
        mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(1);
        mockRoleByUserRepository.find.mockResolvedValue([]);
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative.mockResolvedValue(
          tocReviewS2,
        );
        installRoutedFind({
          admin: [adminRow],
          done: [adminDoneRow],
        });
      });

      it('getReceivedResultRequest: content matches the pre-fix fixture; find count and toc lookups drop with the admin dedupe', async () => {
        const response: any = await service.getReceivedResultRequest(user);

        expect(response.response.receivedContributionsPending).toEqual([
          mapExpectedRow(adminRow, tocReviewS2),
        ]);
        expect(response.response.receivedContributionsDone).toEqual([
          mapExpectedRow(adminDoneRow),
        ]);
        // Pre-fix: 3 (no dedupe, 2 identical pending awaits + done). Post-fix: 2 (shared fetch
        // reused for pendingShared, + done).
        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(2);
        // Pre-fix: 2 (each of the 2 identical pending fetches enriches its own copy separately).
        // Post-fix: 1 (enrichBucketsOnce dedupes the shared array by reference before enriching).
        expect(
          mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
        ).toHaveBeenCalledTimes(1);
      });

      it('getSentResultRequest: content matches the pre-fix fixture; find count and toc lookups drop with the admin dedupe', async () => {
        const response: any = await service.getSentResultRequest(user);

        expect(response.response.sentContributionsPending).toEqual([
          mapExpectedRow(adminRow, tocReviewS2),
        ]);
        expect(response.response.sentContributionsDone).toEqual([
          mapExpectedRow(adminDoneRow),
        ]);
        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(2);
        expect(
          mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
        ).toHaveBeenCalledTimes(1);
      });

      it('getReceivedResultRequestPopUp: content matches the pre-fix fixture; find count and toc lookups drop with the admin dedupe', async () => {
        const response: any = await service.getReceivedResultRequestPopUp(user);

        expect(response).toEqual([mapExpectedRow(adminRow, tocReviewS2)]);
        // Pre-fix: 2 (pendingOwner + pendingShared, both identical, no dedupe). Post-fix: 1
        // (fetchTwoBucketsDeduped reuses the single fetch).
        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(1);
        // Pre-fix: 2 (each of the 2 identical fetches enriches separately). Post-fix: 1.
        expect(
          mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
        ).toHaveBeenCalledTimes(1);
      });
    });

    // Scenario 3 — a user whose `is_map_to_toc` rows span more than one bucket for the SAME
    // (result_id, initiative_id) pair. Exercises PERF-R-3's cross-bucket dedupe on top of content
    // parity: PERF-T-2's own tests already cover the isolated behaviour; this scenario re-asserts
    // it as part of the combined PERF-T-1+PERF-T-2 regression, with full content deep-equality.
    describe('Scenario 3 — is_map_to_toc rows spanning multiple buckets (non-admin)', () => {
      const tocReviewS3 = [
        {
          level: 'Scenario3 Outcome',
          outcome_label: 'O3',
          outcome_statement: 'S3',
          indicator_typology: 'T3',
          unit_of_measurement: 'U3',
          target: 300,
          contribution_target: 30,
        },
      ];

      beforeEach(() => {
        mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
        mockRoleByUserRepository.find.mockResolvedValue([
          { initiative_id: 500 },
        ]);
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative.mockResolvedValue(
          tocReviewS3,
        );
      });

      it('getReceivedResultRequest: pair spans pendingOwner + done — content matches the pre-fix fixture, toc lookups collapse to 1', async () => {
        const pendingRow = {
          share_result_request_id: 3001,
          result_id: 8001,
          shared_inititiative_id: 330,
          request_status_id: 1,
          is_map_to_toc: true,
          obj_result: { source: 'Result' },
        };
        const doneRow = {
          share_result_request_id: 3002,
          result_id: 8001,
          shared_inititiative_id: 330,
          request_status_id: 2,
          is_map_to_toc: true,
          requested_date: '2026-01-03T00:00:00.000Z',
          obj_result: { source: 'Result' },
        };
        installRoutedFind({ sharedKey: [pendingRow], done: [doneRow] });

        const response: any = await service.getReceivedResultRequest(user);

        expect(response.response.receivedContributionsPending).toEqual([
          mapExpectedRow(pendingRow, tocReviewS3),
        ]);
        expect(response.response.receivedContributionsDone).toEqual([
          mapExpectedRow(doneRow, tocReviewS3),
        ]);
        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(3);
        // Pre-fix: 2 (pendingOwner enriches its row; done enriches its row, separately).
        // Post-fix: 1 (enrichBucketsOnce resolves the shared (result_id, initiative_id) pair once
        // across the combined union).
        expect(
          mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
        ).toHaveBeenCalledTimes(1);
      });

      it('getSentResultRequest: pair spans pendingOwner + done — content matches the pre-fix fixture, toc lookups collapse to 1', async () => {
        const pendingRow = {
          share_result_request_id: 3011,
          result_id: 8011,
          shared_inititiative_id: 331,
          request_status_id: 1,
          is_map_to_toc: true,
          obj_result: { source: 'Result' },
        };
        const doneRow = {
          share_result_request_id: 3012,
          result_id: 8011,
          shared_inititiative_id: 331,
          request_status_id: 2,
          is_map_to_toc: true,
          requested_date: '2026-01-04T00:00:00.000Z',
          obj_result: { source: 'Result' },
        };
        // buildWhereSentConditions: pendingOwner scopes on owner_initiative_id.
        installRoutedFind({ ownerKey: [pendingRow], done: [doneRow] });

        const response: any = await service.getSentResultRequest(user);

        expect(response.response.sentContributionsPending).toEqual([
          mapExpectedRow(pendingRow, tocReviewS3),
        ]);
        expect(response.response.sentContributionsDone).toEqual([
          mapExpectedRow(doneRow, tocReviewS3),
        ]);
        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(3);
        expect(
          mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
        ).toHaveBeenCalledTimes(1);
      });

      it('getReceivedResultRequestPopUp: pair spans pendingOwner + pendingShared — content matches the pre-fix fixture, toc lookups collapse to 1', async () => {
        const ownerSideRow = {
          share_result_request_id: 3101,
          result_id: 8101,
          shared_inititiative_id: 340,
          request_status_id: 1,
          is_map_to_toc: true,
          obj_result: { source: 'Result' },
        };
        const sharedSideRow = {
          share_result_request_id: 3102,
          result_id: 8101,
          shared_inititiative_id: 340,
          request_status_id: 1,
          is_map_to_toc: true,
          obj_result: { source: 'Result' },
        };
        installRoutedFind({
          sharedKey: [ownerSideRow],
          ownerKey: [sharedSideRow],
        });

        const response: any = await service.getReceivedResultRequestPopUp(user);

        // Order is deterministic both pre- and post-fix: combineAndDistinct(pendingOwner,
        // pendingShared) flattens positionally, and pendingOwner here is routed via the
        // `shared_inititiative_id` key (ownerSideRow), pendingShared via `owner_initiative_id`
        // (sharedSideRow).
        expect(response).toEqual([
          mapExpectedRow(ownerSideRow, tocReviewS3),
          mapExpectedRow(sharedSideRow, tocReviewS3),
        ]);
        expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(2);
        // Pre-fix: 2 (each bucket enriches its own row separately). Post-fix: 1 (both rows share
        // the same (result_id, initiative_id) key in the merged pairMap).
        expect(
          mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
        ).toHaveBeenCalledTimes(1);
      });
    });
  });

  // @akili-spec notifications/bilateral-primary-sp-request PSR-T-4
  // updateResultRequestByUser(V2) must dispatch on the LOADED row's request_type, never on a DTO
  // field, and never reach the primary service for a contribution row.
  describe('PSR-T-4 — decide endpoint dispatch on request_type', () => {
    const actingUser = { id: 77 } as TokenDto;

    function contributionRow(overrides: any = {}) {
      return {
        share_result_request_id: 500,
        request_type: 'contribution',
        shared_inititiative_id: 10,
        owner_initiative_id: 20,
        is_map_to_toc: false,
        from_toc: false,
        ...overrides,
      };
    }

    function primaryRow(overrides: any = {}) {
      return {
        share_result_request_id: 700,
        request_type: 'primary',
        shared_inititiative_id: 55,
        owner_initiative_id: 55,
        request_status_id: 1,
        is_active: true,
        ...overrides,
      };
    }

    function buildDto(
      rr: any,
      requestStatusId: number,
      justification?: string,
    ) {
      return {
        result_request: rr,
        result_toc_result: { planned_result: false, result_toc_results: [] },
        request_status_id: requestStatusId,
        justification,
      } as any;
    }

    beforeEach(() => {
      mockResultRepository.findOne.mockResolvedValue({
        id: 1,
        is_active: true,
      });
    });

    it('a contribution request never calls the primary service and runs the existing flow', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue(
        contributionRow(),
      );
      const updateSpy = jest
        .spyOn(service as any, 'updateShareResultRequest')
        .mockResolvedValue(undefined);
      const approvalSpy = jest
        .spyOn(service as any, 'handleRequestApproval')
        .mockResolvedValue(undefined);
      const notifySpy = jest
        .spyOn(service as any, 'emitContributionDecisionNotification')
        .mockResolvedValue(undefined);

      const response: any = await service.updateResultRequestByUser(
        buildDto({ share_result_request_id: 500, result_id: 1 }, 2),
        actingUser,
      );

      expect(mockPrimaryProgramRequestService.accept).not.toHaveBeenCalled();
      expect(mockPrimaryProgramRequestService.decline).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalled();
      expect(approvalSpy).toHaveBeenCalled();
      expect(notifySpy).toHaveBeenCalled();
      expect(response.status).toBe(HttpStatus.OK);
    });

    it.each([
      ['updateResultRequestByUser', 2, 'accept'],
      ['updateResultRequestByUser', 3, 'decline'],
      ['updateResultRequestByUserV2', 2, 'accept'],
      ['updateResultRequestByUserV2', 3, 'decline'],
    ] as const)(
      '%s: a primary row with request_status_id=%i calls PrimaryProgramRequestService.%s, never the contribution path',
      async (method, statusId, fn) => {
        mockShareResultRequestRepository.findOne.mockResolvedValue(
          primaryRow(),
        );
        const updateSpy = jest.spyOn(
          service as any,
          'updateShareResultRequest',
        );
        mockPrimaryProgramRequestService.accept.mockResolvedValue({
          ok: true,
          shareResultRequestId: 700,
          state: 'accepted',
        });
        mockPrimaryProgramRequestService.decline.mockResolvedValue({
          ok: true,
          shareResultRequestId: 700,
          state: 'declined',
        });

        // PDR-T-2: a primary decline now needs a non-blank `justification` on the DTO — the
        // dispatcher 400s before reaching the service otherwise (see the dedicated 400 describe
        // block below for that guard). This test is about dispatch routing, so it supplies one.
        const response: any = await (service as any)[method](
          buildDto(
            { share_result_request_id: 700, result_id: 1 },
            statusId,
            fn === 'decline' ? 'Outside portfolio' : undefined,
          ),
          actingUser,
        );

        if (fn === 'decline') {
          expect(mockPrimaryProgramRequestService[fn]).toHaveBeenCalledWith(
            700,
            actingUser,
            'Outside portfolio',
          );
        } else {
          expect(mockPrimaryProgramRequestService[fn]).toHaveBeenCalledWith(
            700,
            actingUser,
          );
        }
        expect(updateSpy).not.toHaveBeenCalled();
        expect(response.response.request_type).toBe('primary');
        expect(response.status).toBe(HttpStatus.OK);
      },
    );

    it('dispatch uses the JWT-decoded user only — never a DTO field (forward pointer 1)', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue(primaryRow());
      mockPrimaryProgramRequestService.accept.mockResolvedValue({
        ok: true,
        shareResultRequestId: 700,
        state: 'accepted',
      });

      await service.updateResultRequestByUser(
        buildDto(
          {
            share_result_request_id: 700,
            result_id: 1,
            approved_by: 999999, // a DTO-borne id that must NOT reach the primary service
          } as any,
          2,
        ),
        actingUser,
      );

      expect(mockPrimaryProgramRequestService.accept).toHaveBeenCalledWith(
        700,
        actingUser,
      );
    });

    it.each([
      ['forbidden', HttpStatus.FORBIDDEN],
      ['conflict', HttpStatus.CONFLICT],
      ['not_found', HttpStatus.NOT_FOUND],
      ['internal_error', HttpStatus.INTERNAL_SERVER_ERROR],
    ] as const)(
      'maps a %s outcome to HTTP %i without leaking the underlying error',
      async (reason, expectedStatus) => {
        mockShareResultRequestRepository.findOne.mockResolvedValue(
          primaryRow(),
        );
        mockPrimaryProgramRequestService.accept.mockResolvedValue({
          ok: false,
          reason,
        });

        const response: any = await service.updateResultRequestByUser(
          buildDto({ share_result_request_id: 700, result_id: 1 }, 2),
          actingUser,
        );

        expect(response.status).toBe(expectedStatus);
        if (reason === 'conflict') {
          expect(response.message).toBe('This request was already answered');
        }
        expect(JSON.stringify(response)).not.toMatch(/stack|Error:/i);
      },
    );

    it('rejects a non-accept/decline status for a primary row without reaching the primary service', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue(primaryRow());

      const response: any = await service.updateResultRequestByUser(
        buildDto({ share_result_request_id: 700, result_id: 1 }, 1),
        actingUser,
      );

      expect(mockPrimaryProgramRequestService.accept).not.toHaveBeenCalled();
      expect(mockPrimaryProgramRequestService.decline).not.toHaveBeenCalled();
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    // `PSR-T-4` rework attempt 2 (Reviewer FAIL, issue 1): a Center re-pick cancels the round by
    // setting `is_active=false` on the old round's rows ONLY — `request_status_id` stays `1`
    // (`primary-program-request.service.ts` L244-247; design.md §2.2 "Center re-picks SP12").
    // Without an `is_active` check here, that cancelled-but-still-status-1 row is still
    // "actionable" through this endpoint (requirements.md PSR-R-2: "no longer actionable").
    it.each([
      ['updateResultRequestByUser', 2],
      ['updateResultRequestByUser', 3],
      ['updateResultRequestByUserV2', 2],
      ['updateResultRequestByUserV2', 3],
    ] as const)(
      '%s: a cancelled (is_active=false) primary row with request_status_id=1 is answered 409, never reaching the primary service',
      async (method, statusId) => {
        mockShareResultRequestRepository.findOne.mockResolvedValue(
          primaryRow({ is_active: false, request_status_id: 1 }),
        );

        const response: any = await (service as any)[method](
          buildDto({ share_result_request_id: 700, result_id: 1 }, statusId),
          actingUser,
        );

        expect(mockPrimaryProgramRequestService.accept).not.toHaveBeenCalled();
        expect(mockPrimaryProgramRequestService.decline).not.toHaveBeenCalled();
        expect(response.status).toBe(HttpStatus.CONFLICT);
        expect(response.message).toBe('This request was already answered');
      },
    );

    it('a contribution request from updateResultRequestByUserV2 never calls the primary service either', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue(
        contributionRow(),
      );
      const updateSpyV2 = jest
        .spyOn(service as any, 'updateShareResultRequestV2')
        .mockResolvedValue(undefined);
      const approvalSpyV2 = jest
        .spyOn(service as any, 'handleRequestApprovalV2')
        .mockResolvedValue(undefined);
      const notifySpy = jest
        .spyOn(service as any, 'emitContributionDecisionNotification')
        .mockResolvedValue(undefined);

      const response: any = await service.updateResultRequestByUserV2(
        buildDto({ share_result_request_id: 500, result_id: 1 }, 2),
        actingUser,
      );

      expect(mockPrimaryProgramRequestService.accept).not.toHaveBeenCalled();
      expect(mockPrimaryProgramRequestService.decline).not.toHaveBeenCalled();
      expect(updateSpyV2).toHaveBeenCalled();
      expect(approvalSpyV2).toHaveBeenCalled();
      expect(notifySpy).toHaveBeenCalled();
      expect(response.status).toBe(HttpStatus.OK);
    });

    // `PDR-T-2` (design.md §7.2, §9, requirements.md PDR-R-3): the dispatcher 400s a blank
    // justification on a primary decline BEFORE calling the service, on both V1 and V2.
    it.each([
      ['updateResultRequestByUser', '  '],
      ['updateResultRequestByUserV2', '  '],
      ['updateResultRequestByUser', undefined],
      ['updateResultRequestByUserV2', undefined],
    ] as const)(
      '%s: request_status_id=3 with justification %p on a primary row returns 400 and never calls decline',
      async (method, blankJustification) => {
        mockShareResultRequestRepository.findOne.mockResolvedValue(
          primaryRow(),
        );

        const response: any = await (service as any)[method](
          buildDto(
            { share_result_request_id: 700, result_id: 1 },
            3,
            blankJustification,
          ),
          actingUser,
        );

        expect(mockPrimaryProgramRequestService.decline).not.toHaveBeenCalled();
        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
        expect(response.message).toBe(
          'Justification is required when declining a primary request',
        );
      },
    );

    // `PDR-R-3`: a justification on an accept MUST be ignored — never reaches `accept()`.
    it('updateResultRequestByUserV2: request_status_id=2 with a justification does not pass it to accept, nothing stored', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue(primaryRow());
      mockPrimaryProgramRequestService.accept.mockResolvedValue({
        ok: true,
        shareResultRequestId: 700,
        state: 'accepted',
      });

      const response: any = await service.updateResultRequestByUserV2(
        buildDto({ share_result_request_id: 700, result_id: 1 }, 2, 'x'),
        actingUser,
      );

      expect(mockPrimaryProgramRequestService.accept).toHaveBeenCalledWith(
        700,
        actingUser,
      );
      expect(mockPrimaryProgramRequestService.decline).not.toHaveBeenCalled();
      expect(response.status).toBe(HttpStatus.OK);
    });

    // `PDR-R-2` regression guard: a contribution row declined without a justification MUST NOT
    // get 400 — the dispatcher's justification guard only applies to the primary branch.
    it('a contribution row declined without a justification is not rejected with 400 (PDR-R-2 unaffected)', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue(
        contributionRow(),
      );
      jest
        .spyOn(service as any, 'updateShareResultRequest')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, 'handleRequestApproval')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, 'emitContributionDecisionNotification')
        .mockResolvedValue(undefined);

      const response: any = await service.updateResultRequestByUser(
        buildDto({ share_result_request_id: 500, result_id: 1 }, 3),
        actingUser,
      );

      expect(mockPrimaryProgramRequestService.decline).not.toHaveBeenCalled();
      expect(response.status).not.toBe(HttpStatus.BAD_REQUEST);
      expect(response.status).toBe(HttpStatus.OK);
    });

    // `PDR-T-2` / design.md §7.2: `mapPrimaryDecisionOutcomeToResponse` maps the service's
    // `invalid_input` outcome to 400 with the exact PDR-R-3 message.
    it('maps an invalid_input outcome from the service to 400 with the exact PDR-R-3 message', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue(primaryRow());
      mockPrimaryProgramRequestService.decline.mockResolvedValue({
        ok: false,
        reason: 'invalid_input',
      });

      const response: any = await service.updateResultRequestByUser(
        buildDto(
          { share_result_request_id: 700, result_id: 1 },
          3,
          'Outside portfolio',
        ),
        actingUser,
      );

      expect(mockPrimaryProgramRequestService.decline).toHaveBeenCalledWith(
        700,
        actingUser,
        'Outside portfolio',
      );
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.message).toBe(
        'Justification is required when declining a primary request',
      );
    });

    // A valid primary decline passes the raw (untrimmed) text through to `decline()`, which owns
    // trimming itself (design.md §7.1) — the dispatcher only checks for blank-after-trim.
    it('a valid primary decline passes the justification text through to decline, untouched', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue(primaryRow());
      mockPrimaryProgramRequestService.decline.mockResolvedValue({
        ok: true,
        shareResultRequestId: 700,
        state: 'rejected',
      });

      const response: any = await service.updateResultRequestByUserV2(
        buildDto(
          { share_result_request_id: 700, result_id: 1 },
          3,
          '  Outside portfolio  ',
        ),
        actingUser,
      );

      expect(mockPrimaryProgramRequestService.decline).toHaveBeenCalledWith(
        700,
        actingUser,
        '  Outside portfolio  ',
      );
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.response.state).toBe('rejected');
    });
  });

  // `PSR-T-4` rework attempt 2 (Reviewer FAIL, issue 2): the tasks.md Falsifier ("a pending primary
  // row is missing from an SP09 member's received list or from a platform admin's") had no test
  // that actually evaluates the `where` shape against a row fixture — the only earlier GET test
  // mocked `find` to return its data regardless of `where`, which would pass even if the real
  // filter dropped the row. These evaluate the condition object `buildWhereReceivedConditions`
  // builds (design.md P-1/P-2) against a pending primary row directly.
  describe('PSR-T-4 — visibility: received-list condition covers a pending primary row', () => {
    function evaluateCondition(row: any, condition: any): boolean {
      return Object.entries(condition).every(([key, expected]) => {
        if (expected instanceof FindOperator) {
          return (expected.value as any[]).includes(row[key]);
        }
        if (key === 'obj_result' && expected && typeof expected === 'object') {
          return evaluateCondition(row.obj_result ?? {}, expected);
        }
        return row[key] === expected;
      });
    }

    function conditionMatchesRow(conditions: any, row: any): boolean {
      const list = Array.isArray(conditions) ? conditions : [conditions];
      return list.some((condition) => evaluateCondition(row, condition));
    }

    // A pending primary row to SP 55: `shared_inititiative_id = owner_initiative_id = 55`,
    // `is_map_to_toc = false`, no role-1 owner on the result (design.md §3.1 / P-1).
    const pendingPrimaryRowToSp55 = {
      request_type: 'primary',
      shared_inititiative_id: 55,
      owner_initiative_id: 55,
      is_map_to_toc: false,
      request_status_id: 1,
      is_active: true,
      obj_result: { is_active: true },
    };

    it('an SP member (role=3, user of initiative 55) has a bucket condition satisfied by the pending primary row to SP 55', () => {
      const where = (service as any).buildWhereReceivedConditions(
        [{ initiative_id: 55 }],
        3,
      );

      expect(
        conditionMatchesRow(where.pendingOwner, pendingPrimaryRowToSp55) ||
          conditionMatchesRow(where.pendingShared, pendingPrimaryRowToSp55),
      ).toBe(true);
    });

    it('a platform admin (role=1) condition scopes on no shared/owner initiative and still matches the row', () => {
      const where = (service as any).buildWhereReceivedConditions([], 1);

      expect(where.pendingOwner).not.toHaveProperty('shared_inititiative_id');
      expect(where.pendingOwner).not.toHaveProperty('owner_initiative_id');
      expect(
        conditionMatchesRow(where.pendingOwner, pendingPrimaryRowToSp55),
      ).toBe(true);
    });

    it('getReceivedResultRequestPopUp: the merged (extraConditions) shape still matches the row', () => {
      const where = (service as any).buildWhereReceivedConditions(
        [{ initiative_id: 55 }],
        3,
        { obj_result: { version_id: 99 } },
      );
      const rowWithVersion = {
        ...pendingPrimaryRowToSp55,
        obj_result: { ...pendingPrimaryRowToSp55.obj_result, version_id: 99 },
      };

      expect(
        conditionMatchesRow(where.pendingOwner, rowWithVersion) ||
          conditionMatchesRow(where.pendingShared, rowWithVersion),
      ).toBe(true);
    });
  });

  // @akili-spec notifications/bilateral-primary-sp-request PSR-T-4
  // Received/sent/pop-up rows gain request_type, creating_center and (bilateral contribution
  // rows only) owner_program_code — all derived from the SAME query, batched, never per row.
  describe('PSR-T-4 — GET rows gain request_type / creating_center / owner_program_code', () => {
    beforeEach(() => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
      mockRoleByUserRepository.find.mockResolvedValue([{ initiative_id: 100 }]);
    });

    it('defaults request_type to contribution and sends both acronym and name as-is (missing acronym scenario, PSR-R-9)', async () => {
      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 1,
            result_id: 900,
            shared_inititiative_id: 10,
            request_status_id: 1,
            is_map_to_toc: false,
            obj_result: {
              source: 'Result',
              result_center_array: [
                {
                  is_active: true,
                  is_leading_result: 1,
                  clarisa_center_object: {
                    clarisa_institution: {
                      acronym: null,
                      name: 'Bioversity (Alliance)',
                    },
                  },
                },
              ],
            },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response: any = await service.getReceivedResultRequest(user);
      const row = response.response.receivedContributionsPending[0];

      expect(row.request_type).toBe('contribution');
      // Server sends both fields raw; it never collapses a missing acronym itself.
      expect(row.creating_center).toEqual({
        acronym: null,
        name: 'Bioversity (Alliance)',
      });
      expect(row.owner_program_code).toBeUndefined();
    });

    it('preserves request_type=primary and never adds owner_program_code to a primary row', async () => {
      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 2,
            result_id: 901,
            request_type: 'primary',
            shared_inititiative_id: 11,
            owner_initiative_id: 11,
            obj_owner_initiative: { id: 11, official_code: 'SP11' },
            request_status_id: 1,
            is_map_to_toc: false,
            obj_result: { source: 'API', result_center_array: [] },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response: any = await service.getReceivedResultRequest(user);
      const row = response.response.receivedContributionsPending[0];

      expect(row.request_type).toBe('primary');
      expect(row.owner_program_code).toBeUndefined();
    });

    it('a bilateral contribution row gets owner_program_code (the primary SP official code); a non-bilateral row does not', async () => {
      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 3,
            result_id: 902,
            shared_inititiative_id: 12,
            owner_initiative_id: 13,
            obj_owner_initiative: { id: 13, official_code: 'SP09' },
            request_status_id: 1,
            is_map_to_toc: false,
            obj_result: { source: 'API', result_center_array: [] },
          },
          {
            share_result_request_id: 4,
            result_id: 903,
            shared_inititiative_id: 14,
            owner_initiative_id: 15,
            obj_owner_initiative: { id: 15, official_code: 'SP12' },
            request_status_id: 1,
            is_map_to_toc: false,
            obj_result: { source: 'Result', result_center_array: [] },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response: any = await service.getReceivedResultRequest(user);
      const rows = response.response.receivedContributionsPending;
      const bilateralRow = rows.find(
        (r: any) => r.share_result_request_id === 3,
      );
      const nonBilateralRow = rows.find(
        (r: any) => r.share_result_request_id === 4,
      );

      expect(bilateralRow.owner_program_code).toBe('SP09');
      expect(nonBilateralRow.owner_program_code).toBeUndefined();
    });

    it('Falsifier: no extra repository query fires as the number of enriched rows grows (no per-row lookup)', async () => {
      const manyRows = Array.from({ length: 25 }, (_, i) => ({
        share_result_request_id: 100 + i,
        result_id: 1000 + i,
        shared_inititiative_id: 20 + i,
        owner_initiative_id: 30 + i,
        obj_owner_initiative: { id: 30 + i, official_code: `SP${i}` },
        request_status_id: 1,
        is_map_to_toc: false,
        obj_result: {
          source: 'API',
          result_center_array: [
            {
              is_active: true,
              is_leading_result: 1,
              clarisa_center_object: {
                clarisa_institution: { acronym: 'CTR', name: 'Center' },
              },
            },
          ],
        },
      }));

      mockShareResultRequestRepository.find
        .mockResolvedValueOnce(manyRows)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getReceivedResultRequest(user);

      // `find()` is only ever called for the 3 buckets — enriching 25 rows adds zero extra calls.
      expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(3);
    });
  });

  // @akili-spec notifications/inbox-paginated-load (PAGE-T-2)
  // PAGE-R-1, R-2, R-3, R-6 — `version_id`/`scope`/`cursor` on Received/Sent. Falsifiers (a)-(f)
  // from tasks.md are each a named `it` below.
  describe('PAGE-T-2 — version_id / scope / cursor paging (Received/Sent)', () => {
    beforeEach(() => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
      mockRoleByUserRepository.find.mockResolvedValue([{ initiative_id: 100 }]);
    });

    // Falsifier (a): with version_id=5, a captured `find` where for EACH bucket (pendingOwner,
    // pendingShared, every done entry) lacking obj_result.version_id = 5 fails.
    it('(a) version_id=5 reaches obj_result.version_id on pendingOwner, pendingShared and every done entry — Received', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([]);

      await service.getReceivedResultRequest(user, { versionId: '5' });

      const whereArgs = mockShareResultRequestRepository.find.mock.calls.map(
        (call: any) => call[0].where,
      );
      expect(whereArgs).toHaveLength(3); // pendingOwner, pendingShared, done (non-admin, no cursor)
      for (const where of whereArgs) {
        const entries = Array.isArray(where) ? where : [where];
        for (const entry of entries) {
          expect(entry.obj_result).toMatchObject({ version_id: 5 });
        }
      }
    });

    it('(a) version_id=5 reaches obj_result.version_id on pendingOwner, pendingShared and every done entry — Sent', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([]);

      await service.getSentResultRequest(user, { versionId: '5' });

      const whereArgs = mockShareResultRequestRepository.find.mock.calls.map(
        (call: any) => call[0].where,
      );
      expect(whereArgs).toHaveLength(3);
      for (const where of whereArgs) {
        const entries = Array.isArray(where) ? where : [where];
        for (const entry of entries) {
          expect(entry.obj_result).toMatchObject({ version_id: 5 });
        }
      }
    });

    // Falsifier (b): scope=pending calling find for done, or scope=history calling it for
    // pending, fails.
    it('(b) scope=pending fetches only the 2 pending buckets, never done', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([]);

      await service.getReceivedResultRequest(user, { scope: 'pending' });

      expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(2);
      for (const call of mockShareResultRequestRepository.find.mock.calls) {
        expect(Array.isArray((call[0] as any).where)).toBe(false);
      }
    });

    it('(b) scope=history fetches only the done bucket, never pending', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([]);

      await service.getReceivedResultRequest(user, { scope: 'history' });

      expect(mockShareResultRequestRepository.find).toHaveBeenCalledTimes(1);
      expect(
        Array.isArray(
          (mockShareResultRequestRepository.find.mock.calls[0][0] as any).where,
        ),
      ).toBe(true);
    });

    it('(b) scope=pending returns [] for done with hasMore:false/nextCursor:null; scope=history returns [] for pending', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([]);

      const pendingOnly: any = await service.getReceivedResultRequest(user, {
        scope: 'pending',
      });
      expect(pendingOnly.response.receivedContributionsDone).toEqual([]);
      expect(pendingOnly.response.doneMeta).toEqual({
        hasMore: false,
        nextCursor: null,
      });

      const historyOnly: any = await service.getReceivedResultRequest(user, {
        scope: 'history',
      });
      expect(historyOnly.response.receivedContributionsPending).toEqual([]);
    });

    // Falsifier (c): admin with 201 mocked done rows returns 200 + hasMore=true.
    it('(c) admin with 201 mocked done rows: done is cut to 200 with hasMore=true', async () => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(1); // admin
      mockRoleByUserRepository.find.mockResolvedValue([]);

      const manyDoneRows = Array.from({ length: 201 }, (_, i) => ({
        share_result_request_id: 9000 + i,
        result_id: 9000 + i,
        request_status_id: 2,
        is_map_to_toc: false,
        requested_date: new Date(2026, 0, 1, 0, 0, i).toISOString(),
        obj_result: { source: 'Result' },
      }));

      mockShareResultRequestRepository.find.mockImplementation(
        async ({ where }: any) => (Array.isArray(where) ? manyDoneRows : []),
      );

      const response: any = await service.getReceivedResultRequest(user);

      expect(response.response.receivedContributionsDone).toHaveLength(200);
      expect(response.response.doneMeta.hasMore).toBe(true);
      expect(response.response.doneMeta.nextCursor).toEqual(expect.any(String));
    });

    // Falsifier (d): no-param call missing any legacy key fails.
    it('(d) no-param (legacy) call keeps every existing response key and adds doneMeta', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([]);

      const received: any = await service.getReceivedResultRequest(user);
      expect(received.response).toEqual(
        expect.objectContaining({
          receivedContributionsPending: expect.any(Array),
          receivedContributionsDone: expect.any(Array),
          doneMeta: expect.objectContaining({ hasMore: expect.any(Boolean) }),
        }),
      );

      const sent: any = await service.getSentResultRequest(user);
      expect(sent.response).toEqual(
        expect.objectContaining({
          sentContributionsPending: expect.any(Array),
          sentContributionsDone: expect.any(Array),
          doneMeta: expect.objectContaining({ hasMore: expect.any(Boolean) }),
        }),
      );
    });

    // Falsifier (e): version_id=abc or bad cursor not -> 400 fails.
    it('(e) version_id=abc -> 400, never reaching the repository', async () => {
      const response: any = await service.getReceivedResultRequest(user, {
        versionId: 'abc',
      });

      expect(mockShareResultRequestRepository.find).not.toHaveBeenCalled();
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ status: 400 }),
        }),
      );
      expect(response).toBe(
        mockHandlersError.returnErrorRes.mock.results[0].value,
      );
    });

    it('(e) malformed cursor -> 400, never reaching the repository (even though scope=pending would otherwise skip history)', async () => {
      await service.getReceivedResultRequest(user, {
        scope: 'pending',
        cursor: 'not-a-valid-cursor!!',
      });

      expect(mockShareResultRequestRepository.find).not.toHaveBeenCalled();
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ status: 400 }),
        }),
      );
    });

    // Falsifier (f): 350 mocked pending rows returned < 350 fails (pending is never paged).
    it('(f) 350 mocked pending rows on pendingOwner are all returned, never truncated', async () => {
      const manyPendingRows = Array.from({ length: 350 }, (_, i) => ({
        share_result_request_id: 10000 + i,
        result_id: 10000 + i,
        shared_inititiative_id: 100,
        request_status_id: 1,
        is_map_to_toc: false,
        obj_result: { source: 'Result' },
      }));

      mockShareResultRequestRepository.find
        .mockResolvedValueOnce(manyPendingRows) // pendingOwner
        .mockResolvedValueOnce([]) // pendingShared
        .mockResolvedValueOnce([]); // done

      const response: any = await service.getReceivedResultRequest(user);

      expect(response.response.receivedContributionsPending).toHaveLength(350);
    });

    // PAGE-R-3 — order and take reach the repository for the `done` bucket only.
    it('passes order (requested_date DESC, share_result_request_id DESC) and take=201 only on the done fetch', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([]);

      await service.getReceivedResultRequest(user);

      const calls = mockShareResultRequestRepository.find.mock.calls as any[];
      const doneCall = calls.find((call) => Array.isArray(call[0].where));
      const pendingCalls = calls.filter(
        (call) => !Array.isArray(call[0].where),
      );

      expect(doneCall[0].take).toBe(201);
      expect(doneCall[0].order).toEqual({
        requested_date: 'DESC',
        share_result_request_id: 'DESC',
      });
      for (const call of pendingCalls) {
        expect(call[0].take).toBeUndefined();
        expect(call[0].order).toBeUndefined();
      }
    });

    // PAGE-R-3 — a valid cursor expands the done `where` into the keyset OR (2 entries -> 4 for
    // non-admin) instead of the plain 2-entry array.
    it('a valid cursor expands the non-admin done where from 2 entries to 4 (keyset OR)', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([]);
      const cursor = Buffer.from(
        '2026-01-01T00:00:00.000Z|123',
        'utf8',
      ).toString('base64url');

      await service.getReceivedResultRequest(user, { cursor });

      const calls = mockShareResultRequestRepository.find.mock.calls as any[];
      const doneCall = calls.find((call) => Array.isArray(call[0].where));
      expect(doneCall[0].where).toHaveLength(4);
    });
  });
});
