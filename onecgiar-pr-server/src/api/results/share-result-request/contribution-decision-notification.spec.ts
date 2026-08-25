import { Test, TestingModule } from '@nestjs/testing';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from '../../notification/enum/notification.enum';
import { NotificationService } from '../../notification/notification.service';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { ShareResultRequestRepository } from './share-result-request.repository';
import { ShareResultRequestService } from './share-result-request.service';

/**
 * P2-3188 — the emission side of an SP contributor's accept / decline.
 *
 * `emitContributionDecisionNotification` is private, which is right: nothing outside the
 * accept/decline flow should call it. It is invoked through the instance rather than being widened
 * to public for the test.
 *
 * `useMocker` auto-provides the rest of the 17-dependency constructor; only the five the emission
 * actually touches are given real doubles.
 */
describe('ShareResultRequestService — contribution decision notification (P2-3188)', () => {
  let service: ShareResultRequestService;
  let notificationService: { emitResultNotification: jest.Mock };
  let resultsCenterRepository: { getAllResultsCenterByResultId: jest.Mock };
  let roleByUserRepository: { getUserIdsByCenter: jest.Mock };
  let clarisaInitiativesRepository: { findOne: jest.Mock };

  const user = { id: 10 } as TokenDto;

  const ACCEPTED = 2;
  const DECLINED = 3;

  const findShare = { result_id: 555, shared_inititiative_id: 88 };

  const emit = (statusId: number, share: any = findShare) =>
    (
      service as unknown as {
        emitContributionDecisionNotification: (
          s: any,
          id: number,
          u: TokenDto,
        ) => Promise<void>;
      }
    ).emitContributionDecisionNotification(share, statusId, user);

  beforeEach(async () => {
    notificationService = { emitResultNotification: jest.fn() };
    resultsCenterRepository = {
      // One lead centre plus a contributor, so "picks the lead" is actually exercised.
      getAllResultsCenterByResultId: jest.fn().mockResolvedValue([
        { code: 'CONTRIB', is_leading_result: 0 },
        { code: 'LEAD', is_leading_result: 1 },
      ]),
    };
    roleByUserRepository = {
      getUserIdsByCenter: jest.fn().mockResolvedValue([21, 22]),
    };
    clarisaInitiativesRepository = {
      findOne: jest.fn().mockResolvedValue({ official_code: 'SP04' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareResultRequestService,
        { provide: NotificationService, useValue: notificationService },
        { provide: ResultsCenterRepository, useValue: resultsCenterRepository },
        { provide: RoleByUserRepository, useValue: roleByUserRepository },
        {
          provide: ClarisaInitiativesRepository,
          useValue: clarisaInitiativesRepository,
        },
        { provide: HandlersError, useValue: { returnErrorRes: jest.fn() } },
        { provide: ShareResultRequestRepository, useValue: {} },
      ],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<ShareResultRequestService>(ShareResultRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('which decisions emit', () => {
    it('emits the ACCEPTED type when the contribution is accepted', async () => {
      await emit(ACCEPTED);

      expect(notificationService.emitResultNotification).toHaveBeenCalledWith(
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_CONTRIBUTION_ACCEPTED,
        [21, 22],
        10,
        555,
        expect.stringContaining('accepted'),
      );
    });

    it('emits the DECLINED type when the contribution is declined', async () => {
      await emit(DECLINED);

      const [, type, , , , suffix] =
        notificationService.emitResultNotification.mock.calls[0];
      expect(type).toBe(NotificationTypeEnum.RESULT_CONTRIBUTION_DECLINED);
      expect(suffix).toContain('declined');
    });

    // A pending request, or any status added later, must stay silent rather than being labelled as
    // one of the two decisions.
    it.each([
      ['pending (1)', 1],
      ['unknown (99)', 99],
      ['zero', 0],
    ])('emits nothing for %s', async (_label, statusId) => {
      await emit(statusId);

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
      expect(
        resultsCenterRepository.getAllResultsCenterByResultId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('recipients — the lead centre, not the initiative', () => {
    it('resolves the centre flagged as lead and asks for its users', async () => {
      await emit(ACCEPTED);

      expect(roleByUserRepository.getUserIdsByCenter).toHaveBeenCalledWith(
        'LEAD',
      );
    });

    it('emits nothing when the result has no lead centre', async () => {
      resultsCenterRepository.getAllResultsCenterByResultId.mockResolvedValue([
        { code: 'CONTRIB', is_leading_result: 0 },
      ]);

      await emit(ACCEPTED);

      expect(roleByUserRepository.getUserIdsByCenter).not.toHaveBeenCalled();
      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });

    it('emits nothing when the result has no centres at all', async () => {
      resultsCenterRepository.getAllResultsCenterByResultId.mockResolvedValue(
        [],
      );

      await emit(ACCEPTED);

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });

    it('excludes the user who made the decision', async () => {
      roleByUserRepository.getUserIdsByCenter.mockResolvedValue([10, 21]);

      await emit(ACCEPTED);

      const [, , recipients] =
        notificationService.emitResultNotification.mock.calls[0];
      expect(recipients).toEqual([21]);
    });

    it('emits nothing when the only centre user is the decider', async () => {
      roleByUserRepository.getUserIdsByCenter.mockResolvedValue([10]);

      await emit(ACCEPTED);

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });
  });

  describe('the stored copy', () => {
    it("carries the deciding Science Program's official code", async () => {
      await emit(ACCEPTED);

      const [, , , , , suffix] =
        notificationService.emitResultNotification.mock.calls[0];
      expect(suffix).toBe(
        'contribution was accepted by SP04. Click to see the result.',
      );
    });

    // Degrades to a sentence that still reads, rather than "by undefined".
    it('omits the programme when the initiative cannot be resolved', async () => {
      clarisaInitiativesRepository.findOne.mockResolvedValue(null);

      await emit(DECLINED);

      const [, , , , , suffix] =
        notificationService.emitResultNotification.mock.calls[0];
      expect(suffix).toBe(
        'contribution was declined. Click to see the result.',
      );
    });

    it('still emits when resolving the initiative throws', async () => {
      clarisaInitiativesRepository.findOne.mockRejectedValue(
        new Error('clarisa down'),
      );

      await emit(ACCEPTED);

      expect(notificationService.emitResultNotification).toHaveBeenCalled();
    });
  });

  describe('never breaks the accept/decline', () => {
    it('swallows a failure while resolving centres', async () => {
      resultsCenterRepository.getAllResultsCenterByResultId.mockRejectedValue(
        new Error('db down'),
      );

      await expect(emit(ACCEPTED)).resolves.toBeUndefined();
    });

    it('swallows a failure while emitting', async () => {
      notificationService.emitResultNotification.mockRejectedValue(
        new Error('socket down'),
      );

      await expect(emit(ACCEPTED)).resolves.toBeUndefined();
    });

    it('emits nothing when the share row carries no usable result id', async () => {
      await emit(ACCEPTED, { result_id: null, shared_inititiative_id: 88 });

      expect(notificationService.emitResultNotification).not.toHaveBeenCalled();
    });
  });
});
