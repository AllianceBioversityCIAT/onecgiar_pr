// @akili-spec changes/replicated-innovation-reminders
import {
  BadRequestException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { ReplicatedInnovationRemindersService } from './replicated-innovation-reminders.service';
import {
  ReplicatedReminderKind,
  ReplicatedReminderStatus,
} from './entities/replicated-innovation-reminder-campaign.entity';
import { DispatchOutcome } from './reminder-dispatcher.service';

/**
 * `RIR-T-5` — service rules (RIR-R-5, R-7, R-9, R-15) and the T-4 contract: HTTP mapping of a
 * dispatch outcome, the active-phase guard (advisory 7) and the 412 precondition.
 * Collaborators are mocks; the seam is "which status code, and was the dispatcher reached".
 */
const PHASE_ID = 8;
const future = () => new Date(Date.now() + 86_400_000).toISOString();
const past = () => new Date(Date.now() - 86_400_000).toISOString();

const campaign = (over: Record<string, unknown> = {}) => ({
  id: 3,
  version_id: PHASE_ID,
  kind: ReplicatedReminderKind.Q4_NOTICE,
  scheduled_at: new Date(Date.now() + 86_400_000),
  status: ReplicatedReminderStatus.PENDING,
  claimed_at: null,
  sent_at: null,
  sent_count: 0,
  skipped_count: 0,
  failed_count: 0,
  unreachable_count: 0,
  last_error: null,
  ...over,
});

const outcome = (over: Partial<DispatchOutcome> = {}): DispatchOutcome => ({
  result: 'DONE',
  status: ReplicatedReminderStatus.SENT,
  sent: 2,
  skipped: 0,
  failed: 0,
  unreachable: 1,
  last_error: null,
  ...over,
});

function setup(opts: { isProd?: boolean; testEmail?: string } = {}) {
  process.env.IS_PRODUCTION = opts.isProd ? 'true' : 'false';
  const campaignRepo: any = {
    find: jest.fn().mockResolvedValue([campaign()]),
    findOne: jest.fn().mockResolvedValue(campaign()),
    create: jest.fn((v) => ({ id: 99, ...v })),
    save: jest.fn((v) => Promise.resolve(campaign(v))),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const pendingRepo: any = {
    findPending: jest.fn().mockResolvedValue([
      { result_id: 1, lead_email: 'a@example.org', initiative_id: 1 },
      { result_id: 2, lead_email: null, initiative_id: 1 },
    ]),
  };
  const dispatcher: any = { dispatch: jest.fn().mockResolvedValue(outcome()) };
  const globalParams: any = {
    findOne: jest
      .fn()
      .mockResolvedValue({ value: opts.testEmail ?? 'tester@example.org' }),
  };
  const versionRepo: any = {
    findOne: jest.fn().mockResolvedValue({
      id: PHASE_ID,
      phase_name: 'Reporting 2026',
      phase_year: 2026,
    }),
  };
  const service = new ReplicatedInnovationRemindersService(
    campaignRepo,
    pendingRepo,
    dispatcher,
    globalParams,
    versionRepo,
  );
  return {
    service,
    campaignRepo,
    pendingRepo,
    dispatcher,
    globalParams,
    versionRepo,
  };
}

const status = async (promise: Promise<unknown>): Promise<number> => {
  try {
    await promise;
    return 200;
  } catch (e) {
    return (e as HttpException).getStatus();
  }
};

describe('ReplicatedInnovationRemindersService', () => {
  afterEach(() => {
    delete process.env.IS_PRODUCTION;
  });

  describe('create (RIR-R-5)', () => {
    it('a duplicate Q4_NOTICE gives 409 and saves nothing', async () => {
      const { service, campaignRepo } = setup();
      campaignRepo.findOne.mockResolvedValue({ id: 1 });
      await expect(
        service.create({
          kind: ReplicatedReminderKind.Q4_NOTICE,
          scheduled_at: future(),
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(campaignRepo.save).not.toHaveBeenCalled();
    });

    it('the duplicate lookup ignores CANCELLED, so a cancelled kind can be re-created', async () => {
      const { service, campaignRepo } = setup();
      campaignRepo.findOne.mockResolvedValue(null);
      await service.create({
        kind: ReplicatedReminderKind.Q4_NOTICE,
        scheduled_at: future(),
      });
      const where = campaignRepo.findOne.mock.calls[0][0].where;
      expect(where).toMatchObject({
        version_id: PHASE_ID,
        kind: ReplicatedReminderKind.Q4_NOTICE,
      });
      // TypeORM Not(...) operator wrapping CANCELLED.
      expect(where.status.value).toBe(ReplicatedReminderStatus.CANCELLED);
    });

    it('FINAL_REMINDER beside an existing Q4_NOTICE is created (201 path)', async () => {
      const { service, campaignRepo } = setup();
      // The lookup is per kind: only a FINAL_REMINDER row would conflict, and there is none.
      campaignRepo.findOne.mockImplementation(({ where }) =>
        Promise.resolve(
          where.kind === ReplicatedReminderKind.Q4_NOTICE ? { id: 1 } : null,
        ),
      );
      const view = await service.create(
        {
          kind: ReplicatedReminderKind.FINAL_REMINDER,
          scheduled_at: future(),
        },
        575,
      );
      expect(campaignRepo.save).toHaveBeenCalledTimes(1);
      expect(campaignRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          version_id: PHASE_ID,
          kind: ReplicatedReminderKind.FINAL_REMINDER,
          status: ReplicatedReminderStatus.PENDING,
          created_by: 575,
        }),
      );
      expect(view.kind).toBe(ReplicatedReminderKind.FINAL_REMINDER);
    });

    it('a past scheduled_at gives 400', async () => {
      const { service, campaignRepo } = setup();
      await expect(
        service.create({
          kind: ReplicatedReminderKind.Q4_NOTICE,
          scheduled_at: past(),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(campaignRepo.save).not.toHaveBeenCalled();
    });

    it('no active Reporting phase gives 404', async () => {
      const { service, versionRepo } = setup();
      versionRepo.findOne.mockResolvedValue(null);
      expect(
        await status(
          service.create({
            kind: ReplicatedReminderKind.Q4_NOTICE,
            scheduled_at: future(),
          }),
        ),
      ).toBe(404);
    });
  });

  describe('edit date / cancel: only PENDING (SENT is frozen)', () => {
    it.each([
      ReplicatedReminderStatus.SENT,
      ReplicatedReminderStatus.SENDING,
      ReplicatedReminderStatus.CANCELLED,
    ])('editing a %s campaign gives 409', async (st) => {
      const { service, campaignRepo } = setup();
      campaignRepo.findOne.mockResolvedValue(campaign({ status: st }));
      campaignRepo.update.mockResolvedValue({ affected: 0 });
      expect(
        await status(service.updateDate(3, { scheduled_at: future() })),
      ).toBe(409);
    });

    it('cancelling a SENT campaign gives 409', async () => {
      const { service, campaignRepo } = setup();
      campaignRepo.findOne.mockResolvedValue(
        campaign({ status: ReplicatedReminderStatus.SENT }),
      );
      campaignRepo.update.mockResolvedValue({ affected: 0 });
      expect(await status(service.cancel(3))).toBe(409);
    });

    it('the UPDATE itself is guarded on status = PENDING (no read-then-write race)', async () => {
      const { service, campaignRepo } = setup();
      await service.cancel(3, 575);
      expect(campaignRepo.update).toHaveBeenCalledWith(
        { id: 3, status: ReplicatedReminderStatus.PENDING },
        expect.objectContaining({ status: ReplicatedReminderStatus.CANCELLED }),
      );
    });

    it('editing the date of a campaign of a closed phase gives 409 (cancel stays allowed)', async () => {
      const { service, campaignRepo } = setup();
      campaignRepo.findOne.mockResolvedValue(campaign({ version_id: 7 }));
      expect(
        await status(service.updateDate(3, { scheduled_at: future() })),
      ).toBe(409);
      expect(campaignRepo.update).not.toHaveBeenCalled();
      expect(await status(service.cancel(3))).toBe(200);
    });

    it('a past date on edit gives 400 and unknown id gives 404', async () => {
      const { service, campaignRepo } = setup();
      expect(
        await status(service.updateDate(3, { scheduled_at: past() })),
      ).toBe(400);
      campaignRepo.findOne.mockResolvedValue(null);
      expect(await status(service.cancel(404))).toBe(404);
    });
  });

  it('the active phase is looked up with status, is_active and the REPORTING module', async () => {
    const { service, versionRepo } = setup();
    await service.list();
    expect(versionRepo.findOne).toHaveBeenCalledWith({
      where: { status: true, is_active: true, app_module_id: 1 },
    });
    expect(AppModuleIdEnum.REPORTING).toBe(1);
  });

  describe('list (RIR-R-15)', () => {
    it('returns the active phase, its campaigns and live pending / unreachable totals', async () => {
      const { service } = setup();
      const view = await service.list();
      expect(view.phase).toEqual({
        id: PHASE_ID,
        phase_name: 'Reporting 2026',
        phase_year: 2026,
      });
      expect(view.campaigns).toHaveLength(1);
      expect(view.campaigns[0].scheduled_at).toMatch(/Z$/);
      expect(view.pending_total).toBe(2);
      expect(view.unreachable_total).toBe(1);
    });
  });

  describe('preview (RIR-R-9)', () => {
    it('dispatches a dry run and maps digests to totals', async () => {
      const { service, dispatcher } = setup();
      dispatcher.dispatch.mockResolvedValue(
        outcome({
          result: 'DRY_RUN',
          status: null,
          digests: [
            {
              to: 'a@example.org',
              lead_name: 'A',
              cc: ['c@example.org'],
              results: [{}, {}] as any,
            },
            {
              to: 'b@example.org',
              lead_name: 'B',
              cc: ['c@example.org'],
              results: [{}] as any,
            },
          ],
          unreachableRows: [{} as any],
          redirectedTo: 'tester@example.org',
        }),
      );
      const view = await service.preview(3);
      expect(dispatcher.dispatch).toHaveBeenCalledWith(3, { dryRun: true });
      expect(view.totals).toEqual({ leads: 2, results: 3, cc_addresses: 1 });
      expect(view.unreachable).toHaveLength(1);
      expect(view.redirected_to).toBe('tester@example.org');
    });

    it.each([
      ReplicatedReminderStatus.SENT,
      ReplicatedReminderStatus.SENDING,
      ReplicatedReminderStatus.CANCELLED,
    ])(
      'a %s campaign gives 409 without reaching the dispatcher',
      async (st) => {
        const { service, campaignRepo, dispatcher } = setup();
        campaignRepo.findOne.mockResolvedValue(campaign({ status: st }));
        expect(await status(service.preview(3))).toBe(409);
        expect(dispatcher.dispatch).not.toHaveBeenCalled();
      },
    );

    it('a FAILED campaign can be previewed', async () => {
      const { service, campaignRepo, dispatcher } = setup();
      campaignRepo.findOne.mockResolvedValue(
        campaign({ status: ReplicatedReminderStatus.FAILED }),
      );
      dispatcher.dispatch.mockResolvedValue(
        outcome({ result: 'DRY_RUN', status: null }),
      );
      expect(await status(service.preview(3))).toBe(200);
    });

    it('a campaign of a closed phase gives 409 (advisory 7)', async () => {
      const { service, campaignRepo, dispatcher } = setup();
      campaignRepo.findOne.mockResolvedValue(campaign({ version_id: 7 }));
      expect(await status(service.preview(3))).toBe(409);
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('send (RIR-R-7)', () => {
    it('Send now dispatches with allowRetry and returns the counts', async () => {
      const { service, dispatcher } = setup();
      const view = await service.send(3);
      expect(dispatcher.dispatch).toHaveBeenCalledWith(3, {
        dryRun: false,
        allowRetry: true,
      });
      expect(view).toEqual({
        status: ReplicatedReminderStatus.SENT,
        sent: 2,
        skipped: 0,
        failed: 0,
        unreachable: 1,
      });
    });

    it.each([
      ReplicatedReminderStatus.SENT,
      ReplicatedReminderStatus.SENDING,
      ReplicatedReminderStatus.CANCELLED,
    ])('a %s campaign gives 409 and sends nothing', async (st) => {
      const { service, campaignRepo, dispatcher } = setup();
      campaignRepo.findOne.mockResolvedValue(campaign({ status: st }));
      expect(await status(service.send(3))).toBe(409);
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    });

    it.each(['CLAIM_LOST', 'NOT_SAVED'] as const)(
      'a %s outcome gives 409',
      async (result) => {
        const { service, dispatcher } = setup();
        dispatcher.dispatch.mockResolvedValue(
          outcome({ result, status: null }),
        );
        expect(await status(service.send(3))).toBe(409);
      },
    );

    it('a closed phase gives 409 without claiming (advisory 7)', async () => {
      const { service, campaignRepo, dispatcher } = setup();
      campaignRepo.findOne.mockResolvedValue(campaign({ version_id: 7 }));
      expect(await status(service.send(3))).toBe(409);
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('non-prod with an empty test address gives 412 BEFORE the claim', async () => {
      const { service, dispatcher } = setup({ testEmail: '   ' });
      expect(await status(service.send(3))).toBe(412);
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('prod does not need the test address', async () => {
      const { service, dispatcher, globalParams } = setup({
        isProd: true,
        testEmail: '',
      });
      expect(await status(service.send(3))).toBe(200);
      expect(globalParams.findOne).not.toHaveBeenCalled();
      expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);
    });

    it('a dispatcher FAILED with the test-recipient error still maps to 412 (race fallback)', async () => {
      const { service, dispatcher } = setup();
      dispatcher.dispatch.mockResolvedValue(
        outcome({
          status: ReplicatedReminderStatus.FAILED,
          last_error: 'test recipient not configured',
        }),
      );
      expect(await status(service.send(3))).toBe(412);
    });

    it('a FAILED run for another reason is returned as a normal outcome', async () => {
      const { service, dispatcher } = setup();
      dispatcher.dispatch.mockResolvedValue(
        outcome({
          status: ReplicatedReminderStatus.FAILED,
          failed: 1,
          last_error: 'x',
        }),
      );
      const view = await service.send(3);
      expect(view.status).toBe(ReplicatedReminderStatus.FAILED);
    });
  });

  it('no thrown message carries an address', async () => {
    const { service, campaignRepo } = setup({ testEmail: ' ' });
    campaignRepo.findOne.mockResolvedValue(campaign());
    const err: any = await service.send(3).catch((e) => e);
    expect(String(err.message)).not.toMatch(/@/);
  });
});
