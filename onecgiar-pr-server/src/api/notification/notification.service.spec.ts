import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationLevelRepository } from './repositories/notification-level.respository';
import { NotificationTypeRepository } from './repositories/notification-type.respository';
import { NotificationRepository } from './repositories/notification.respository';
import { SocketManagementService } from '../../shared/microservices/socket-management/socket-management.service';
import { ShareResultRequestService } from '../results/share-result-request/share-result-request.service';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from './enum/notification.enum';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { In, Not } from 'typeorm';

const mockNotificationLevelRepository = {
  findOne: jest.fn(),
};

const mockNotificationTypeRepository = {
  findOne: jest.fn(),
};

const mockNotificationRepository = {
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockSocketManagementService = {
  getActiveUsers: jest.fn(),
  sendNotificationToUsers: jest.fn(),
};

const mockShareResultRequestService = {
  getReceivedResultRequestPopUp: jest.fn(),
};
const mockUserRepository = {
  InitiativeByUser: jest.fn(),
  findOne: jest.fn(),
};

const mockResultByInitiativesRepository = {
  getOwnerInitiativeByResult: jest.fn(),
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Default: an unmocked `.find()` behaves like a real repository call that matched nothing,
    // not like a call nobody expected — pre-existing tests in this file never mock `.find()`
    // because `getRecentResultActivity` used to call only `.createQueryBuilder()`; the
    // `BILATERAL_AI_JOB_FINISHED` read-path branch (`design.md` §6.4) now calls `.find()` there
    // too, alongside `getAllNotifications`/`getPopUpNotifications`, which already did.
    mockNotificationRepository.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NotificationLevelRepository,
          useValue: mockNotificationLevelRepository,
        },
        {
          provide: NotificationTypeRepository,
          useValue: mockNotificationTypeRepository,
        },
        {
          provide: NotificationRepository,
          useValue: mockNotificationRepository,
        },
        {
          provide: SocketManagementService,
          useValue: mockSocketManagementService,
        },
        {
          provide: ShareResultRequestService,
          useValue: mockShareResultRequestService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: mockResultByInitiativesRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('emitResultNotification', () => {
    beforeEach(() => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 1,
      });
      mockNotificationTypeRepository.findOne.mockResolvedValue({
        notifications_type_id: 2,
      });
      mockNotificationRepository.save.mockResolvedValue(null);
      mockNotificationRepository.findOne.mockResolvedValue({
        obj_emitter_user: {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        },
        obj_result: {
          result_code: 123,
        },
      });
    });

    it('should persist notifications and emit socket payload with byUser metadata', async () => {
      mockSocketManagementService.getActiveUsers.mockResolvedValue({
        response: [{ userId: 2 }],
        status: 200,
      });
      mockSocketManagementService.sendNotificationToUsers.mockResolvedValue({
        status: 200,
      });

      const response = await service.emitResultNotification(
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_CREATED,
        [1, 2, 3],
        1,
        99,
      );

      expect(mockNotificationRepository.save).toHaveBeenCalledWith([
        {
          target_user: 2,
          emitter_user: 1,
          result_id: 99,
          notification_level: 1,
          notification_type: 2,
        },
        {
          target_user: 3,
          emitter_user: 1,
          result_id: 99,
          notification_level: 1,
          notification_type: 2,
        },
      ]);

      expect(
        mockSocketManagementService.sendNotificationToUsers,
      ).toHaveBeenCalledTimes(1);

      const [, notificationPayload] =
        mockSocketManagementService.sendNotificationToUsers.mock.calls[0];

      expect(notificationPayload).toMatchObject({
        byUser: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
        },
        desc: expect.stringContaining('John Doe'),
      });

      expect(response).toMatchObject({
        message: 'Notification created successfully',
        status: 201,
      });
    });

    it('should return without emitting when no matched online users', async () => {
      mockSocketManagementService.getActiveUsers.mockResolvedValue({
        response: [],
        status: 200,
      });

      const result = await service.emitResultNotification(
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_CREATED,
        [1, 2],
        1,
        99,
      );

      expect(
        mockSocketManagementService.sendNotificationToUsers,
      ).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        message: 'Notifications stored; no online recipients.',
        status: 201,
      });
      expect(mockNotificationRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('getRecentResultActivity', () => {
    const user: TokenDto = {
      id: 10,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    };

    it('should resolve initiative data using fallback when missing', async () => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 1,
      });
      mockUserRepository.InitiativeByUser.mockResolvedValue([{ id: 1 }]);

      const queryBuilder: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            notification_id: '1',
            result_id: 200,
            obj_result: {
              result_code: 1234,
              title: 'Result with owner',
              obj_result_by_initiatives: [
                {
                  initiative_role_id: 1,
                  is_active: true,
                  initiative_id: 55,
                  obj_initiative: {
                    name: 'Primary Initiative',
                    official_code: 'PI-1',
                  },
                },
              ],
            },
            obj_notification_type: {
              type: NotificationTypeEnum.RESULT_SUBMITTED,
            },
            obj_emitter_user: {
              first_name: 'Alice',
              last_name: 'Smith',
            },
            emitter_user: 3,
            created_date: new Date('2024-01-01'),
          },
          {
            notification_id: '2',
            result_id: 201,
            obj_result: {
              result_code: 5678,
              title: 'Result without owner',
              obj_result_by_initiatives: [],
            },
            obj_notification_type: {
              type: NotificationTypeEnum.RESULT_CREATED,
            },
            obj_emitter_user: null,
            emitter_user: null,
            created_date: new Date('2024-01-02'),
          },
        ]),
      };

      mockNotificationRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      mockResultByInitiativesRepository.getOwnerInitiativeByResult.mockResolvedValueOnce(
        {
          id: 77,
          initiative_name: 'Fallback Initiative',
          official_code: 'FB-01',
        },
      );

      const result = await service.getRecentResultActivity(user, 5);

      expect(mockUserRepository.InitiativeByUser).toHaveBeenCalledWith(user.id);
      expect(
        mockResultByInitiativesRepository.getOwnerInitiativeByResult,
      ).toHaveBeenCalledWith(201);

      expect(result.response).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            initiativeName: 'Primary Initiative',
            initiativeOfficialCode: 'PI-1',
          }),
          expect.objectContaining({
            initiativeName: 'Fallback Initiative',
            initiativeOfficialCode: 'FB-01',
          }),
        ]),
      );
      expect(result.status).toBe(200);
    });

    it('should return global notifications when user lacks initiative roles', async () => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 1,
      });
      mockUserRepository.InitiativeByUser.mockResolvedValue([]);

      const rawQueryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { notification_id: '10', result_id: 300 },
          { notification_id: '11', result_id: 301 },
        ]),
      };

      const baseQueryBuilder: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            notification_id: '10',
            result_id: 300,
            obj_result: {
              result_code: 9001,
              title: 'Global Result 1',
              obj_result_by_initiatives: [],
            },
            obj_notification_type: {
              type: NotificationTypeEnum.RESULT_CREATED,
            },
            obj_emitter_user: null,
            emitter_user: null,
            created_date: new Date('2024-01-03'),
          },
          {
            notification_id: '11',
            result_id: 301,
            obj_result: {
              result_code: 9002,
              title: 'Global Result 2',
              obj_result_by_initiatives: [],
            },
            obj_notification_type: {
              type: NotificationTypeEnum.RESULT_SUBMITTED,
            },
            obj_emitter_user: null,
            emitter_user: null,
            created_date: new Date('2024-01-04'),
          },
        ]),
      };

      mockNotificationRepository.createQueryBuilder
        .mockReturnValueOnce(rawQueryBuilder)
        .mockReturnValueOnce(baseQueryBuilder);
      mockResultByInitiativesRepository.getOwnerInitiativeByResult.mockResolvedValue(
        null,
      );

      const result = await service.getRecentResultActivity(user, 2);

      expect(mockUserRepository.InitiativeByUser).toHaveBeenCalledWith(user.id);
      expect(rawQueryBuilder.getRawMany).toHaveBeenCalled();
      expect(baseQueryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.notification_id IN (:...notificationIds)',
        {
          notificationIds: [10, 11],
        },
      );
      expect(
        mockResultByInitiativesRepository.getOwnerInitiativeByResult,
      ).toHaveBeenNthCalledWith(1, 300);
      expect(
        mockResultByInitiativesRepository.getOwnerInitiativeByResult,
      ).toHaveBeenNthCalledWith(2, 301);
      expect(result.response).toHaveLength(2);
      expect(result.status).toBe(200);
    });

    // NOTIF-T-12 (rework attempt 2, issue 2): this call site used to pass `undefined` for the
    // program code — the only caller that never resolved one — which garbled a bare-label
    // `RESULT_BILATERAL_PROJECT_TAGGED` row's `message`. It must now reuse the same owner
    // initiative's `official_code` already resolved for `initiativeOfficialCode`.
    it('resolves the owner program code into a bare-label tagged-project message', async () => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 1,
      });
      mockUserRepository.InitiativeByUser.mockResolvedValue([{ id: 1 }]);

      const queryBuilder: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            notification_id: '1',
            result_id: 200,
            text: 'P-1568-WBS0',
            obj_result: {
              result_code: 1234,
              title: 'Tagged bilateral result',
              obj_result_by_initiatives: [
                {
                  initiative_role_id: 1,
                  is_active: true,
                  initiative_id: 55,
                  obj_initiative: {
                    name: 'Primary Initiative',
                    official_code: 'SP5',
                  },
                },
              ],
            },
            obj_notification_type: {
              type: NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED,
            },
            obj_emitter_user: {
              first_name: 'Jane',
              last_name: 'Doe',
            },
            emitter_user: 3,
            created_date: new Date('2024-01-01'),
          },
        ]),
      };

      mockNotificationRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      const result = await service.getRecentResultActivity(user, 5);

      expect(result.response).toEqual([
        expect.objectContaining({
          initiativeOfficialCode: 'SP5',
          message:
            'Jane Doe from SP5 has tagged project P-1568-WBS0 as contributor to result 1234 - Tagged bilateral result',
        }),
      ]);
    });
  });

  // P2-3157 AC2 — the standardized copy for a bilateral review decision.
  describe('bilateral review notification copy', () => {
    const emitAndReadDescription = async (
      notificationType: NotificationTypeEnum,
      resultOverrides: Record<string, any> = {},
      renderedText?: string,
    ): Promise<string> => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 2,
      });
      mockNotificationTypeRepository.findOne.mockResolvedValue({
        notifications_type_id: 6,
      });
      mockNotificationRepository.save.mockResolvedValue(null);
      mockNotificationRepository.findOne.mockResolvedValue({
        obj_emitter_user: {
          id: 9,
          first_name: 'Ana',
          last_name: 'Reviewer',
          email: 'ana@example.com',
        },
        obj_result: {
          result_code: 4321,
          title: 'A bilateral result title',
          obj_result_by_initiatives: [
            { obj_initiative: { id: 5, official_code: 'SP5' } },
          ],
          ...resultOverrides,
        },
      });
      mockSocketManagementService.getActiveUsers.mockResolvedValue({
        response: [{ userId: 2 }],
        status: 200,
      });
      mockSocketManagementService.sendNotificationToUsers.mockResolvedValue({
        status: 200,
      });

      await service.emitResultNotification(
        NotificationLevelEnum.RESULT,
        notificationType,
        [2],
        9,
        4321,
        renderedText,
      );

      const [, payload] =
        mockSocketManagementService.sendNotificationToUsers.mock.calls.at(-1);
      return payload.desc;
    };

    // NDCW-R-2/R-3: the center sentence is stored text; the toast must carry the same words.
    it('builds the center copy from stored text (approved)', async () => {
      const desc = await emitAndReadDescription(
        NotificationTypeEnum.BILATERAL_RESULT_APPROVED,
        {},
        'where your center was tagged, has been approved by the Science Program SP03.',
      );

      expect(desc).toBe(
        'The result 4321 - A bilateral result title, where your center was tagged, has been approved by the Science Program SP03.',
      );
      expect(desc).not.toContain('Your Result');
    });

    it('builds the center copy from stored text (rejected, no program code)', async () => {
      const desc = await emitAndReadDescription(
        NotificationTypeEnum.BILATERAL_RESULT_REJECTED,
        {},
        'where your center was tagged, has been rejected by the Science Program.',
      );

      expect(desc).toBe(
        'The result 4321 - A bilateral result title, where your center was tagged, has been rejected by the Science Program.',
      );
    });

    it('builds the approved copy with the result identity and the owner program code', async () => {
      const desc = await emitAndReadDescription(
        NotificationTypeEnum.BILATERAL_RESULT_APPROVED,
      );

      expect(desc).toBe(
        '✅ Your Result 4321 - A bilateral result title has been Approved by the Science Program SP5.',
      );
    });

    it('builds the rejected copy', async () => {
      const desc = await emitAndReadDescription(
        NotificationTypeEnum.BILATERAL_RESULT_REJECTED,
      );

      expect(desc).toBe(
        '❌ Your Result 4321 - A bilateral result title has been Rejected by the Science Program SP5.',
      );
    });

    it('truncates a long title', async () => {
      const desc = await emitAndReadDescription(
        NotificationTypeEnum.BILATERAL_RESULT_APPROVED,
        { title: 'x'.repeat(80) },
      );

      expect(desc).toContain(`${'x'.repeat(60)}...`);
      expect(desc).not.toContain('x'.repeat(61));
    });

    it('falls back to a generic program mention when no owner initiative is present', async () => {
      const desc = await emitAndReadDescription(
        NotificationTypeEnum.BILATERAL_RESULT_REJECTED,
        { obj_result_by_initiatives: [] },
      );

      expect(desc).toBe(
        '❌ Your Result 4321 - A bilateral result title has been Rejected by the Science Program.',
      );
    });
  });

  // NOTIF-T-12 (rework attempt 2, issue 2): `buildResultNotificationDescription`'s
  // `RESULT_BILATERAL_PROJECT_TAGGED` branch didn't disambiguate a bare project label from a
  // legacy/BCT-T-4 composed sentence, so the socket push (this describe, via
  // `emitResultNotification`) and `getRecentResultActivity`'s `message` field both garbled bare
  // rows. All 4 text shapes must render correctly here too, mirroring the client fix.
  describe('RESULT_BILATERAL_PROJECT_TAGGED notification copy', () => {
    const emitAndReadDescription = async (
      renderedText?: string,
      resultOverrides: Record<string, any> = {},
    ): Promise<string> => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 2,
      });
      mockNotificationTypeRepository.findOne.mockResolvedValue({
        notifications_type_id: 7,
      });
      mockNotificationRepository.save.mockResolvedValue(null);
      mockNotificationRepository.findOne.mockResolvedValue({
        obj_emitter_user: {
          id: 9,
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
        },
        obj_result: {
          result_code: 4321,
          title: 'A bilateral result title',
          obj_result_by_initiatives: [
            { obj_initiative: { id: 5, official_code: 'SP5' } },
          ],
          ...resultOverrides,
        },
      });
      mockSocketManagementService.getActiveUsers.mockResolvedValue({
        response: [{ userId: 2 }],
        status: 200,
      });
      mockSocketManagementService.sendNotificationToUsers.mockResolvedValue({
        status: 200,
      });

      await service.emitResultNotification(
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED,
        [2],
        9,
        4321,
        renderedText,
      );

      const [, payload] =
        mockSocketManagementService.sendNotificationToUsers.mock.calls.at(-1);
      return payload.desc;
    };

    it('builds the full sentence for a genuine bare project label', async () => {
      const desc = await emitAndReadDescription('P-1568-WBS0');

      expect(desc).toBe(
        'Jane Doe from SP5 has tagged project P-1568-WBS0 as contributor to result 4321 - A bilateral result title',
      );
    });

    it('falls back to the old rendering for a BCT-T-4 submission-flow composed sentence', async () => {
      const bctText =
        'reported by AR has tagged the P-CIP of your center (CIP). Click to see the result.';
      const desc = await emitAndReadDescription(bctText);

      expect(desc).toBe(
        `The result 4321 - A bilateral result title ${bctText}`,
      );
    });

    it('falls back to the old rendering for a legacy (pre-fix) composed sentence', async () => {
      const legacyText =
        'created by SP04 has tagged the P-1568-WBS0. Click to see the result.';
      const desc = await emitAndReadDescription(legacyText);

      expect(desc).toBe(
        `The result 4321 - A bilateral result title ${legacyText}`,
      );
    });

    it('falls back to the generic update line (no "undefined") when text is empty', async () => {
      const desc = await emitAndReadDescription('   ');

      expect(desc).not.toContain('undefined');
      expect(desc).toBe('There is a new update on result 4321');
    });
  });

  // WCT-T-1 (design.md §7.1, requirements.md WCT-R-5 push clause) — the real-time socket push
  // must mirror the client's bare-shape sentence, not the shared `buildTaggedSuffixDescription`
  // fallback. Composed (legacy) and empty text keep the old rendering, mirroring the
  // `RESULT_BILATERAL_PROJECT_TAGGED` case above.
  describe('RESULT_CENTER_TAGGED notification copy (WCT-R-5 push clause)', () => {
    const emitAndReadDescription = async (
      renderedText?: string,
      resultOverrides: Record<string, any> = {},
    ): Promise<string> => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 2,
      });
      mockNotificationTypeRepository.findOne.mockResolvedValue({
        notifications_type_id: 8,
      });
      mockNotificationRepository.save.mockResolvedValue(null);
      mockNotificationRepository.findOne.mockResolvedValue({
        obj_emitter_user: {
          id: 9,
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
        },
        obj_result: {
          result_code: 9398,
          title: 'A pooled funding result',
          obj_result_by_initiatives: [
            { obj_initiative: { id: 1, official_code: 'SP01' } },
          ],
          ...resultOverrides,
        },
      });
      mockSocketManagementService.getActiveUsers.mockResolvedValue({
        response: [{ userId: 2 }],
        status: 200,
      });
      mockSocketManagementService.sendNotificationToUsers.mockResolvedValue({
        status: 200,
      });

      await service.emitResultNotification(
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_CENTER_TAGGED,
        [2],
        9,
        9398,
        renderedText,
      );

      const [, payload] =
        mockSocketManagementService.sendNotificationToUsers.mock.calls.at(-1);
      return payload.desc;
    };

    // Falsifier: the push `desc` for bare 'ABC' on result 9398 owned by SP01 is anything other
    // than `SP01 has tagged your CG Center as a contributor (ABC) to result 9398 - <title>`.
    it('builds the full sentence for a bare center acronym', async () => {
      const desc = await emitAndReadDescription('ABC');

      expect(desc).toBe(
        'SP01 has tagged your CG Center as a contributor (ABC) to result 9398 - A pooled funding result',
      );
    });

    it('falls back to "a Science Program" when the owner SP code is missing', async () => {
      const desc = await emitAndReadDescription('ABC', {
        obj_result_by_initiatives: [],
      });

      expect(desc).toBe(
        'a Science Program has tagged your CG Center as a contributor (ABC) to result 9398 - A pooled funding result',
      );
    });

    // Falsifier: a composed legacy text's push `desc` changes.
    it('falls back to the old suffix rendering for a composed (legacy) sentence', async () => {
      const legacyText =
        'created by SP01 has tagged the International Center X. Click to see the result.';
      const desc = await emitAndReadDescription(legacyText);

      expect(desc).toBe(
        `The result 9398 - A pooled funding result ${legacyText}`,
      );
    });

    it('falls back to the old suffix rendering for a BCT composed sentence', async () => {
      const bctText =
        'reported by AfricaRice has tagged the CIP. Click to see the result.';
      const desc = await emitAndReadDescription(bctText);

      expect(desc).toBe(`The result 9398 - A pooled funding result ${bctText}`);
    });

    it('falls back to the generic update line when text is empty', async () => {
      const desc = await emitAndReadDescription('   ');

      expect(desc).not.toContain('undefined');
      expect(desc).toBe('There is a new update on result 9398');
    });
  });

  // `APF-T-3` / `design.md` §6.4 "Write path".
  describe('emitBilateralAiJobNotification', () => {
    it('writes a direct row: result_id NULL, target_user = the job owner, RESULT level', async () => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 2,
      });
      mockNotificationTypeRepository.findOne.mockResolvedValue({
        notifications_type_id: 9,
      });
      mockNotificationRepository.save.mockResolvedValue({
        notification_id: 501,
      });

      const result = await service.emitBilateralAiJobNotification(
        42,
        'AI-assisted processing finished — 2 drafts ready for AfricaRice · 2 documents · 6 min https://x/bilateral/AfricaRice/drafts',
      );

      expect(mockNotificationLevelRepository.findOne).toHaveBeenCalledWith({
        where: { type: NotificationLevelEnum.RESULT },
      });
      expect(mockNotificationTypeRepository.findOne).toHaveBeenCalledWith({
        where: { type: NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED },
      });
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          target_user: 42,
          result_id: null,
          notification_level: 2,
          notification_type: 9,
          text: expect.stringContaining('2 documents · 6 min'),
        }),
      );
      expect(result).toEqual({ notification_id: 501 });
    });

    it('never throws — returns null when the notification catalog is missing', async () => {
      mockNotificationLevelRepository.findOne.mockResolvedValue(null);
      mockNotificationTypeRepository.findOne.mockResolvedValue(null);

      const result = await service.emitBilateralAiJobNotification(42, 'text');

      expect(result).toBeNull();
      expect(mockNotificationRepository.save).not.toHaveBeenCalled();
    });

    it('never throws — returns null when the write itself fails', async () => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 2,
      });
      mockNotificationTypeRepository.findOne.mockResolvedValue({
        notifications_type_id: 9,
      });
      mockNotificationRepository.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.emitBilateralAiJobNotification(42, 'text'),
      ).resolves.toBeNull();
    });
  });

  // `design.md` §6.4 "Read path": a job notification has no result, so the existing
  // `obj_result`-filtered queries can never return it — each read path gains a branch.
  describe('read-path branch for BILATERAL_AI_JOB_FINISHED (design.md §6.4)', () => {
    const user: TokenDto = {
      id: 42,
      email: 'uploader@cgiar.org',
      first_name: 'Uploader',
      last_name: 'User',
    };

    const jobRow = (overrides: Record<string, any> = {}) => ({
      notification_id: '900',
      target_user: 42,
      result_id: null,
      obj_result: null,
      obj_notification_type: {
        type: NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED,
      },
      text: 'AI-assisted processing finished — 1 draft ready for AfricaRice · 1 document · 3 min https://x/drafts',
      created_date: new Date('2026-09-15T12:00:00Z'),
      read: false,
      ...overrides,
    });

    describe('getAllNotifications', () => {
      it('merges a job-type row into notificationsPending for the uploader', async () => {
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // notificationsViewed (result-based)
          .mockResolvedValueOnce([]) // notificationsPending (result-based)
          .mockResolvedValueOnce([]) // notificationAnnouncement
          .mockResolvedValueOnce([]) // job-finished, viewed
          .mockResolvedValueOnce([jobRow()]); // job-finished, pending

        const result = await service.getAllNotifications(user);

        expect(result.status).toBe(200);
        expect(result.response.notificationsPending).toEqual([jobRow()]);
        expect(result.response.notificationsViewed).toEqual([]);
        // The job-finished lookups are scoped to the recipient, not to a result.
        expect(mockNotificationRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              target_user: 42,
              read: false,
              obj_notification_type: {
                type: NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED,
              },
            }),
          }),
        );
      });

      // NOTIF-T-8 / NOTIF-R-13: the Updates-tab query must select/relate the same
      // row-badge fields `share-result-request.service.ts::getRequestRelations()`
      // already returns on the Requests tab, so `results-notifications.component`
      // can render funding/type/level badges and the bilateral project name for
      // Updates rows too (`NOTIF-T-9`).
      it('widens the obj_result select/relations with source, type, level and bilateral-project fields', async () => {
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // notificationsViewed
          .mockResolvedValueOnce([]) // notificationsPending
          .mockResolvedValueOnce([]) // notificationAnnouncement
          .mockResolvedValueOnce([]) // job-finished, viewed
          .mockResolvedValueOnce([]); // job-finished, pending

        await service.getAllNotifications(user);

        const resultSelectShape = expect.objectContaining({
          source: true,
          obj_result_type: { id: true, name: true },
          obj_result_level: { id: true, name: true },
          obj_result_by_project: expect.objectContaining({
            id: true,
            project_id: true,
            is_lead: true,
            is_active: true,
            obj_clarisa_project: { id: true, shortName: true, fullName: true },
          }),
        });
        const resultRelationsShape = expect.objectContaining({
          obj_result_type: true,
          obj_result_level: true,
          obj_result_by_project: { obj_clarisa_project: true },
        });

        // First two calls are the result-scoped notificationsViewed/notificationsPending
        // queries — both go through `getNotificattionSelect()`/`getNotificationRelations()`.
        expect(mockNotificationRepository.find).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            select: expect.objectContaining({ obj_result: resultSelectShape }),
            relations: expect.objectContaining({
              obj_result: resultRelationsShape,
            }),
          }),
        );
        expect(mockNotificationRepository.find).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            select: expect.objectContaining({ obj_result: resultSelectShape }),
            relations: expect.objectContaining({
              obj_result: resultRelationsShape,
            }),
          }),
        );
      });

      // NOTIF-T-8 rework: the widened select was copied from the Requests-side query
      // shape, but `share-result-request.service.ts::getRequest()`'s POST-PROCESSING
      // mapper (`source_name` derivation + inactive `obj_result_by_project` filtering)
      // was not. These assert the actual RETURNED payload, not just the query shape.
      it('computes obj_result.source_name on the returned payload (non-Result source -> W3/Bilaterals)', async () => {
        const pendingRow = {
          notification_id: '1',
          target_user: 42,
          result_id: 10,
          read: false,
          obj_result: {
            result_code: 10,
            title: 'A bilateral result',
            source: 'API',
            obj_result_by_project: [],
          },
        };
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // notificationsViewed
          .mockResolvedValueOnce([pendingRow]) // notificationsPending
          .mockResolvedValueOnce([]) // notificationAnnouncement
          .mockResolvedValueOnce([]) // job-finished, viewed
          .mockResolvedValueOnce([]); // job-finished, pending

        const result = await service.getAllNotifications(user);

        expect(result.response.notificationsPending[0].obj_result).toEqual(
          expect.objectContaining({
            source: 'API',
            source_name: 'W3/Bilaterals',
          }),
        );
      });

      it('computes obj_result.source_name as W1/W2 when source is Result', async () => {
        const viewedRow = {
          notification_id: '2',
          target_user: 42,
          result_id: 11,
          read: true,
          created_date: new Date('2026-09-20T10:00:00Z'),
          obj_result: {
            result_code: 11,
            title: 'A W1/W2 result',
            source: 'Result',
            obj_result_by_project: [],
          },
        };
        mockNotificationRepository.find
          .mockResolvedValueOnce([viewedRow]) // notificationsViewed
          .mockResolvedValueOnce([]) // notificationsPending
          .mockResolvedValueOnce([]) // notificationAnnouncement
          .mockResolvedValueOnce([]) // job-finished, viewed
          .mockResolvedValueOnce([]); // job-finished, pending

        const result = await service.getAllNotifications(user);

        expect(result.response.notificationsViewed[0].obj_result).toEqual(
          expect.objectContaining({ source: 'Result', source_name: 'W1/W2' }),
        );
      });

      it('filters obj_result_by_project down to only is_active links on the returned payload', async () => {
        const pendingRow = {
          notification_id: '3',
          target_user: 42,
          result_id: 12,
          read: false,
          obj_result: {
            result_code: 12,
            title: 'A result tagged to two projects',
            source: 'Result',
            obj_result_by_project: [
              {
                id: 1,
                project_id: 100,
                is_active: true,
                obj_clarisa_project: { id: 100, shortName: 'Active Project' },
              },
              {
                id: 2,
                project_id: 200,
                is_active: false,
                obj_clarisa_project: { id: 200, shortName: 'Removed Project' },
              },
            ],
          },
        };
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // notificationsViewed
          .mockResolvedValueOnce([pendingRow]) // notificationsPending
          .mockResolvedValueOnce([]) // notificationAnnouncement
          .mockResolvedValueOnce([]) // job-finished, viewed
          .mockResolvedValueOnce([]); // job-finished, pending

        const result = await service.getAllNotifications(user);

        const returnedLinks =
          result.response.notificationsPending[0].obj_result
            .obj_result_by_project;
        expect(returnedLinks).toHaveLength(1);
        expect(returnedLinks[0]).toEqual(
          expect.objectContaining({ project_id: 100, is_active: true }),
        );
      });

      it('leaves obj_result untouched (no-op) for a bilateral-AI-job row with obj_result null', async () => {
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // notificationsViewed
          .mockResolvedValueOnce([]) // notificationsPending
          .mockResolvedValueOnce([]) // notificationAnnouncement
          .mockResolvedValueOnce([]) // job-finished, viewed
          .mockResolvedValueOnce([jobRow()]); // job-finished, pending

        const result = await service.getAllNotifications(user);

        expect(result.response.notificationsPending).toEqual([jobRow()]);
      });
    });

    describe('getPopUpNotifications', () => {
      it('includes an unread job-type row for the uploader', async () => {
        mockUserRepository.findOne.mockResolvedValue({
          last_pop_up_viewed: null,
        });
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // result-based pop-ups
          .mockResolvedValueOnce([jobRow()]); // job-finished pop-ups
        mockShareResultRequestService.getReceivedResultRequestPopUp.mockResolvedValue(
          [],
        );

        const result = await service.getPopUpNotifications(user);

        expect(result.response).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ notification_id: '900' }),
          ]),
        );
      });

      it('computes source_name and filters inactive obj_result_by_project links on the returned payload', async () => {
        mockUserRepository.findOne.mockResolvedValue({
          last_pop_up_viewed: null,
        });
        const updateRow = {
          notification_id: '4',
          target_user: 42,
          result_id: 13,
          read: false,
          obj_result: {
            result_code: 13,
            title: 'A tagged result',
            source: 'API',
            obj_result_by_project: [
              {
                id: 1,
                project_id: 100,
                is_active: true,
                obj_clarisa_project: { id: 100, shortName: 'Active Project' },
              },
              {
                id: 2,
                project_id: 200,
                is_active: false,
                obj_clarisa_project: { id: 200, shortName: 'Removed Project' },
              },
            ],
          },
        };
        mockNotificationRepository.find
          .mockResolvedValueOnce([updateRow]) // result-based pop-ups
          .mockResolvedValueOnce([]); // job-finished pop-ups
        mockShareResultRequestService.getReceivedResultRequestPopUp.mockResolvedValue(
          [],
        );

        const result = await service.getPopUpNotifications(user);

        const returnedRow = (result.response as any[]).find(
          (n) => n.notification_id === '4',
        );
        expect(returnedRow.obj_result.source_name).toBe('W3/Bilaterals');
        expect(returnedRow.obj_result.obj_result_by_project).toHaveLength(1);
        expect(returnedRow.obj_result.obj_result_by_project[0]).toEqual(
          expect.objectContaining({ project_id: 100 }),
        );
      });

      it('excludes it for a different recipient (scoped to target_user)', async () => {
        mockUserRepository.findOne.mockResolvedValue({
          last_pop_up_viewed: null,
        });
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // result-based pop-ups
          .mockResolvedValueOnce([]); // this recipient has no job-finished rows
        mockShareResultRequestService.getReceivedResultRequestPopUp.mockResolvedValue(
          [],
        );

        const result = await service.getPopUpNotifications({
          ...user,
          id: 999,
        });

        expect(result.response).toEqual([]);
        expect(mockNotificationRepository.find).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            where: expect.objectContaining({ target_user: 999 }),
          }),
        );
      });
    });

    describe('getRecentResultActivity', () => {
      it('merges a job-type row for the uploader alongside result-based activity (regression: a result-type row still requires the initiative relation)', async () => {
        mockNotificationLevelRepository.findOne.mockResolvedValue({
          notifications_level_id: 2,
        });
        mockUserRepository.InitiativeByUser.mockResolvedValue([{ id: 1 }]);

        const queryBuilder: any = {
          innerJoinAndSelect: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            {
              notification_id: '1',
              result_id: 200,
              obj_result: {
                result_code: 1234,
                title: 'Result with owner',
                obj_result_by_initiatives: [
                  {
                    initiative_role_id: 1,
                    is_active: true,
                    initiative_id: 55,
                    obj_initiative: {
                      name: 'Primary Initiative',
                      official_code: 'PI-1',
                    },
                  },
                ],
              },
              obj_notification_type: {
                type: NotificationTypeEnum.RESULT_SUBMITTED,
              },
              obj_emitter_user: null,
              emitter_user: null,
              created_date: new Date('2026-09-15T09:00:00Z'),
            },
          ]),
        };
        mockNotificationRepository.createQueryBuilder.mockReturnValue(
          queryBuilder,
        );
        mockNotificationRepository.find.mockResolvedValue([
          jobRow({ created_date: new Date('2026-09-15T13:00:00Z') }),
        ]);

        const result = await service.getRecentResultActivity(user, 5);

        expect(result.status).toBe(200);
        // Still-required regression: the result-type row keeps needing the owner initiative
        // relation — it is present here because the fixture carries it, not because the branch
        // relaxed that requirement.
        expect(result.response).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              resultId: 200,
              initiativeOfficialCode: 'PI-1',
            }),
            expect.objectContaining({
              resultId: null,
              eventType: NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED,
              message: expect.stringContaining('1 document · 3 min'),
            }),
          ]),
        );
        // The job row is the most recent (13:00 vs 09:00) so it sorts first.
        expect(result.response[0]).toMatchObject({
          eventType: NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED,
        });
      });
    });
  });

  // `PSR-T-7`/`PSR-DD-7`: the 3 Center-notice types read back through an ownerless path
  // (design.md §6.1, §2.2) — no `initiative_role_id = 1` condition — so a declined/moved
  // notice for a result with no role-1 owner is never silently dropped, and are excluded from
  // the role-1-joined queries so an accepted notice (owned result) is never merged in twice.
  describe('Center notices — ownerless read path (PSR-T-7)', () => {
    const user: TokenDto = {
      id: 42,
      email: 'center-user@cgiar.org',
      first_name: 'Center',
      last_name: 'User',
    };

    const CENTER_NOTICE_TYPES = [
      NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_ACCEPTED,
      NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
      NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_MOVED,
    ];

    // Disqualifier guard: this fixture has NO `obj_result_by_initiatives` role-1 row at all —
    // the ownerless path must not depend on one being absent-but-present, it must work when
    // there is genuinely no owner.
    const centerNoticeRow = (overrides: Record<string, any> = {}) => ({
      notification_id: '2001',
      target_user: 42,
      result_id: 501,
      read: false,
      text: 'SP12 declined to be the primary Science Program of this result. Pick another primary Science Program. Click to see the result.',
      obj_result: {
        result_code: 501,
        title: 'An ownerless bilateral result',
        source: 'API',
        is_active: true,
        obj_result_by_initiatives: [], // no role-1 owner
        obj_result_by_project: [],
      },
      obj_notification_type: {
        type: NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
      },
      created_date: new Date('2026-09-30T10:00:00Z'),
      ...overrides,
    });

    describe('getAllNotifications', () => {
      it('Falsifier 1: a declined notice for an ownerless result is NOT missing from getAllNotifications', async () => {
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // notificationsViewed (role-1-joined, excludes center notices)
          .mockResolvedValueOnce([]) // notificationsPending (role-1-joined, excludes center notices)
          .mockResolvedValueOnce([]) // notificationAnnouncement
          .mockResolvedValueOnce([]) // job-finished, viewed
          .mockResolvedValueOnce([]) // job-finished, pending
          .mockResolvedValueOnce([]) // center notice, viewed
          .mockResolvedValueOnce([centerNoticeRow()]); // center notice, pending

        const result = await service.getAllNotifications(user);

        expect(result.status).toBe(200);
        expect(result.response.notificationsPending).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              notification_id: '2001',
              text: centerNoticeRow().text,
              obj_notification_type: {
                type: NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
              },
              obj_result: expect.objectContaining({
                source: 'API',
                source_name: 'W3/Bilaterals',
              }),
            }),
          ]),
        );

        // The role-1-joined queries must exclude the 3 Center-notice types (PSR-DD-7). Call 1
        // (viewed) is keyset-paged (PAGE-T-3), so its `where` is the cursor-expanded array —
        // with no cursor it is a single-entry array wrapping the original condition.
        expect(mockNotificationRepository.find).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            where: [
              expect.objectContaining({
                obj_notification_type: { type: Not(In(CENTER_NOTICE_TYPES)) },
              }),
            ],
          }),
        );

        // The ownerless query itself carries no `initiative_role_id` condition and is scoped
        // to this recipient only.
        expect(mockNotificationRepository.find).toHaveBeenNthCalledWith(
          7,
          expect.objectContaining({
            where: expect.objectContaining({
              target_user: 42,
              read: false,
              obj_result: { is_active: true },
              obj_notification_type: { type: In(CENTER_NOTICE_TYPES) },
            }),
          }),
        );
      });

      // Reviewer finding 2 (rework attempt 2): a test that only checks the RESULT count can't
      // fail — the mocked role-1 finds return `[]` regardless of `where`, so the row could only
      // ever come back once no matter what the exclusion says. The real guard is the exclusion
      // filter itself, on EVERY role-1-joined call (both viewed AND pending — attempt 1 only
      // asserted call 1). Proven to fail first: deleting either exclusion in the service made
      // this red (recorded below the block), then restored to green.
      it('Falsifier 2: BOTH role-1-joined queries (viewed and pending) exclude the Center-notice types, so neither can ever return this row', async () => {
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // notificationsViewed — must exclude center-notice types
          .mockResolvedValueOnce([]) // notificationsPending — must exclude center-notice types
          .mockResolvedValueOnce([]) // notificationAnnouncement
          .mockResolvedValueOnce([]) // job-finished, viewed
          .mockResolvedValueOnce([]) // job-finished, pending
          .mockResolvedValueOnce([]) // center notice, viewed
          .mockResolvedValueOnce([centerNoticeRow()]); // center notice, pending

        await service.getAllNotifications(user);

        // Call 1 (viewed) is keyset-paged (PAGE-T-3): its `where` is the cursor-expanded
        // single-entry array; call 2 (pending) is never paged and keeps the plain object.
        expect(mockNotificationRepository.find).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            where: [
              expect.objectContaining({
                obj_notification_type: { type: Not(In(CENTER_NOTICE_TYPES)) },
              }),
            ],
          }),
        );
        expect(mockNotificationRepository.find).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            where: expect.objectContaining({
              obj_notification_type: { type: Not(In(CENTER_NOTICE_TYPES)) },
            }),
          }),
        );
      });

      it('Disqualifier guard: the fixture carries no role-1 row at all', () => {
        expect(centerNoticeRow().obj_result.obj_result_by_initiatives).toEqual(
          [],
        );
      });
    });

    describe('getPopUpNotifications', () => {
      it('Falsifier 1: a declined notice for an ownerless result is NOT missing from getPopUpNotifications', async () => {
        mockUserRepository.findOne.mockResolvedValue({
          last_pop_up_viewed: null,
        });
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // result-based pop-ups (role-1-joined)
          .mockResolvedValueOnce([]) // job-finished pop-ups
          .mockResolvedValueOnce([centerNoticeRow()]); // center notice pop-ups
        mockShareResultRequestService.getReceivedResultRequestPopUp.mockResolvedValue(
          [],
        );

        const result = await service.getPopUpNotifications(user);

        expect(result.response).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              notification_id: '2001',
              text: centerNoticeRow().text,
              obj_notification_type: {
                type: NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
              },
              obj_result: expect.objectContaining({
                source: 'API',
                source_name: 'W3/Bilaterals',
              }),
            }),
          ]),
        );
      });

      // Reviewer finding 2 (rework attempt 2): the real guard is the exclusion on the
      // role-1-joined `whereConditions`, not the count of the mocked (empty-regardless) result.
      it('Falsifier 2: the role-1-joined query excludes the Center-notice types, so it can never return this row', async () => {
        mockUserRepository.findOne.mockResolvedValue({
          last_pop_up_viewed: null,
        });
        mockNotificationRepository.find
          .mockResolvedValueOnce([]) // result-based pop-ups — must exclude center-notice types
          .mockResolvedValueOnce([]) // job-finished pop-ups
          .mockResolvedValueOnce([centerNoticeRow()]); // center notice pop-ups
        mockShareResultRequestService.getReceivedResultRequestPopUp.mockResolvedValue(
          [],
        );

        await service.getPopUpNotifications(user);

        expect(mockNotificationRepository.find).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            where: expect.objectContaining({
              obj_notification_type: { type: Not(In(CENTER_NOTICE_TYPES)) },
            }),
          }),
        );
      });
    });
  });

  // `PSR-T-7` — the socket-push description for the 3 Center-notice types (`buildResultNotificationDescription`).
  describe('buildResultNotificationDescription — Center notices (PSR-T-7)', () => {
    beforeEach(() => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 2,
      });
      mockNotificationTypeRepository.findOne.mockResolvedValue({
        notifications_type_id: 20,
      });
      mockNotificationRepository.save.mockResolvedValue(null);
      mockSocketManagementService.getActiveUsers.mockResolvedValue({
        response: [{ userId: 7 }],
        status: 200,
      });
      mockSocketManagementService.sendNotificationToUsers.mockResolvedValue({
        status: 200,
      });
    });

    // Reviewer finding 1 (rework attempt 2): the stored sentence's SUBJECT is the SP ("SP09
    // accepted ... of this result. Click to see the result."), not a suffix that finishes a
    // sentence started by "The result <id>". The identity replaces "this result" in place —
    // the sentence keeps its own subject/verb and names the result exactly once.
    it.each([
      [
        NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_ACCEPTED,
        'SP09 accepted to be the primary Science Program of this result. Click to see the result.',
        'SP09 accepted to be the primary Science Program of result 501 - An ownerless bilateral result. Click to see the result.',
      ],
      [
        NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
        'SP09 declined to be the primary Science Program of this result. Pick another primary Science Program. Click to see the result.',
        'SP09 declined to be the primary Science Program of result 501 - An ownerless bilateral result. Pick another primary Science Program. Click to see the result.',
      ],
      [
        NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_MOVED,
        'SP09 declined to be the primary Science Program of this result; the request was moved to SP12. Click to see the result.',
        'SP09 declined to be the primary Science Program of result 501 - An ownerless bilateral result; the request was moved to SP12. Click to see the result.',
      ],
    ])(
      'names the result once, as the object of the SP-subject sentence, for %s',
      async (type, storedSuffix, expectedDesc) => {
        mockNotificationRepository.findOne.mockResolvedValue({
          obj_emitter_user: null,
          obj_result: {
            result_code: 501,
            title: 'An ownerless bilateral result',
          },
        });

        await service.emitResultNotification(
          NotificationLevelEnum.RESULT,
          type,
          [7],
          1,
          501,
          storedSuffix,
        );

        const [, notificationPayload] =
          mockSocketManagementService.sendNotificationToUsers.mock.calls[0];
        expect(notificationPayload.desc).toBe(expectedDesc);
      },
    );

    it('falls back to the stored sentence unchanged when the result has no code/title (no identity to splice in)', async () => {
      mockNotificationRepository.findOne.mockResolvedValue({
        obj_emitter_user: null,
        obj_result: null,
      });

      const storedSuffix =
        'SP09 accepted to be the primary Science Program of this result. Click to see the result.';

      await service.emitResultNotification(
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_ACCEPTED,
        [7],
        1,
        501,
        storedSuffix,
      );

      const [, notificationPayload] =
        mockSocketManagementService.sendNotificationToUsers.mock.calls[0];
      expect(notificationPayload.desc).toBe(storedSuffix);
    });
  });

  // PAGE-T-3 (notifications/inbox-paginated-load): phase scoping, pending/history split,
  // keyset pagination and concurrency for `getAllNotifications` (design.md §5; requirements.md
  // PAGE-R-1, R-2, R-3, R-6, R-7; PAGE-AC-1, -10, -11).
  describe('getAllNotifications — PAGE-T-3 pagination/phase/concurrency', () => {
    const user: TokenDto = {
      id: 42,
      email: 'user@cgiar.org',
      first_name: 'Test',
      last_name: 'User',
    };

    const viewedRow = (
      id: string,
      createdDate: string,
      overrides: Record<string, any> = {},
    ) => ({
      notification_id: id,
      target_user: 42,
      result_id: 10,
      read: true,
      created_date: new Date(createdDate),
      obj_result: {
        result_code: 10,
        title: 'A result',
        source: 'Result',
        obj_result_by_project: [],
      },
      obj_notification_type: { type: NotificationTypeEnum.RESULT_CREATED },
      ...overrides,
    });

    // Falsifier (a): EVERY `find()` call returns its own never-resolving deferred (not just
    // the first) — an inner `await` reintroduced at ANY position (not only element 1) blocks
    // the array literal's evaluation on that element's still-pending promise, so a later
    // element's `find()` is never invoked and `resolvers.length`/call count stays below 7
    // forever. Resolving them all and awaiting the result is what proves the service doesn't
    // actually need them to resolve before invoking the rest (PAGE-R-7, PAGE-AC-11).
    it('Falsifier (a): starts every query concurrently — all 7 find() calls are invoked before any resolves (PAGE-R-7, PAGE-AC-11)', async () => {
      const resolvers: Array<(value: any[]) => void> = [];

      mockNotificationRepository.find.mockImplementation(
        () =>
          new Promise<any[]>((resolve) => {
            resolvers.push(resolve);
          }),
      );

      const pending = service.getAllNotifications(user);

      // Give the microtask queue a few ticks so every call that was going to be invoked
      // synchronously/concurrently has had the chance to run. None of these ticks can ever
      // unblock a sequential `await` on an unresolved `find()` — only resolving it does.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // All 7 queries (viewed, pending, announcement, job-viewed, job-pending,
      // center-viewed, center-pending) must have been invoked already — none blocked behind
      // another still-unresolved call, no matter which element the dependency is on.
      expect(mockNotificationRepository.find).toHaveBeenCalledTimes(7);
      expect(resolvers).toHaveLength(7);

      resolvers.forEach((resolve) => resolve([]));
      const result = await pending;
      expect(result.status).toBe(200);
    });

    // Falsifier (b), half 1: version_id must reach the result-scoped and Center-notice
    // where-builders, but the AI-job finder must stay unfiltered (PAGE-R-1, PAGE-P-7).
    it('Falsifier (b): version_id reaches the result-scoped and Center-notice queries, never the AI-job finder', async () => {
      mockNotificationRepository.find.mockResolvedValue([]);

      await service.getAllNotifications(user, { versionId: 2026 });

      const calls = mockNotificationRepository.find.mock.calls;
      // Call 1: viewed, result-scoped (keyset-paged -> where is a single-entry array).
      expect(calls[0][0].where).toEqual([
        expect.objectContaining({
          obj_result: expect.objectContaining({ version_id: 2026 }),
        }),
      ]);
      // Call 2: pending, result-scoped (never paged -> plain object).
      expect(calls[1][0].where).toEqual(
        expect.objectContaining({
          obj_result: expect.objectContaining({ version_id: 2026 }),
        }),
      );
      // Call 4: AI-job viewed — must NOT carry a version_id condition anywhere.
      expect(JSON.stringify(calls[3][0].where)).not.toContain('version_id');
      // Call 5: AI-job pending — same.
      expect(JSON.stringify(calls[4][0].where)).not.toContain('version_id');
      // Call 6: Center-notice viewed — must carry version_id.
      expect(calls[5][0].where).toEqual([
        expect.objectContaining({
          obj_result: expect.objectContaining({ version_id: 2026 }),
        }),
      ]);
      // Call 7: Center-notice pending — must carry version_id.
      expect(calls[6][0].where).toEqual(
        expect.objectContaining({
          obj_result: expect.objectContaining({ version_id: 2026 }),
        }),
      );
    });

    // Falsifier (b), half 2: with no version_id, none of the result-scoped/Center-notice
    // queries should carry a version_id condition (today's legacy, all-phases behavior).
    it('omits the version_id condition entirely when no versionId is given', async () => {
      mockNotificationRepository.find.mockResolvedValue([]);

      await service.getAllNotifications(user);

      const calls = mockNotificationRepository.find.mock.calls;
      calls.forEach((call) => {
        expect(JSON.stringify(call[0].where)).not.toContain('version_id');
      });
    });

    // Falsifier (c): 3 viewed lists of 150 each, interleaved dates -> the merged page must be
    // exactly the 200 newest overall, with hasMore = true (PAGE-R-3, PAGE-AC-3).
    it('Falsifier (c): merges 3 viewed sources of 150 each into the 200 newest overall, hasMore = true', async () => {
      const base = new Date('2026-09-30T00:00:00Z').getTime();

      // Result-scoped: ids 1..150, every 3rd minute (0,3,6,...)
      const resultScoped = Array.from({ length: 150 }, (_, i) =>
        viewedRow(`${1000 + i}`, new Date(base - i * 3 * 60000).toISOString()),
      );
      // AI-job: ids 2000..2149, offset by 1 minute (1,4,7,...), no obj_result.
      const jobFinished = Array.from({ length: 150 }, (_, i) => ({
        notification_id: `${2000 + i}`,
        target_user: 42,
        result_id: null,
        obj_result: null,
        read: true,
        created_date: new Date(base - (i * 3 + 1) * 60000),
        obj_notification_type: {
          type: NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED,
        },
      }));
      // Center-notice: ids 3000..3149, offset by 2 minutes (2,5,8,...)
      const centerNotice = Array.from({ length: 150 }, (_, i) =>
        viewedRow(
          `${3000 + i}`,
          new Date(base - (i * 3 + 2) * 60000).toISOString(),
          {
            obj_notification_type: {
              type: NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
            },
          },
        ),
      );

      // `scope: 'history'` skips every pending query entirely (PAGE-R-2) — only the 3
      // viewed queries call `find()`, in this order: result-scoped, job-finished, center-notice.
      mockNotificationRepository.find
        .mockResolvedValueOnce(resultScoped) // notificationsViewed (result-scoped)
        .mockResolvedValueOnce(jobFinished) // job-finished, viewed
        .mockResolvedValueOnce(centerNotice); // center notice, viewed

      const result = await service.getAllNotifications(user, {
        scope: 'history',
      });

      // scope=history skips every pending query entirely (PAGE-R-2) — only the 3 viewed
      // sources call find().
      expect(mockNotificationRepository.find).toHaveBeenCalledTimes(3);
      expect(result.response.notificationsViewed).toHaveLength(200);
      expect(result.response.viewedMeta.hasMore).toBe(true);
      // The 200 newest overall are the ids whose offset (0..199 minutes back) is smallest —
      // i.e. every row up to and including minute 199. Minute 199 is id 2066
      // (jobFinished index 66 -> 66*3+1 = 199).
      const returnedIds = result.response.notificationsViewed.map(
        (n: any) => n.notification_id,
      );
      expect(returnedIds).toContain('2066');
      expect(returnedIds).not.toContain('2067'); // minute 202 -> rank 203, excluded
      // notificationsPending/notificationAnnouncement are empty under scope=history (PAGE-R-2).
      expect(result.response.notificationsPending).toEqual([]);
      expect(result.response.notificationAnnouncement).toEqual([]);
    });

    // Falsifier (d): the legacy (no-param) response shape must keep every pre-existing key.
    it('Falsifier (d): legacy call (no options) keeps notificationsPending/notificationsViewed/notificationAnnouncement', async () => {
      mockNotificationRepository.find.mockResolvedValue([]);

      const result = await service.getAllNotifications(user);

      expect(result.response).toEqual(
        expect.objectContaining({
          notificationsPending: expect.any(Array),
          notificationsViewed: expect.any(Array),
          notificationAnnouncement: expect.any(Array),
          viewedMeta: expect.objectContaining({
            hasMore: expect.any(Boolean),
          }),
        }),
      );
    });

    // PAGE-R-2 scenario "pending never paged" / scope table (design.md §4.1): scope=pending
    // must skip the history queries entirely (not run-and-discard) and return an empty,
    // non-paginated history bucket.
    it('scope=pending skips the history queries entirely and returns an empty, non-paginated history bucket', async () => {
      mockNotificationRepository.find.mockResolvedValue([
        viewedRow('1', '2026-09-29T00:00:00Z'),
      ]);

      const result = await service.getAllNotifications(user, {
        scope: 'pending',
      });

      // Only the 4 pending-side queries run (pending, announcement, job-pending,
      // center-pending) — none of the 3 history queries.
      expect(mockNotificationRepository.find).toHaveBeenCalledTimes(4);
      expect(result.response.notificationsViewed).toEqual([]);
      expect(result.response.viewedMeta).toEqual({
        hasMore: false,
        nextCursor: null,
      });
    });

    // PAGE-R-3 "next page": a cursor is forwarded into the keyset expansion for every
    // viewed sub-query.
    it('forwards the cursor into the keyset expansion of every viewed sub-query', async () => {
      mockNotificationRepository.find.mockResolvedValue([]);
      const cursor = Buffer.from(
        '2026-09-29T00:00:00.000Z|500',
        'utf8',
      ).toString('base64url');

      await service.getAllNotifications(user, {
        scope: 'history',
        cursor,
      });

      const calls = mockNotificationRepository.find.mock.calls;
      // Under scope=history, only the 3 viewed queries run (pending calls are skipped), in
      // this order: call 1 = result-scoped viewed, call 2 = AI-job viewed, call 3 =
      // Center-notice viewed. Each carries the cursor's keyset OR (date < d, or date = d AND
      // id < i) — 2 entries per original single condition.
      expect(calls[0][0].where).toHaveLength(2); // call 1: result-scoped viewed
      expect(calls[0][0].take).toBe(201);
      expect(calls[1][0].where).toHaveLength(2); // call 2: AI-job viewed
      expect(calls[2][0].where).toHaveLength(2); // call 3: Center-notice viewed
    });
  });
});
