import { ResultTaggedNotificationService } from './result-tagged-notification.service';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from '../enum/notification.enum';

describe('ResultTaggedNotificationService', () => {
  let service: ResultTaggedNotificationService;
  let notificationService: { emitResultNotification: jest.Mock };
  let notificationRepo: { find: jest.Mock };
  let roleByUserRepo: { getUserIdsByCenter: jest.Mock };
  let resultRepo: { findOne: jest.Mock };
  let centerRepo: { find: jest.Mock; findOne: jest.Mock };
  let projectRepo: { find: jest.Mock };

  const RESULT_ID = 77;
  const EMITTER = 9;

  /** A result owned by SP04, which is what AC3's `[SP_NumberSP]` renders from. */
  const resultOwnedBySp04 = {
    id: RESULT_ID,
    result_code: 4321,
    title: 'A pooled funding result',
    obj_result_by_initiatives: [
      { initiative_role_id: 2, obj_initiative: { official_code: 'SP99' } },
      { initiative_role_id: 1, obj_initiative: { official_code: 'SP04' } },
    ],
  };

  beforeEach(() => {
    notificationService = {
      emitResultNotification: jest.fn().mockResolvedValue(undefined),
    };
    notificationRepo = { find: jest.fn().mockResolvedValue([]) };
    roleByUserRepo = { getUserIdsByCenter: jest.fn().mockResolvedValue([]) };
    resultRepo = { findOne: jest.fn().mockResolvedValue(resultOwnedBySp04) };
    centerRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    projectRepo = { find: jest.fn().mockResolvedValue([]) };

    service = new ResultTaggedNotificationService(
      notificationService as any,
      notificationRepo as any,
      roleByUserRepo as any,
      resultRepo as any,
      centerRepo as any,
      projectRepo as any,
    );
  });

  const lastEmitCall = () =>
    notificationService.emitResultNotification.mock.calls.at(-1);

  describe('notifyTaggedCenters (AC1)', () => {
    it('emits to the users of the tagged centre with the AC3 copy', async () => {
      centerRepo.find.mockResolvedValueOnce([
        {
          code: 'CENTER-01',
          clarisa_institution: { name: 'Africa Rice Center' },
        },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11, 12]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['CENTER-01']);

      const [level, type, userIds, emitter, resultId, suffix] = lastEmitCall();
      expect(level).toBe(NotificationLevelEnum.RESULT);
      expect(type).toBe(NotificationTypeEnum.RESULT_CENTER_TAGGED);
      expect(userIds).toEqual([11, 12]);
      expect(emitter).toBe(EMITTER);
      expect(resultId).toBe(RESULT_ID);
      expect(suffix).toBe(
        'created by SP04 has tagged the Africa Rice Center. Click to see the result.',
      );
    });

    it('names the owning Science Program from the initiative_role_id = 1 row', async () => {
      centerRepo.find.mockResolvedValueOnce([
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      // SP99 sits first in the array but is not the owner.
      expect(lastEmitCall()[5]).toContain('SP04');
      expect(lastEmitCall()[5]).not.toContain('SP99');
    });

    it('falls back to the centre code when the institution name is missing', async () => {
      centerRepo.find.mockResolvedValueOnce([{ code: 'C1' }]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      expect(lastEmitCall()[5]).toContain('has tagged the C1.');
    });

    it('does nothing when no centre codes are given', async () => {
      await service.notifyTaggedCenters(RESULT_ID, EMITTER, []);
      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
      expect(resultRepo.findOne).not.toHaveBeenCalled();
    });

    it('skips a centre with no users rather than emitting an empty notification', async () => {
      centerRepo.find.mockResolvedValueOnce([
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });

    it('does not emit when the result no longer exists', async () => {
      resultRepo.findOne.mockResolvedValueOnce(null);
      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);
      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyTaggedBilateralProjects (AC2)', () => {
    it('routes to the centre that owns the project, via organization_code', async () => {
      projectRepo.find.mockResolvedValueOnce([
        { id: 1962, shortName: 'P-1568-WBS0', organizationCode: 67 },
      ]);
      centerRepo.findOne.mockResolvedValueOnce({ code: 'CENTER-06' });
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([21]);

      await service.notifyTaggedBilateralProjects(RESULT_ID, EMITTER, [1962]);

      expect(centerRepo.findOne).toHaveBeenCalledWith({
        where: { institutionId: 67 },
      });
      expect(roleByUserRepo.getUserIdsByCenter).toHaveBeenCalledWith(
        'CENTER-06',
      );
      const [, type, , , , suffix] = lastEmitCall();
      expect(type).toBe(NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED);
      expect(suffix).toContain('has tagged the P-1568-WBS0.');
    });

    // CLARISA leaves the Alliance-descended institutions with organization_code = NULL; those
    // rows carry the acronym instead. Same fallback BilateralProjectsService relies on.
    it('falls back to the acronym alias map when organization_code is null', async () => {
      projectRepo.find.mockResolvedValueOnce([
        {
          id: 5,
          shortName: 'B-123',
          organizationCode: null,
          sourceCenterAcronym: 'BIOVERSITY',
        },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([31]);

      await service.notifyTaggedBilateralProjects(RESULT_ID, EMITTER, [5]);

      expect(centerRepo.findOne).not.toHaveBeenCalled();
      expect(roleByUserRepo.getUserIdsByCenter).toHaveBeenCalledWith(
        'CENTER-02',
      );
    });

    it('skips a project whose owning centre cannot be resolved', async () => {
      projectRepo.find.mockResolvedValueOnce([
        { id: 5, shortName: 'X', organizationCode: null },
      ]);

      await service.notifyTaggedBilateralProjects(RESULT_ID, EMITTER, [5]);

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });

    it('ignores non-numeric and non-positive project ids', async () => {
      await service.notifyTaggedBilateralProjects(RESULT_ID, EMITTER, [
        0,
        -3,
        'abc' as any,
      ]);
      expect(projectRepo.find).not.toHaveBeenCalled();
      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });
  });

  // BR4, as decided: one notification per affected organisation, not one per link.
  describe('de-duplication (BR4)', () => {
    it('does not notify the same users twice when a centre appears twice in one call', async () => {
      centerRepo.find.mockResolvedValueOnce([
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValue([11, 12]);

      // The same code twice — a centre that is both lead and contributor.
      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1', 'C1']);

      expect(notificationService.emitResultNotification).toHaveBeenCalledTimes(
        1,
      );
    });

    it('drops users already told about this result by either tagged type', async () => {
      notificationRepo.find.mockResolvedValueOnce([
        { target_user: 11 },
        { target_user: 12 },
      ]);
      centerRepo.find.mockResolvedValueOnce([
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11, 12, 13]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      expect(lastEmitCall()[2]).toEqual([13]);
    });

    it('suppresses the emit entirely when every recipient was already notified', async () => {
      notificationRepo.find.mockResolvedValueOnce([{ target_user: 11 }]);
      centerRepo.find.mockResolvedValueOnce([
        { code: 'C1', clarisa_institution: { name: 'Centre One' } },
      ]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });

    it('looks the already-notified set up against both tagged types', async () => {
      centerRepo.find.mockResolvedValueOnce([{ code: 'C1' }]);
      roleByUserRepo.getUserIdsByCenter.mockResolvedValueOnce([11]);

      await service.notifyTaggedCenters(RESULT_ID, EMITTER, ['C1']);

      const where = notificationRepo.find.mock.calls[0][0].where;
      expect(where.result_id).toBe(RESULT_ID);
      expect(where.obj_notification_type.type._value).toEqual([
        NotificationTypeEnum.RESULT_CENTER_TAGGED,
        NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED,
      ]);
    });
  });
});
