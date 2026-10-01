import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  PrimaryProgramRequestService,
  PrimaryRequestStateEnum,
} from './primary-program-request.service';
import { ShareResultRequestRepository } from '../share-result-request.repository';
import {
  RequestTypeEnum,
  ShareResultRequest,
} from '../entities/share-result-request.entity';
import { ResultsByProjects } from '../../results_by_projects/entities/results_by_projects.entity';
import { ClarisaProjectMapping } from '../../../../clarisa/clarisa-projects/entity/clarisa-project-mapping.entity';
import { ClarisaInitiativesRepository } from '../../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { TokenDto } from '../../../../shared/globalInterfaces/token.dto';
import { ResultsByInititiative } from '../../results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultsTocResult } from '../../results-toc-results/entities/results-toc-result.entity';
import { RoleByUserRepository } from '../../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultsCenterRepository } from '../../results-centers/results-centers.repository';
import { ResultRepository } from '../../result.repository';
import { TemplateRepository } from '../../../platform-report/repositories/template.repository';
import { GlobalParameterRepository } from '../../../global-parameter/repositories/global-parameter.repository';
import { UserNotificationSettingRepository } from '../../../user-notification-settings/user-notification-settings.repository';
import { UserRepository } from '../../../../auth/modules/user/repositories/user.repository';
import { EmailNotificationManagementService } from '../../../../shared/microservices/email-notification-management/email-notification-management.service';
import { NotificationService } from '../../../notification/notification.service';
import { NotificationTypeEnum } from '../../../notification/enum/notification.enum';

describe('PrimaryProgramRequestService', () => {
  let service: PrimaryProgramRequestService;

  const mockShareResultRequestRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    manager: { transaction: jest.fn(), getRepository: jest.fn() },
  };
  const mockResultsByProjectsRepository = {
    find: jest.fn(),
  };
  const mockClarisaProjectMappingRepository = {
    find: jest.fn(),
  };
  const mockClarisaInitiativesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockRoleByUserRepository = {
    isUserAdmin: jest.fn(),
    hasActiveRoleOnInitiative: jest.fn(),
    getUserIdsByCenter: jest.fn(),
    find: jest.fn(),
  };
  const mockResultsCenterRepository = {
    getAllResultsCenterByResultId: jest.fn(),
  };
  const mockResultRepository = {
    findOne: jest.fn(),
  };
  const mockTemplateRepository = {
    findOne: jest.fn(),
  };
  const mockGlobalParameterRepository = {
    findOne: jest.fn(),
  };
  const mockUserNotificationSettingRepository = {
    find: jest.fn(),
  };
  const mockUserRepository = {
    findOne: jest.fn(),
  };
  const mockEmailNotificationManagementService = {
    buildEmailData: jest.fn().mockReturnValue({
      subject: 'subject',
      cc: [],
    }),
    sendEmail: jest.fn(),
  };
  const mockNotificationService = {
    emitResultNotification: jest.fn(),
  };

  // Transactional per-entity repositories the `accept`/`decline` transaction resolves through
  // `manager.getRepository(Entity)`. Reset in `beforeEach` and wired to
  // `mockShareResultRequestRepository.manager.transaction` so it runs the callback against them.
  const mockRequestRepoTx = {
    findOne: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    insert: jest.fn(),
  };
  const mockInitiativeRepoTx = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };
  const mockTocRepoTx = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  function txRepoFor(entity: unknown) {
    if (entity === ShareResultRequest) return mockRequestRepoTx;
    if (entity === ResultsByInititiative) return mockInitiativeRepoTx;
    if (entity === ResultsTocResult) return mockTocRepoTx;
    // T-5 review (2nd defect): `request()` now also routes its lead-project / alignment reads
    // through the caller-supplied manager. `decline()`'s auto-move calls `request()` with this
    // same transaction's manager, so this fake must resolve these three too — reusing the SAME
    // mocks `mockLeadProject`/`mockMappings`/`mockInitiatives` already configure, which is exactly
    // the semantics being modeled (the transaction sees what the plain repos are set up to return
    // in these tests; the dedicated "manager routing" describe below exercises a manager whose
    // reads genuinely differ from the injected repos).
    if (entity === ResultsByProjects) return mockResultsByProjectsRepository;
    if (entity === ClarisaProjectMapping)
      return mockClarisaProjectMappingRepository;
    if (entity === ClarisaInitiative) return mockClarisaInitiativesRepository;
    throw new Error(`fakeManager: unexpected entity ${String(entity)}`);
  }

  function fakeManager() {
    return { getRepository: jest.fn(txRepoFor) };
  }

  function mockInitiativeCodes(map: Record<number, string>) {
    mockClarisaInitiativesRepository.findOne.mockImplementation(
      ({ where }: any) => {
        const id = where?.id;
        return Promise.resolve(
          id != null && map[id] != null ? { id, official_code: map[id] } : null,
        );
      },
    );
  }

  const user = { id: 99 } as TokenDto;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockShareResultRequestRepository.manager.transaction.mockImplementation(
      (work: (manager: unknown) => unknown) => work(fakeManager()),
    );
    mockShareResultRequestRepository.manager.getRepository.mockImplementation(
      txRepoFor,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrimaryProgramRequestService,
        {
          provide: ShareResultRequestRepository,
          useValue: mockShareResultRequestRepository,
        },
        {
          provide: ClarisaInitiativesRepository,
          useValue: mockClarisaInitiativesRepository,
        },
        {
          provide: getRepositoryToken(ResultsByProjects),
          useValue: mockResultsByProjectsRepository,
        },
        {
          provide: getRepositoryToken(ClarisaProjectMapping),
          useValue: mockClarisaProjectMappingRepository,
        },
        {
          provide: RoleByUserRepository,
          useValue: mockRoleByUserRepository,
        },
        {
          provide: ResultsCenterRepository,
          useValue: mockResultsCenterRepository,
        },
        {
          provide: ResultRepository,
          useValue: mockResultRepository,
        },
        {
          provide: TemplateRepository,
          useValue: mockTemplateRepository,
        },
        {
          provide: GlobalParameterRepository,
          useValue: mockGlobalParameterRepository,
        },
        {
          provide: UserNotificationSettingRepository,
          useValue: mockUserNotificationSettingRepository,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: EmailNotificationManagementService,
          useValue: mockEmailNotificationManagementService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<PrimaryProgramRequestService>(
      PrimaryProgramRequestService,
    );

    // Neutral defaults: an admin actor, a pending row found, no prior owner, no drafts, and a
    // lead Centre with one recipient — each table-driven test overrides what it needs.
    mockRoleByUserRepository.isUserAdmin.mockResolvedValue(true);
    mockRoleByUserRepository.hasActiveRoleOnInitiative.mockResolvedValue(true);
    mockRoleByUserRepository.getUserIdsByCenter.mockResolvedValue([1]);
    mockRoleByUserRepository.find.mockResolvedValue([]);
    mockResultsCenterRepository.getAllResultsCenterByResultId.mockResolvedValue(
      [{ code: 'CTR', is_leading_result: 1 }],
    );
    mockInitiativeRepoTx.find.mockResolvedValue([]);
    mockInitiativeRepoTx.findOne.mockResolvedValue(null);
    mockTocRepoTx.findOne.mockResolvedValue(null);
    mockRequestRepoTx.find.mockResolvedValue([]);
    mockRequestRepoTx.findOne.mockResolvedValue(null);
    mockRequestRepoTx.insert.mockResolvedValue({
      identifiers: [{ share_result_request_id: 900 }],
    });
    mockClarisaInitiativesRepository.findOne.mockResolvedValue(null);
    mockUserNotificationSettingRepository.find.mockResolvedValue([]);
    mockTemplateRepository.findOne.mockResolvedValue({
      name: 'email_template_contribution',
      template: '{{subject}}',
    });
    mockGlobalParameterRepository.findOne.mockResolvedValue({
      value: 'pcu@cgiar.org',
    });
    mockUserRepository.findOne.mockResolvedValue({
      id: 1,
      email: 'requester@cgiar.org',
      first_name: 'A',
      last_name: 'B',
    });
    mockResultRepository.findOne.mockResolvedValue({
      id: 1,
      result_code: 'R-1',
      title: 'A result',
      version_id: 1,
    });
  });

  /** SP09 = initiative 9 / official_code 'SP09'; SP12 = initiative 12 / official_code 'SP12'. */
  const leadProjectId = 501;

  function mockLeadProject(projectId: number | null) {
    mockResultsByProjectsRepository.find.mockResolvedValue(
      projectId == null ? [] : [{ project_id: projectId }],
    );
  }

  function mockMappings(rows: Partial<ClarisaProjectMapping>[]) {
    mockClarisaProjectMappingRepository.find.mockResolvedValue(rows);
  }

  function mockInitiatives(
    rows: { id: number; official_code: string; active?: boolean }[],
  ) {
    mockClarisaInitiativesRepository.find.mockResolvedValue(rows);
  }

  describe('getAlignments / isAligned — P-7 (Disqualifier: raw mapping rows, not the helper mocked)', () => {
    // Mixed with a genuinely reportable row on purpose: an implementation that always returns
    // `[]` (a stub, or a filter that is too aggressive) would also satisfy an "excludes" test
    // asserted against an empty result — this asserts the allocation-0 row is dropped WHILE the
    // Confirmed/positive-allocation row in the same mappings array survives, so only real
    // filtering logic can pass it.
    it('excludes a mapping with allocation 0, keeping a Confirmed positive-allocation one', async () => {
      mockLeadProject(leadProjectId);
      mockMappings([
        {
          programCode: 'SP09',
          allocation: '0.00',
          status: 'Confirmed',
        } as ClarisaProjectMapping,
        {
          programCode: 'SP12',
          allocation: '30.00',
          status: 'Confirmed',
        } as ClarisaProjectMapping,
      ]);
      // SP09 is ALSO resolvable here (unlike the old version of this test): if the
      // allocation-0 filter were missing entirely, SP09 would still come back too, so this
      // genuinely proves the filter ran rather than proving CLARISA had no row for it.
      mockInitiatives([
        { id: 9, official_code: 'SP09', active: true },
        { id: 12, official_code: 'SP12', active: true },
      ]);

      const alignments = await service.getAlignments(leadProjectId);

      expect(alignments).toEqual([{ initiativeId: 12, programCode: 'SP12' }]);
    });

    it('excludes a mapping whose status is not Confirmed, keeping the Confirmed one', async () => {
      mockMappings([
        {
          programCode: 'SP09',
          allocation: '70.00',
          status: 'Pending',
        } as ClarisaProjectMapping,
        {
          programCode: 'SP12',
          allocation: '30.00',
          status: 'Confirmed',
        } as ClarisaProjectMapping,
      ]);
      mockInitiatives([
        { id: 9, official_code: 'SP09', active: true },
        { id: 12, official_code: 'SP12', active: true },
      ]);

      const alignments = await service.getAlignments(leadProjectId);

      expect(alignments).toEqual([{ initiativeId: 12, programCode: 'SP12' }]);
    });

    it('includes a mapping with allocation > 0 and status Confirmed', async () => {
      mockMappings([
        {
          programCode: 'SP09',
          allocation: '70.00',
          status: 'Confirmed',
        } as ClarisaProjectMapping,
      ]);
      mockInitiatives([{ id: 9, official_code: 'SP09', active: true }]);

      const alignments = await service.getAlignments(leadProjectId);

      expect(alignments).toEqual([{ initiativeId: 9, programCode: 'SP09' }]);
    });

    it('is aligned only for a SP present in the reportable mappings', async () => {
      mockMappings([
        {
          programCode: 'SP09',
          allocation: '70.00',
          status: 'Confirmed',
        } as ClarisaProjectMapping,
        {
          programCode: 'SP12',
          allocation: '30.00',
          status: 'Confirmed',
        } as ClarisaProjectMapping,
      ]);
      mockInitiatives([
        { id: 9, official_code: 'SP09', active: true },
        { id: 12, official_code: 'SP12', active: true },
      ]);

      await expect(service.isAligned(leadProjectId, 9)).resolves.toBe(true);
      await expect(service.isAligned(leadProjectId, 3)).resolves.toBe(false);
    });

    it('returns false for a leadProjectId of null (no lead project resolved)', async () => {
      await expect(service.isAligned(null as any, 9)).resolves.toBe(false);
      expect(mockClarisaProjectMappingRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('getOtherAlignment — DD-8 round-based auto-move helper', () => {
    it('returns the only other SP on a two-alignment project', async () => {
      mockMappings([
        { programCode: 'SP09', allocation: '70', status: 'Confirmed' } as any,
        { programCode: 'SP12', allocation: '30', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([
        { id: 9, official_code: 'SP09' },
        { id: 12, official_code: 'SP12' },
      ]);

      await expect(
        service.getOtherAlignment(leadProjectId, 9),
      ).resolves.toEqual({ initiativeId: 12, programCode: 'SP12' });
    });

    it('returns null on a single-alignment project', async () => {
      mockMappings([
        { programCode: 'SP13', allocation: '100', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([{ id: 13, official_code: 'SP13' }]);

      await expect(
        service.getOtherAlignment(leadProjectId, 13),
      ).resolves.toBeNull();
    });

    it('returns null on a >2-alignment project (no single deterministic other SP)', async () => {
      mockMappings([
        { programCode: 'SP09', allocation: '40', status: 'Confirmed' } as any,
        { programCode: 'SP12', allocation: '30', status: 'Confirmed' } as any,
        { programCode: 'SP03', allocation: '30', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([
        { id: 9, official_code: 'SP09' },
        { id: 12, official_code: 'SP12' },
        { id: 3, official_code: 'SP03' },
      ]);

      await expect(
        service.getOtherAlignment(leadProjectId, 9),
      ).resolves.toBeNull();
    });
  });

  describe('request()', () => {
    beforeEach(() => {
      mockLeadProject(leadProjectId);
      mockMappings([
        { programCode: 'SP09', allocation: '70', status: 'Confirmed' } as any,
        { programCode: 'SP12', allocation: '30', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([
        { id: 9, official_code: 'SP09' },
        { id: 12, official_code: 'SP12' },
      ]);
    });

    it('rejects a SP that is not an alignment (PSR-R-3) without writing anything', async () => {
      const outcome = await service.request(1, 999, user);

      expect(outcome).toEqual({
        ok: false,
        reason: 'not_aligned',
        message: PrimaryProgramRequestService.NOT_ALIGNED_MESSAGE,
      });
      expect(mockShareResultRequestRepository.find).not.toHaveBeenCalled();
      expect(mockShareResultRequestRepository.insert).not.toHaveBeenCalled();
    });

    it('creates a pending primary row to an aligned SP (single-SP project still requires acceptance)', async () => {
      mockMappings([
        { programCode: 'SP13', allocation: '100', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([{ id: 13, official_code: 'SP13' }]);
      mockShareResultRequestRepository.find.mockResolvedValue([]);
      mockShareResultRequestRepository.insert.mockResolvedValue({
        identifiers: [{ share_result_request_id: 555 }],
      });

      const outcome = await service.request(1, 13, user);

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 555 });
      expect(mockShareResultRequestRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 1,
          request_type: RequestTypeEnum.PRIMARY,
          shared_inititiative_id: 13,
          // design.md §3.1: "shared_inititiative_id = owner_initiative_id = requested SP" — the
          // owner column is set on the primary row itself; DD-5's null-owner rule is for
          // CONTRIBUTOR drafts only, not this row.
          owner_initiative_id: 13,
          requester_initiative_id: null,
          approving_inititiative_id: 13,
          request_status_id: 1,
          is_active: true,
          is_map_to_toc: false,
          from_toc: false,
          requested_by: 99,
        }),
      );
    });

    // Falsifier (tasks.md PSR-T-2): re-pick SP09 → SP12 must leave no active SP09 row.
    it('cancels the active SP09 round row when the Center re-picks SP12', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        {
          share_result_request_id: 10,
          request_status_id: 1,
          shared_inititiative_id: 9,
        } as ShareResultRequest,
      ]);
      mockShareResultRequestRepository.insert.mockResolvedValue({
        identifiers: [{ share_result_request_id: 20 }],
      });

      const outcome = await service.request(1, 12, user);

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 20 });
      expect(mockShareResultRequestRepository.update).toHaveBeenCalledWith(
        { share_result_request_id: expect.anything() },
        { is_active: false },
      );
      // The deactivated criteria must target row 10 (SP09's pending round row) specifically.
      const [criteria] = mockShareResultRequestRepository.update.mock.calls[0];
      expect(JSON.stringify(criteria)).toContain('10');
    });

    // Falsifier: re-saving SP09 twice must yield only one pending row, not two.
    it('is idempotent when re-saving the SP that is already the pending round target', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        {
          share_result_request_id: 10,
          request_status_id: 1,
          shared_inititiative_id: 9,
        } as ShareResultRequest,
      ]);

      const outcome = await service.request(1, 9, user);

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 10 });
      expect(mockShareResultRequestRepository.update).not.toHaveBeenCalled();
      expect(mockShareResultRequestRepository.insert).not.toHaveBeenCalled();
    });

    // DD-4 swap: the old owner's ACCEPTED row must stay active; only pending/declined round rows
    // are cancelled by a re-pick.
    it('keeps an ACCEPTED owner row active on a swap re-pick', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        {
          share_result_request_id: 1,
          request_status_id: 2,
          shared_inititiative_id: 9,
        } as ShareResultRequest,
      ]);
      mockShareResultRequestRepository.insert.mockResolvedValue({
        identifiers: [{ share_result_request_id: 30 }],
      });

      const outcome = await service.request(1, 12, user);

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 30 });
      expect(mockShareResultRequestRepository.update).not.toHaveBeenCalled();
    });

    it('re-picking a previously DECLINED SP in the same round creates a fresh pending row', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        {
          share_result_request_id: 11,
          request_status_id: 3,
          shared_inititiative_id: 9,
        } as ShareResultRequest,
      ]);
      mockShareResultRequestRepository.insert.mockResolvedValue({
        identifiers: [{ share_result_request_id: 40 }],
      });

      const outcome = await service.request(1, 9, user);

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 40 });
      expect(mockShareResultRequestRepository.update).toHaveBeenCalledWith(
        { share_result_request_id: expect.anything() },
        { is_active: false },
      );
      expect(mockShareResultRequestRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ shared_inititiative_id: 9 }),
      );
    });

    // Reviewer FAIL #2 (rework, attempt 2): request()'s DD-8 cancel must be opt-in, because T-3's
    // decline auto-move calls request(other) right after setting the JUST-declined row to status
    // 3 (kept active, design.md §2.2/§5 item 3) — an unconditional cancel would deactivate that
    // very row, so "the other SP already declined this round" (DD-8) could never be found again
    // and SP09/SP12 would ping-pong forever (the PSR-R-7 "both SPs decline" scenario this guards).
    it('with cancelRound: false, does not touch the round and still inserts the new pending SP', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        {
          share_result_request_id: 11,
          request_status_id: 3,
          shared_inititiative_id: 9,
        } as ShareResultRequest,
      ]);
      mockShareResultRequestRepository.insert.mockResolvedValue({
        identifiers: [{ share_result_request_id: 50 }],
      });

      const outcome = await service.request(1, 12, user, undefined, {
        cancelRound: false,
      });

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 50 });
      // The just-declined SP09 row (still active, per design §2.2) must be left alone.
      expect(mockShareResultRequestRepository.update).not.toHaveBeenCalled();
      expect(mockShareResultRequestRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          shared_inititiative_id: 12,
          owner_initiative_id: 12,
        }),
      );
    });

    // Never throws (requirements.md §7 Reliability, PSR-R-1 "request step fails").
    it('never throws: an unexpected repository failure is logged and returned as internal_error', async () => {
      mockShareResultRequestRepository.find.mockRejectedValue(
        new Error('connection reset'),
      );

      const outcome = await service.request(1, 9, user);

      expect(outcome).toEqual({ ok: false, reason: 'internal_error' });
    });

    it('uses the caller-supplied EntityManager for share_result_request reads/writes when given', async () => {
      const managerShareRepo = {
        find: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        insert: jest.fn().mockResolvedValue({
          identifiers: [{ share_result_request_id: 77 }],
        }),
      };
      // T-5 review (2nd defect): `request()` routes EVERY read through `manager` when one is
      // given, not just the `share_result_request` reads — see the dedicated describe below for
      // the full falsifier. This test keeps its original narrow assertion (the request row).
      const manager = {
        getRepository: jest.fn((entity: unknown) => {
          if (entity === ShareResultRequest) return managerShareRepo;
          if (entity === ResultsByProjects) {
            return { find: jest.fn().mockResolvedValue([{ project_id: 501 }]) };
          }
          if (entity === ClarisaProjectMapping) {
            return {
              find: jest.fn().mockResolvedValue([
                {
                  programCode: 'SP09',
                  allocation: '70',
                  status: 'Confirmed',
                },
              ]),
            };
          }
          if (entity === ClarisaInitiative) {
            return {
              find: jest
                .fn()
                .mockResolvedValue([{ id: 9, official_code: 'SP09' }]),
            };
          }
          throw new Error(`unexpected entity ${String(entity)}`);
        }),
      } as any;

      const outcome = await service.request(1, 9, user, manager);

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 77 });
      expect(manager.getRepository).toHaveBeenCalledWith(ShareResultRequest);
      expect(mockShareResultRequestRepository.find).not.toHaveBeenCalled();
      expect(mockShareResultRequestRepository.insert).not.toHaveBeenCalled();
    });
  });

  // `PNS-T-1` (requirements.md PNS-R-1) — `opts.asDraft` inserts status DRAFT (4), never PENDING
  // (1), and the idempotency/round-cancel logic matches on the DRAFT row instead of the PENDING
  // one. Each test here must be seen red against today's `request()`, which always inserts
  // PENDING regardless of `opts.asDraft` — see the execution report for the red run.
  describe('request() — asDraft (PNS-R-1, saved-but-not-sent primary choice)', () => {
    beforeEach(() => {
      mockLeadProject(leadProjectId);
      mockMappings([
        { programCode: 'SP09', allocation: '70', status: 'Confirmed' } as any,
        { programCode: 'SP12', allocation: '30', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([
        { id: 9, official_code: 'SP09' },
        { id: 12, official_code: 'SP12' },
      ]);
    });

    it('creates a DRAFT row (status 4), never a PENDING one (status 1), on create', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([]);
      mockShareResultRequestRepository.insert.mockResolvedValue({
        identifiers: [{ share_result_request_id: 100 }],
      });

      const outcome = await service.request(1, 9, user, undefined, {
        asDraft: true,
      });

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 100 });
      expect(mockShareResultRequestRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          request_status_id: 4,
          shared_inititiative_id: 9,
        }),
      );
      // Falsifier: the insert must never carry PENDING (1) on this path.
      expect(mockShareResultRequestRepository.insert).not.toHaveBeenCalledWith(
        expect.objectContaining({ request_status_id: 1 }),
      );
    });

    it("still rejects a not-aligned SP with today's message on the asDraft path", async () => {
      const outcome = await service.request(1, 999, user, undefined, {
        asDraft: true,
      });

      expect(outcome).toEqual({
        ok: false,
        reason: 'not_aligned',
        message: PrimaryProgramRequestService.NOT_ALIGNED_MESSAGE,
      });
      expect(mockShareResultRequestRepository.insert).not.toHaveBeenCalled();
    });

    it('changing the saved choice (SP09 → SP12) deactivates the SP09 draft and inserts a SP12 draft', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        {
          share_result_request_id: 10,
          request_status_id: 4,
          shared_inititiative_id: 9,
        } as ShareResultRequest,
      ]);
      mockShareResultRequestRepository.insert.mockResolvedValue({
        identifiers: [{ share_result_request_id: 20 }],
      });

      const outcome = await service.request(1, 12, user, undefined, {
        asDraft: true,
      });

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 20 });
      expect(mockShareResultRequestRepository.update).toHaveBeenCalledWith(
        { share_result_request_id: expect.anything() },
        { is_active: false },
      );
      const [criteria] = mockShareResultRequestRepository.update.mock.calls[0];
      expect(JSON.stringify(criteria)).toContain('10');
      expect(mockShareResultRequestRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          shared_inititiative_id: 12,
          request_status_id: 4,
        }),
      );
    });

    it('re-saving the same draft SP (SP12) is idempotent: no second insert', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        {
          share_result_request_id: 20,
          request_status_id: 4,
          shared_inititiative_id: 12,
        } as ShareResultRequest,
      ]);

      const outcome = await service.request(1, 12, user, undefined, {
        asDraft: true,
      });

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 20 });
      expect(mockShareResultRequestRepository.update).not.toHaveBeenCalled();
      expect(mockShareResultRequestRepository.insert).not.toHaveBeenCalled();
    });

    // `PSR-T-5` rework attempt 2 — Reviewer FAIL remediation (a): a Project Information save on an
    // existing ownerless result that already has a sent PENDING primary request (seeded before
    // this feature existed, or from a prior send) must leave that PENDING row untouched when
    // `asDraft: true` is requested for the SAME SP — not turn it into a DRAFT. Must be seen red
    // against attempt-1 code, whose idempotency lookup only matches `targetStatus` (DRAFT) and so
    // never recognises this PENDING row.
    it('with asDraft: true, returns the existing active PENDING row unchanged for the same SP (no update, no insert)', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        {
          share_result_request_id: 10,
          request_status_id: 1,
          shared_inititiative_id: 9,
        } as ShareResultRequest,
      ]);

      const outcome = await service.request(1, 9, user, undefined, {
        asDraft: true,
      });

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 10 });
      expect(mockShareResultRequestRepository.update).not.toHaveBeenCalled();
      expect(mockShareResultRequestRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('stateFor() — PSR-R-7 state derivation', () => {
    it('returns none when there are no active primary rows', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([]);

      await expect(service.stateFor(1)).resolves.toEqual({
        state: PrimaryRequestStateEnum.NONE,
        program_code: null,
        declined_by_codes: [],
      });
    });

    it('returns pending with the requested SP code', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        { request_status_id: 1, shared_inititiative_id: 9 },
      ]);
      mockClarisaInitiativesRepository.findOne.mockResolvedValue({
        id: 9,
        official_code: 'SP09',
      });

      await expect(service.stateFor(1)).resolves.toEqual({
        state: PrimaryRequestStateEnum.PENDING,
        program_code: 'SP09',
        declined_by_codes: [],
      });
    });

    it('returns sent_back with every declined SP code in the round', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        { request_status_id: 3, shared_inititiative_id: 9 },
        { request_status_id: 3, shared_inititiative_id: 12 },
      ]);
      mockClarisaInitiativesRepository.findOne
        .mockResolvedValueOnce({ id: 9, official_code: 'SP09' })
        .mockResolvedValueOnce({ id: 12, official_code: 'SP12' });

      await expect(service.stateFor(1)).resolves.toEqual({
        state: PrimaryRequestStateEnum.SENT_BACK,
        program_code: null,
        declined_by_codes: ['SP09', 'SP12'],
      });
    });

    it('returns accepted even while a swap request is separately pending (ACCEPTED beats PENDING)', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        { request_status_id: 2, shared_inititiative_id: 9 },
        { request_status_id: 1, shared_inititiative_id: 12 },
      ]);
      mockClarisaInitiativesRepository.findOne.mockResolvedValue({
        id: 9,
        official_code: 'SP09',
      });

      await expect(service.stateFor(1)).resolves.toEqual({
        state: PrimaryRequestStateEnum.ACCEPTED,
        program_code: 'SP09',
        declined_by_codes: [],
      });
    });

    // `PNS-T-1` (design.md §4): priority accepted > pending > draft > sent_back > none. Must be
    // seen red against today's `stateFor()`, which has no DRAFT branch at all and would fall
    // through to `sent_back`/`none` for a status-4 row.
    it('returns draft with the saved-but-not-sent SP code (PNS-R-1)', async () => {
      mockShareResultRequestRepository.find.mockResolvedValue([
        { request_status_id: 4, shared_inititiative_id: 9 },
      ]);
      mockClarisaInitiativesRepository.findOne.mockResolvedValue({
        id: 9,
        official_code: 'SP09',
      });

      await expect(service.stateFor(1)).resolves.toEqual({
        state: PrimaryRequestStateEnum.DRAFT,
        program_code: 'SP09',
        declined_by_codes: [],
      });
    });
  });

  describe('findPendingPrimaryInitiativeId() — PSR-T-6 (assertSubmittable swap guard / syncContributingPrograms exclusion)', () => {
    it('returns the pending SP id when one exists', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue({
        shared_inititiative_id: 12,
      });

      await expect(service.findPendingPrimaryInitiativeId(1)).resolves.toBe(12);

      expect(mockShareResultRequestRepository.findOne).toHaveBeenCalledWith({
        where: {
          result_id: 1,
          request_type: RequestTypeEnum.PRIMARY,
          request_status_id: 1,
          is_active: true,
        },
      });
    });

    it('returns null when there is no pending round', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findPendingPrimaryInitiativeId(1),
      ).resolves.toBeNull();
    });
  });

  // `PNS-T-1` — mirror of the suite above for the DRAFT round. Must be seen red: today's service
  // has no `findDraftPrimaryInitiativeId` method at all.
  describe('findDraftPrimaryInitiativeId() — PNS-T-1 (syncContributingPrograms exclusion / assertSubmittable)', () => {
    it('returns the draft SP id when one exists', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue({
        shared_inititiative_id: 9,
      });

      await expect(service.findDraftPrimaryInitiativeId(1)).resolves.toBe(9);

      expect(mockShareResultRequestRepository.findOne).toHaveBeenCalledWith({
        where: {
          result_id: 1,
          request_type: RequestTypeEnum.PRIMARY,
          request_status_id: 4,
          is_active: true,
        },
      });
    });

    it('returns null when there is no draft round', async () => {
      mockShareResultRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.findDraftPrimaryInitiativeId(1)).resolves.toBeNull();
    });
  });

  describe('accept() — PSR-R-4 / PSR-R-8 / DD-3 / DD-4', () => {
    // Defect B (T-3 follow-up): the locked `findOne` now filters on `is_active: true` (same fix
    // that makes a cancelled row unreachable), so a genuinely nonexistent id and a cancelled one
    // are no longer distinguishable at this query — both resolve to `null` and both now map to
    // `conflict`, per the Leader's explicit call ("a missing or inactive row must give the same
    // outcome as today's non-pending path"). `reason: 'not_found'` is kept in
    // `PrimaryDecisionOutcome` (still a valid type) but this code path no longer produces it.
    it('returns conflict (409) when the request row does not exist (collapsed with the inactive-row path)', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce(null);

      await expect(service.accept(1, user)).resolves.toEqual({
        ok: false,
        reason: 'conflict',
      });
    });

    // Falsifier: user with roles only on SP12 accepting an SP09 request → anything other than
    // 403 → FAIL.
    it('returns forbidden (403) for a user with roles only on another SP', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 1,
        request_status_id: 1,
        shared_inititiative_id: 9, // SP09
        result_id: 100,
      });
      mockRoleByUserRepository.isUserAdmin.mockResolvedValue(false);
      mockRoleByUserRepository.hasActiveRoleOnInitiative.mockResolvedValue(
        false,
      );

      await expect(service.accept(1, user)).resolves.toEqual({
        ok: false,
        reason: 'forbidden',
      });
      expect(
        mockRoleByUserRepository.hasActiveRoleOnInitiative,
      ).toHaveBeenCalledWith(user.id, 9);
      expect(mockInitiativeRepoTx.update).not.toHaveBeenCalled();
      expect(mockRequestRepoTx.update).not.toHaveBeenCalled();
    });

    // Falsifier: second accept after the first → anything other than 409 and unchanged rows
    // → FAIL.
    it('returns conflict (409) and touches nothing when the row is no longer pending', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 1,
        request_status_id: 2, // already ACCEPTED
        shared_inititiative_id: 9,
        result_id: 100,
      });

      await expect(service.accept(1, user)).resolves.toEqual({
        ok: false,
        reason: 'conflict',
      });
      expect(mockInitiativeRepoTx.update).not.toHaveBeenCalled();
      expect(mockInitiativeRepoTx.save).not.toHaveBeenCalled();
      expect(mockRequestRepoTx.update).not.toHaveBeenCalled();
      expect(mockTocRepoTx.save).not.toHaveBeenCalled();
    });

    // Defect B (T-3 follow-up, Reviewer finding on T-4): the locked `findOne` had no `is_active`
    // filter, so a *cancelled* (inactive) pending-status-1 row would still be re-loaded and
    // decided here, even though T-4's endpoint already 409s it. Service-level enforcement must
    // give the SAME outcome (conflict, no writes) as the ordinary non-pending path — PSR-R-2 "no
    // longer actionable" / PSR-R-8. This is the falsifier: a status-1 row with `is_active: false`
    // must behave exactly like the already-decided row above, not like a live pending row.
    it('returns conflict (409) and touches nothing for an inactive (cancelled) row, even with status PENDING', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce(null); // is_active:true filter excludes it

      await expect(service.accept(1, user)).resolves.toEqual({
        ok: false,
        reason: 'conflict',
      });
      expect(mockRequestRepoTx.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_active: true }),
        }),
      );
      expect(mockInitiativeRepoTx.update).not.toHaveBeenCalled();
      expect(mockInitiativeRepoTx.save).not.toHaveBeenCalled();
      expect(mockRequestRepoTx.update).not.toHaveBeenCalled();
      expect(mockTocRepoTx.save).not.toHaveBeenCalled();
    });

    it('accepts an ordinary request (no previous owner): writes role 1, seeds ToC, releases contributors, emits "accepted"', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 1,
        request_status_id: 1,
        shared_inititiative_id: 9,
        result_id: 100,
      });
      mockInitiativeRepoTx.find.mockResolvedValueOnce([]); // no previous owner
      mockInitiativeRepoTx.findOne.mockResolvedValueOnce(null); // no former-primary row for SP09
      mockTocRepoTx.findOne.mockResolvedValueOnce(null); // no existing ToC stub
      mockInitiativeCodes({ 9: 'SP09' });

      const outcome = await service.accept(1, user);

      expect(outcome).toEqual({
        ok: true,
        shareResultRequestId: 1,
        state: 'accepted',
      });
      // role 1 written for the new owner (no former row → save, not update).
      expect(mockInitiativeRepoTx.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 100,
          initiative_id: 9,
          initiative_role_id: 1,
          is_active: true,
        }),
      );
      // ToC stub seeded (moved from `populateInitiativeAndTocFromProgramCode`).
      expect(mockTocRepoTx.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 100,
          initiative_ids: 9,
          planned_result: true,
          is_active: true,
        }),
      );
      // The request row itself is marked accepted.
      expect(mockRequestRepoTx.update).toHaveBeenCalledWith(
        { share_result_request_id: 1 },
        expect.objectContaining({ request_status_id: 2, approved_by: 99 }),
      );
      // Center notice, after commit.
      expect(
        mockNotificationService.emitResultNotification,
      ).toHaveBeenCalledWith(
        expect.anything(),
        NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_ACCEPTED,
        expect.any(Array),
        99,
        100,
        expect.stringContaining('SP09'),
      );
    });

    it('accepts a swap: deactivates the old owner, clears its ToC and its old ACCEPTED primary row', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 2,
        request_status_id: 1,
        shared_inititiative_id: 12, // SP12 is being accepted
        result_id: 100,
      });
      mockInitiativeRepoTx.find.mockResolvedValueOnce([
        { id: 55, result_id: 100, initiative_id: 9, initiative_role_id: 1 }, // old owner SP09
      ]);
      mockInitiativeRepoTx.findOne.mockResolvedValueOnce(null); // no dormant SP12 role-1 row
      mockTocRepoTx.findOne.mockResolvedValueOnce(null);
      mockInitiativeCodes({ 12: 'SP12' });

      const outcome = await service.accept(2, user);

      expect(outcome.ok).toBe(true);
      // Old owner's role-1 row deactivated.
      expect(mockInitiativeRepoTx.update).toHaveBeenCalledWith(
        55,
        expect.objectContaining({ is_active: false }),
      );
      // Old owner's ToC mapping retired.
      expect(mockTocRepoTx.update).toHaveBeenCalledWith(
        { result_id: 100, initiative_ids: 9, is_active: true },
        expect.objectContaining({ is_active: false }),
      );
      // Old owner's ACCEPTED `primary` row retired too (T-2 review forward pointer) — two
      // active accepted rows must never coexist.
      expect(mockRequestRepoTx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          request_type: RequestTypeEnum.PRIMARY,
          shared_inititiative_id: 9,
          request_status_id: 2,
          is_active: true,
        }),
        { is_active: false },
      );
    });

    // Falsifier: a notice-emit failure rolls back the accept → FAIL. The accept must stay
    // committed even when the post-commit notice throws.
    it('stays accepted even when the Center notice fails to emit', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 1,
        request_status_id: 1,
        shared_inititiative_id: 9,
        result_id: 100,
      });
      mockInitiativeRepoTx.find.mockResolvedValueOnce([]);
      mockInitiativeRepoTx.findOne.mockResolvedValueOnce(null);
      mockTocRepoTx.findOne.mockResolvedValueOnce(null);
      mockNotificationService.emitResultNotification.mockRejectedValueOnce(
        new Error('notification service down'),
      );

      await expect(service.accept(1, user)).resolves.toEqual({
        ok: true,
        shareResultRequestId: 1,
        state: 'accepted',
      });
    });

    // PSR-R-12: accept() must actually release the contributor drafts, not just no-op —
    // integration of `releaseContributors` inside the same transaction.
    it('releases waiting contributor drafts as part of the same accept transaction', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 1,
        request_status_id: 1,
        shared_inititiative_id: 9,
        result_id: 100,
      });
      mockInitiativeRepoTx.find.mockResolvedValueOnce([]);
      mockInitiativeRepoTx.findOne
        .mockResolvedValueOnce(null) // no former-primary row for SP09
        .mockResolvedValueOnce({ initiative_id: 9 }); // releaseContributors' owner lookup
      mockTocRepoTx.findOne.mockResolvedValueOnce(null);
      mockRequestRepoTx.find.mockResolvedValueOnce([
        {
          share_result_request_id: 21,
          shared_inititiative_id: 12,
          requested_by: 50,
        },
      ]);
      mockRoleByUserRepository.find.mockResolvedValueOnce([
        { obj_user: { id: 70, email: 'member@cgiar.org' } },
      ]);
      mockUserNotificationSettingRepository.find.mockResolvedValueOnce([
        { obj_user: { id: 70, email: 'member@cgiar.org' } },
      ]);
      mockInitiativeCodes({ 9: 'SP09', 12: 'SP12' });

      const outcome = await service.accept(1, user);

      expect(outcome.ok).toBe(true);
      expect(mockRequestRepoTx.update).toHaveBeenCalledWith(
        { share_result_request_id: 21 },
        { owner_initiative_id: 9, request_status_id: 1 },
      );
      expect(
        mockEmailNotificationManagementService.sendEmail,
      ).toHaveBeenCalledTimes(1);
    });

    // Disqualifier acknowledgment: these tests exercise the status re-check (the 409 path) as
    // the guard the lock protects, but they run sequentially against a mock `findOne` that does
    // not itself serialize concurrent callers — the `pessimistic_write` lock's DB-level behavior
    // is not exercised here. Recorded as a gap in the report per the task's Disqualifier clause.
    it('passes `lock: pessimistic_write` on the row read (documents the intended concurrency guard)', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 1,
        request_status_id: 2,
        shared_inititiative_id: 9,
        result_id: 100,
      });

      await service.accept(1, user);

      expect(mockRequestRepoTx.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });
  });

  describe('decline() — PSR-R-5 / PSR-R-6 / PSR-R-7 / PSR-R-8 / DD-8 (table-driven)', () => {
    const leadProjectId = 501;

    it('returns forbidden (403) for a user with roles only on another SP', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 1,
        request_status_id: 1,
        shared_inititiative_id: 9,
        result_id: 100,
      });
      mockRoleByUserRepository.isUserAdmin.mockResolvedValue(false);
      mockRoleByUserRepository.hasActiveRoleOnInitiative.mockResolvedValue(
        false,
      );

      await expect(service.decline(1, user)).resolves.toEqual({
        ok: false,
        reason: 'forbidden',
      });
    });

    it('returns conflict (409) when the row is no longer pending', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 1,
        request_status_id: 3,
        shared_inititiative_id: 9,
        result_id: 100,
      });

      await expect(service.decline(1, user)).resolves.toEqual({
        ok: false,
        reason: 'conflict',
      });
      expect(mockRequestRepoTx.update).not.toHaveBeenCalled();
    });

    // Defect B (T-3 follow-up, Reviewer finding on T-4) — same service-level enforcement as
    // `accept()`: a cancelled (inactive) row must not be decidable even while its stale
    // `request_status_id` still reads PENDING.
    it('returns conflict (409) and touches nothing for an inactive (cancelled) row, even with status PENDING', async () => {
      mockRequestRepoTx.findOne.mockResolvedValueOnce(null); // is_active:true filter excludes it

      await expect(service.decline(1, user)).resolves.toEqual({
        ok: false,
        reason: 'conflict',
      });
      expect(mockRequestRepoTx.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_active: true }),
        }),
      );
      expect(mockRequestRepoTx.update).not.toHaveBeenCalled();
      expect(mockRequestRepoTx.insert).not.toHaveBeenCalled();
    });

    // alignments = 1 (single SP) → always sent back, no move attempted.
    it('1 alignment: sends the result back, no auto-move', async () => {
      mockLeadProject(leadProjectId);
      mockMappings([
        { programCode: 'SP13', allocation: '100', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([{ id: 13, official_code: 'SP13' }]);
      mockInitiativeCodes({ 13: 'SP13' });
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 1,
        request_status_id: 1,
        shared_inititiative_id: 13,
        result_id: 100,
      });

      const outcome = await service.decline(1, user);

      expect(outcome).toEqual({
        ok: true,
        shareResultRequestId: 1,
        state: 'declined',
      });
      expect(mockRequestRepoTx.update).toHaveBeenCalledWith(
        { share_result_request_id: 1 },
        expect.objectContaining({ request_status_id: 3 }),
      );
      expect(mockRequestRepoTx.insert).not.toHaveBeenCalled();
      expect(
        mockNotificationService.emitResultNotification,
      ).toHaveBeenCalledWith(
        expect.anything(),
        NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
        expect.any(Array),
        99,
        100,
        expect.any(String),
      );
      // "swap: the old owner stays" — decline never touches role 1 / ResultsByInititiative.
      expect(mockInitiativeRepoTx.update).not.toHaveBeenCalled();
      expect(mockInitiativeRepoTx.save).not.toHaveBeenCalled();
    });

    // alignments = 2, other SP has NOT declined this round → auto-move (PSR-R-5).
    it('2 alignments, other not yet declined: auto-moves to the other SP and removes it from contributor drafts', async () => {
      mockLeadProject(leadProjectId);
      mockMappings([
        { programCode: 'SP09', allocation: '70', status: 'Confirmed' } as any,
        { programCode: 'SP12', allocation: '30', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([
        { id: 9, official_code: 'SP09' },
        { id: 12, official_code: 'SP12' },
      ]);
      mockInitiativeCodes({ 9: 'SP09', 12: 'SP12' });

      mockRequestRepoTx.findOne
        .mockResolvedValueOnce({
          share_result_request_id: 1,
          request_status_id: 1,
          shared_inititiative_id: 9,
          result_id: 100,
        })
        // otherAlreadyDeclined check for SP12 → none.
        .mockResolvedValueOnce(null);
      mockRequestRepoTx.insert.mockResolvedValueOnce({
        identifiers: [{ share_result_request_id: 77 }],
      });

      const outcome = await service.decline(1, user);

      expect(outcome).toEqual({
        ok: true,
        shareResultRequestId: 1,
        state: 'moved',
      });
      // The move itself: a new pending `primary` row to SP12.
      expect(mockRequestRepoTx.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          shared_inititiative_id: 12,
          request_type: RequestTypeEnum.PRIMARY,
          request_status_id: 1,
        }),
      );
      // SP12 removed from any contributor draft/pending row (PSR-R-5 "can't be both").
      expect(mockRequestRepoTx.update).toHaveBeenCalledWith(
        expect.objectContaining({
          request_type: RequestTypeEnum.CONTRIBUTION,
          shared_inititiative_id: 12,
        }),
        { is_active: false },
      );
      expect(
        mockNotificationService.emitResultNotification,
      ).toHaveBeenCalledWith(
        expect.anything(),
        NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_MOVED,
        expect.any(Array),
        99,
        100,
        expect.stringContaining('SP12'),
      );
    });

    // Falsifier: 2-alignment decline where the other SP already declined still creates a
    // request → FAIL.
    it('2 alignments, other SP already declined this round: sends back, no second request', async () => {
      mockLeadProject(leadProjectId);
      mockMappings([
        { programCode: 'SP09', allocation: '70', status: 'Confirmed' } as any,
        { programCode: 'SP12', allocation: '30', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([
        { id: 9, official_code: 'SP09' },
        { id: 12, official_code: 'SP12' },
      ]);
      mockInitiativeCodes({ 9: 'SP09', 12: 'SP12' });

      mockRequestRepoTx.findOne
        .mockResolvedValueOnce({
          share_result_request_id: 1,
          request_status_id: 1,
          shared_inititiative_id: 9,
          result_id: 100,
        })
        // otherAlreadyDeclined check for SP12 → a row (PSR-R-7 "both SPs decline").
        .mockResolvedValueOnce({
          share_result_request_id: 44,
          shared_inititiative_id: 12,
          request_status_id: 3,
          is_active: true,
        });

      const outcome = await service.decline(1, user);

      expect(outcome).toEqual({
        ok: true,
        shareResultRequestId: 1,
        state: 'declined',
      });
      expect(mockRequestRepoTx.insert).not.toHaveBeenCalled();
      expect(
        mockNotificationService.emitResultNotification,
      ).toHaveBeenCalledWith(
        expect.anything(),
        NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
        expect.any(Array),
        99,
        100,
        expect.any(String),
      );
    });

    // alignments = 3 → always sent back (PSR-R-6), regardless of any other SP's status.
    it('3 alignments: sends the result back directly, no auto-move', async () => {
      mockLeadProject(leadProjectId);
      mockMappings([
        { programCode: 'SP09', allocation: '40', status: 'Confirmed' } as any,
        { programCode: 'SP12', allocation: '30', status: 'Confirmed' } as any,
        { programCode: 'SP03', allocation: '30', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([
        { id: 9, official_code: 'SP09' },
        { id: 12, official_code: 'SP12' },
        { id: 3, official_code: 'SP03' },
      ]);
      mockInitiativeCodes({ 9: 'SP09', 12: 'SP12', 3: 'SP03' });
      mockRequestRepoTx.findOne.mockResolvedValueOnce({
        share_result_request_id: 1,
        request_status_id: 1,
        shared_inititiative_id: 9,
        result_id: 100,
      });

      const outcome = await service.decline(1, user);

      expect(outcome).toEqual({
        ok: true,
        shareResultRequestId: 1,
        state: 'declined',
      });
      expect(mockRequestRepoTx.insert).not.toHaveBeenCalled();
    });

    // --- T-3 rework attempt 2, Lens A issue 1: a swap decline (an active role-1 owner exists)
    // must NEVER auto-move — requirements.md PSR-R-2 swap "SP09 stays ... on decline SP09
    // stays"; design.md §2.2 "otherwise ... none (swap: the old owner stays)". Table-driven over
    // alignments {1, 2, 3}, all with an active owner present.
    describe('swap decline (an active role-1 owner exists): never auto-moves', () => {
      beforeEach(() => {
        // An active owner (SP09, initiative 9) is present for every test in this block.
        mockInitiativeRepoTx.findOne.mockResolvedValue({
          id: 77,
          result_id: 100,
          initiative_id: 9,
          initiative_role_id: 1,
          is_active: true,
        });
      });

      it('1 alignment, owner exists: declined, no move, owner untouched', async () => {
        mockLeadProject(leadProjectId);
        mockMappings([
          {
            programCode: 'SP13',
            allocation: '100',
            status: 'Confirmed',
          } as any,
        ]);
        mockInitiatives([{ id: 13, official_code: 'SP13' }]);
        mockInitiativeCodes({ 13: 'SP13' });
        // The pending swap request is to SP13 (a third alignment) — the owner is SP09.
        mockRequestRepoTx.findOne.mockResolvedValueOnce({
          share_result_request_id: 1,
          request_status_id: 1,
          shared_inititiative_id: 13,
          result_id: 100,
        });

        const outcome = await service.decline(1, user);

        expect(outcome).toEqual({
          ok: true,
          shareResultRequestId: 1,
          state: 'declined',
        });
        expect(mockRequestRepoTx.insert).not.toHaveBeenCalled();
        expect(mockInitiativeRepoTx.update).not.toHaveBeenCalled();
        expect(mockInitiativeRepoTx.save).not.toHaveBeenCalled();
      });

      // The exact bug the review found: SP12's swap request declines while SP09 (the alignment
      // pair) is the current owner — `getOtherAlignment` would return SP09 itself.
      it('2 alignments (owner is one of them), other not declined: still declined, no move to the current owner', async () => {
        mockLeadProject(leadProjectId);
        mockMappings([
          { programCode: 'SP09', allocation: '70', status: 'Confirmed' } as any,
          { programCode: 'SP12', allocation: '30', status: 'Confirmed' } as any,
        ]);
        mockInitiatives([
          { id: 9, official_code: 'SP09' },
          { id: 12, official_code: 'SP12' },
        ]);
        mockInitiativeCodes({ 9: 'SP09', 12: 'SP12' });
        mockRequestRepoTx.findOne.mockResolvedValueOnce({
          share_result_request_id: 2,
          request_status_id: 1,
          shared_inititiative_id: 12,
          result_id: 100,
        });

        const outcome = await service.decline(2, user);

        expect(outcome).toEqual({
          ok: true,
          shareResultRequestId: 2,
          state: 'declined',
        });
        // Falsifier: must NOT insert a new pending `primary` row to SP09 (the current owner).
        expect(mockRequestRepoTx.insert).not.toHaveBeenCalled();
        expect(mockInitiativeRepoTx.update).not.toHaveBeenCalled();
        expect(mockInitiativeRepoTx.save).not.toHaveBeenCalled();
        expect(
          mockNotificationService.emitResultNotification,
        ).toHaveBeenCalledWith(
          expect.anything(),
          NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
          expect.any(Array),
          99,
          100,
          expect.any(String),
        );
      });

      it('3 alignments, owner exists: declined, no move', async () => {
        mockLeadProject(leadProjectId);
        mockMappings([
          { programCode: 'SP09', allocation: '40', status: 'Confirmed' } as any,
          { programCode: 'SP12', allocation: '30', status: 'Confirmed' } as any,
          { programCode: 'SP03', allocation: '30', status: 'Confirmed' } as any,
        ]);
        mockInitiatives([
          { id: 9, official_code: 'SP09' },
          { id: 12, official_code: 'SP12' },
          { id: 3, official_code: 'SP03' },
        ]);
        mockInitiativeCodes({ 9: 'SP09', 12: 'SP12', 3: 'SP03' });
        mockRequestRepoTx.findOne.mockResolvedValueOnce({
          share_result_request_id: 3,
          request_status_id: 1,
          shared_inititiative_id: 3,
          result_id: 100,
        });

        const outcome = await service.decline(3, user);

        expect(outcome).toEqual({
          ok: true,
          shareResultRequestId: 3,
          state: 'declined',
        });
        expect(mockRequestRepoTx.insert).not.toHaveBeenCalled();
        expect(mockInitiativeRepoTx.update).not.toHaveBeenCalled();
      });
    });

    // --- T-3 rework attempt 2, Lens A issue 2: the CONTRIBUTION cleanup must only run once the
    // move itself is confirmed. Force `request()` to report `internal_error` (its own `insert`
    // rejects) and assert the decline still lands as *declined*, with no contributor cleanup.
    it('move failure (no owner, 2 alignments): falls back to declined, no contributor cleanup, no moved notice', async () => {
      mockLeadProject(leadProjectId);
      mockMappings([
        { programCode: 'SP09', allocation: '70', status: 'Confirmed' } as any,
        { programCode: 'SP12', allocation: '30', status: 'Confirmed' } as any,
      ]);
      mockInitiatives([
        { id: 9, official_code: 'SP09' },
        { id: 12, official_code: 'SP12' },
      ]);
      mockInitiativeCodes({ 9: 'SP09', 12: 'SP12' });
      mockInitiativeRepoTx.findOne.mockResolvedValueOnce(null); // no owner

      mockRequestRepoTx.findOne
        .mockResolvedValueOnce({
          share_result_request_id: 1,
          request_status_id: 1,
          shared_inititiative_id: 9,
          result_id: 100,
        })
        // otherAlreadyDeclined check for SP12 → none.
        .mockResolvedValueOnce(null);
      // The move's own insert blows up → request() catches it and returns internal_error.
      mockRequestRepoTx.insert.mockRejectedValueOnce(new Error('db down'));

      const outcome = await service.decline(1, user);

      expect(outcome).toEqual({
        ok: true,
        shareResultRequestId: 1,
        state: 'declined',
      });
      // No CONTRIBUTION-row cleanup: the move never actually happened.
      expect(mockRequestRepoTx.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          request_type: RequestTypeEnum.CONTRIBUTION,
          shared_inititiative_id: 12,
        }),
        { is_active: false },
      );
      expect(
        mockNotificationService.emitResultNotification,
      ).toHaveBeenCalledWith(
        expect.anything(),
        NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
        expect.any(Array),
        99,
        100,
        expect.any(String),
      );
    });
  });

  describe('request() — manager routing (T-5 review, 2nd defect)', () => {
    it('routes the lead-project and alignment reads through the caller-supplied manager, not the injected repositories', async () => {
      const managerShareRepo = {
        find: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        insert: jest.fn().mockResolvedValue({
          identifiers: [{ share_result_request_id: 77 }],
        }),
      };
      const managerProjectsRepo = {
        find: jest.fn().mockResolvedValue([{ project_id: 501 }]),
      };
      const managerMappingRepo = {
        find: jest
          .fn()
          .mockResolvedValue([
            { programCode: 'SP09', allocation: '70', status: 'Confirmed' },
          ]),
      };
      const managerInitiativesRepo = {
        find: jest.fn().mockResolvedValue([{ id: 9, official_code: 'SP09' }]),
      };
      const manager = {
        getRepository: jest.fn((entity: unknown) => {
          if (entity === ShareResultRequest) return managerShareRepo;
          if (entity === ResultsByProjects) return managerProjectsRepo;
          if (entity === ClarisaProjectMapping) return managerMappingRepo;
          if (entity === ClarisaInitiative) return managerInitiativesRepo;
          throw new Error(`unexpected entity ${String(entity)}`);
        }),
      } as any;

      const outcome = await service.request(1, 9, user, manager);

      expect(outcome).toEqual({ ok: true, shareResultRequestId: 77 });
      expect(manager.getRepository).toHaveBeenCalledWith(ResultsByProjects);
      expect(manager.getRepository).toHaveBeenCalledWith(ClarisaProjectMapping);
      expect(manager.getRepository).toHaveBeenCalledWith(ClarisaInitiative);
      expect(manager.getRepository).toHaveBeenCalledWith(ShareResultRequest);
      // Falsifier (T-5 review): these reads must NOT fall back to the plain injected
      // repositories — that would be the stale, pre-transaction view the review found.
      expect(mockResultsByProjectsRepository.find).not.toHaveBeenCalled();
      expect(mockClarisaProjectMappingRepository.find).not.toHaveBeenCalled();
      expect(mockClarisaInitiativesRepository.find).not.toHaveBeenCalled();
      expect(mockShareResultRequestRepository.find).not.toHaveBeenCalled();
      expect(mockShareResultRequestRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('releaseContributors() — PSR-R-12 / DD-9 (idempotent by construction)', () => {
    beforeEach(() => {
      mockInitiativeCodes({ 9: 'SP09', 12: 'SP12' });
    });

    it('no-ops (no query, no writes) when the result has no owner yet ("save while on hold")', async () => {
      mockInitiativeRepoTx.findOne.mockResolvedValueOnce(null);

      await expect(service.releaseContributors(1)).resolves.toEqual({
        released: 0,
      });
      expect(mockRequestRepoTx.find).not.toHaveBeenCalled();
    });

    // `PSR-T-6` rework attempt 3 (Reviewer FAIL) — "no duplicate at approval" (`PSR-R-13`) rests
    // entirely on this query's criteria, because `results.service.ts` now calls
    // `releaseContributors` unconditionally on every review approval. No existing test pinned the
    // criteria themselves — they mock the repository's return value, never assert what was asked
    // for — so dropping the `request_status_id: DRAFT` filter (the actual bug this guards
    // against: re-releasing already-released, now status-1, rows on every approval) left every
    // test green. Pin the `where` clause directly.
    it('queries only ACTIVE, DRAFT, CONTRIBUTION rows (the criteria "no duplicate release" rests on)', async () => {
      mockInitiativeRepoTx.findOne.mockResolvedValueOnce({ initiative_id: 9 });
      mockRequestRepoTx.find.mockResolvedValueOnce([]);

      await service.releaseContributors(1);

      expect(mockRequestRepoTx.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          request_type: RequestTypeEnum.CONTRIBUTION,
          request_status_id: 4,
          is_active: true,
        }),
      });
    });

    it('releases every status-4 contribution draft: owner filled, status 1, one email each', async () => {
      mockInitiativeRepoTx.findOne.mockResolvedValueOnce({ initiative_id: 9 });
      mockRequestRepoTx.find.mockResolvedValueOnce([
        {
          share_result_request_id: 21,
          shared_inititiative_id: 12,
          requested_by: 50,
        },
      ]);
      mockRoleByUserRepository.find.mockResolvedValueOnce([
        { obj_user: { id: 70, email: 'member@cgiar.org' } },
      ]);
      mockUserNotificationSettingRepository.find.mockResolvedValueOnce([
        { obj_user: { id: 70, email: 'member@cgiar.org' } },
      ]);

      const result = await service.releaseContributors(1);

      expect(result).toEqual({ released: 1 });
      expect(mockRequestRepoTx.update).toHaveBeenCalledWith(
        { share_result_request_id: 21 },
        { owner_initiative_id: 9, request_status_id: 1 },
      );
      expect(
        mockEmailNotificationManagementService.sendEmail,
      ).toHaveBeenCalledTimes(1);
    });

    // Falsifier: release twice → duplicate status-1 rows or duplicate emails → FAIL. The query
    // filters on status 4 (DRAFT) only, so a row this call already released (now status 1) is
    // naturally excluded from the next call — modelled here by the second `find` returning [].
    it('is idempotent: a second call over the same (now-released) rows does nothing further', async () => {
      mockInitiativeRepoTx.findOne.mockResolvedValue({ initiative_id: 9 });
      mockRequestRepoTx.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 21,
            shared_inititiative_id: 12,
            requested_by: 50,
          },
        ])
        .mockResolvedValueOnce([]);
      mockRoleByUserRepository.find.mockResolvedValue([
        { obj_user: { id: 70, email: 'member@cgiar.org' } },
      ]);
      mockUserNotificationSettingRepository.find.mockResolvedValue([
        { obj_user: { id: 70, email: 'member@cgiar.org' } },
      ]);

      await service.releaseContributors(1);
      const second = await service.releaseContributors(1);

      expect(second).toEqual({ released: 0 });
      expect(mockRequestRepoTx.update).toHaveBeenCalledTimes(1);
      expect(
        mockEmailNotificationManagementService.sendEmail,
      ).toHaveBeenCalledTimes(1);
    });

    it('still marks the row released when the email template is missing (logged, not thrown)', async () => {
      mockInitiativeRepoTx.findOne.mockResolvedValueOnce({ initiative_id: 9 });
      mockRequestRepoTx.find.mockResolvedValueOnce([
        {
          share_result_request_id: 21,
          shared_inititiative_id: 12,
          requested_by: 50,
        },
      ]);
      mockRoleByUserRepository.find.mockResolvedValueOnce([
        { obj_user: { id: 70, email: 'member@cgiar.org' } },
      ]);
      mockUserNotificationSettingRepository.find.mockResolvedValueOnce([
        { obj_user: { id: 70, email: 'member@cgiar.org' } },
      ]);
      mockTemplateRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.releaseContributors(1)).resolves.toEqual({
        released: 1,
      });
      expect(mockRequestRepoTx.update).toHaveBeenCalledWith(
        { share_result_request_id: 21 },
        { owner_initiative_id: 9, request_status_id: 1 },
      );
      expect(
        mockEmailNotificationManagementService.sendEmail,
      ).not.toHaveBeenCalled();
    });
  });
});
