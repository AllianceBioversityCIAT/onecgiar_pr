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

    /** Mirrors `getRequest`'s fetch-and-map step so expected fixtures aren't duplicating it. */
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
});
