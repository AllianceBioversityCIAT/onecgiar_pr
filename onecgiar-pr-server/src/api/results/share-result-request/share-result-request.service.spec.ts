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

describe('ShareResultRequestService', () => {
  let service: ShareResultRequestService;

  const mockShareResultRequestRepository = {
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareResultRequestService,
        { provide: HandlersError, useValue: { returnErrorRes: jest.fn() } },
        {
          provide: ShareResultRequestRepository,
          useValue: mockShareResultRequestRepository,
        },
        { provide: ResultRepository, useValue: {} },
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
});
