import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { CreateAnnouncementNotificationDto } from './dto/create-notification.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            emitApplicationAnouncement: jest.fn(),
            updateReadStatus: jest.fn(),
            updateAllReadStatus: jest.fn(),
            getAllNotifications: jest.fn(),
            getAttentionCounts: jest.fn(),
            getPopUpNotifications: jest.fn(),
            getRecentResultActivity: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  describe('createAnouncement', () => {
    it('should call NotificationService.emitApplicationAnouncement with correct parameters', async () => {
      const createNotificationDto: CreateAnnouncementNotificationDto = {
        text: 'Announcement',
      };
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'test',
        last_name: 'user',
      };

      const result = {
        response: {},
        status: 201,
        message: 'Notification created successfully',
      };
      jest
        .spyOn(service, 'emitApplicationAnouncement')
        .mockResolvedValue(result);

      const response = await controller.createAnouncement(
        createNotificationDto,
        user,
      );

      expect(service.emitApplicationAnouncement).toHaveBeenCalledWith(
        createNotificationDto,
        user,
      );
      expect(response).toBe(result);
    });
  });

  describe('updateAllReadStatus', () => {
    it('should call NotificationService.updateAllReadStatus with correct parameters', async () => {
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'test',
        last_name: 'user',
      };

      const result = {
        response: [],
        status: 200,
        message: 'All notifications updated successfully',
      };
      jest.spyOn(service, 'updateAllReadStatus').mockResolvedValue(result);

      const response = await controller.updateAllReadStatus(user);

      expect(service.updateAllReadStatus).toHaveBeenCalledWith(user);
      expect(response).toBe(result);
    });
  });

  // PAGE-T-3 (notifications/inbox-paginated-load): `version_id`/`scope`/`cursor` parsing and
  // validation (design.md §4.1, §5 "Errors"; requirements.md PAGE-R-1, PAGE-R-6, PAGE-AC-10).
  describe('getAllNotifications', () => {
    const user: TokenDto = {
      id: 1,
      email: 'test@example.com',
      first_name: 'test',
      last_name: 'user',
    };

    const result = {
      response: {},
      status: 200,
      message: 'List of all notifications retrieved successfully',
    };

    it('legacy call (no paging params) calls the service with all options undefined (PAGE-AC-10)', async () => {
      jest.spyOn(service, 'getAllNotifications').mockResolvedValue(result);

      const response = await controller.getAllNotifications(user);

      expect(service.getAllNotifications).toHaveBeenCalledWith(user, {
        versionId: undefined,
        scope: undefined,
        cursor: undefined,
      });
      expect(response).toBe(result);
    });

    it('parses version_id, scope and cursor through to the service', async () => {
      jest.spyOn(service, 'getAllNotifications').mockResolvedValue(result);
      const cursor = Buffer.from(
        '2026-09-30T10:00:00.000Z|123',
        'utf8',
      ).toString('base64url');

      await controller.getAllNotifications(user, '7', 'history', cursor);

      expect(service.getAllNotifications).toHaveBeenCalledWith(user, {
        versionId: 7,
        scope: 'history',
        cursor,
      });
    });

    it('treats an unrecognized scope value as absent (legacy) rather than erroring', async () => {
      jest.spyOn(service, 'getAllNotifications').mockResolvedValue(result);

      await controller.getAllNotifications(user, undefined, 'not-a-scope');

      expect(service.getAllNotifications).toHaveBeenCalledWith(user, {
        versionId: undefined,
        scope: undefined,
        cursor: undefined,
      });
    });

    it.each(['0', '-1', 'abc', '1.5'])(
      'rejects an invalid version_id (%s) with 400, regardless of scope',
      async (badVersionId) => {
        jest.spyOn(service, 'getAllNotifications');

        expect(() =>
          controller.getAllNotifications(user, badVersionId, 'pending'),
        ).toThrow(BadRequestException);
        expect(service.getAllNotifications).not.toHaveBeenCalled();
      },
    );

    // BRS-T-3 (notifications/bell-read-state, BRS-R-8 / BRS-DD-5): optional `limit` 1..200.
    it('parses a valid limit through to the service as a number (BRS-T-3)', async () => {
      jest.spyOn(service, 'getAllNotifications').mockResolvedValue(result);

      await controller.getAllNotifications(
        user,
        undefined,
        'history',
        undefined,
        '10',
      );

      expect(service.getAllNotifications).toHaveBeenCalledWith(user, {
        versionId: undefined,
        scope: 'history',
        cursor: undefined,
        limit: 10,
      });
    });

    it.each(['1', '200'])(
      'accepts the limit boundary %s (BRS-T-3)',
      (value) => {
        jest.spyOn(service, 'getAllNotifications').mockResolvedValue(result);

        controller.getAllNotifications(
          user,
          undefined,
          'history',
          undefined,
          value,
        );

        expect(service.getAllNotifications).toHaveBeenCalledWith(
          user,
          expect.objectContaining({ limit: Number(value) }),
        );
      },
    );

    it.each(['0', '201', '-5', 'abc', '1.5', ''])(
      'rejects an invalid limit (%p) with 400, regardless of scope (BRS-T-3)',
      (badLimit) => {
        jest.spyOn(service, 'getAllNotifications');

        expect(() =>
          controller.getAllNotifications(
            user,
            undefined,
            'pending',
            undefined,
            badLimit,
          ),
        ).toThrow(BadRequestException);
        expect(service.getAllNotifications).not.toHaveBeenCalled();
      },
    );

    it('rejects a malformed cursor with 400, even when scope is "pending" (which would otherwise skip history)', () => {
      jest.spyOn(service, 'getAllNotifications');

      expect(() =>
        controller.getAllNotifications(
          user,
          undefined,
          'pending',
          'not-a-valid-cursor!!',
        ),
      ).toThrow(BadRequestException);
      expect(service.getAllNotifications).not.toHaveBeenCalled();
    });

    // PPG-R-4: under scope=pending, limit means "paged mode"; bad values stay 400.
    it('passes limit and cursor through under scope=pending (PPG-R-4)', () => {
      jest.spyOn(service, 'getAllNotifications').mockResolvedValue(result);
      const cursor = Buffer.from(
        '2026-09-29T00:00:00.000Z|500',
        'utf8',
      ).toString('base64url');

      controller.getAllNotifications(user, '8', 'pending', cursor, '50');

      expect(service.getAllNotifications).toHaveBeenCalledWith(user, {
        versionId: 8,
        scope: 'pending',
        cursor,
        limit: 50,
      });
    });

    it.each(['0', '201', 'abc'])(
      'PPG-R-4: rejects limit %p under scope=pending with 400 and never calls the service',
      (badLimit) => {
        jest.spyOn(service, 'getAllNotifications');
        expect(() =>
          controller.getAllNotifications(
            user,
            undefined,
            'pending',
            undefined,
            badLimit,
          ),
        ).toThrow(BadRequestException);
        expect(service.getAllNotifications).not.toHaveBeenCalled();
      },
    );

    it('PPG-R-4: rejects a malformed cursor together with limit under scope=pending', () => {
      jest.spyOn(service, 'getAllNotifications');
      expect(() =>
        controller.getAllNotifications(
          user,
          undefined,
          'pending',
          '!!bad!!',
          '50',
        ),
      ).toThrow(BadRequestException);
      expect(service.getAllNotifications).not.toHaveBeenCalled();
    });
  });

  describe('getAttentionCounts (PPG-R-1)', () => {
    it('delegates to the service with the token user', async () => {
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'test',
        last_name: 'user',
      };
      const counts = {
        response: { unseenRequests: 1, pendingRequests: 2, unreadUpdates: 3 },
        status: 200,
        message: 'ok',
      };
      jest
        .spyOn(service, 'getAttentionCounts')
        .mockResolvedValue(counts as any);

      const res = await controller.getAttentionCounts(user);

      expect(service.getAttentionCounts).toHaveBeenCalledWith(user);
      expect(res).toBe(counts);
    });
  });

  describe('getPopUpNotifications', () => {
    it('should call NotificationService.getPopUpNotifications with correct parameters', async () => {
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'test',
        last_name: 'user',
      };

      const result = {
        response: [],
        status: 200,
        message: 'List of all pop-up notifications retrieved successfully',
      };
      jest.spyOn(service, 'getPopUpNotifications').mockResolvedValue(result);

      const response = await controller.getPopUpNotifications(user);

      expect(service.getPopUpNotifications).toHaveBeenCalledWith(user);
      expect(response).toBe(result);
    });
  });

  describe('getRecentActivity', () => {
    const user: TokenDto = {
      id: 1,
      email: 'test@example.com',
      first_name: 'test',
      last_name: 'user',
    };

    it('should default limit to 10 when query param missing', async () => {
      const result = {
        response: [],
        status: 200,
        message: 'ok',
      };
      jest.spyOn(service, 'getRecentResultActivity').mockResolvedValue(result);

      const response = await controller.getRecentActivity(user);

      expect(service.getRecentResultActivity).toHaveBeenCalledWith(user, 10);
      expect(response).toBe(result);
    });

    it('should pass parsed limit when valid number provided', async () => {
      const result = {
        response: [],
        status: 200,
        message: 'ok',
      };
      jest.spyOn(service, 'getRecentResultActivity').mockResolvedValue(result);

      const response = await controller.getRecentActivity(user, '5');

      expect(service.getRecentResultActivity).toHaveBeenCalledWith(user, 5);
      expect(response).toBe(result);
    });
  });
});
