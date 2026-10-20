// @akili-spec changes/replicated-innovation-reminders
import { Logger } from '@nestjs/common';
import { ReminderDispatcher } from './reminder-dispatcher.service';
import {
  ReplicatedReminderKind,
  ReplicatedReminderStatus,
} from './entities/replicated-innovation-reminder-campaign.entity';
import { PendingRow } from './digest-builder';

/**
 * `RIR-T-4` — falsifiers (a)-(h) of tasks.md plus the batching, stale-release and subject rules.
 * Everything below the dispatcher (repositories, template lookup, email service) is a mock: the
 * seam is "which calls the dispatcher makes, in what order, with what arguments".
 */
const TEST_EMAIL = 'tester@example.org';
const CAMPAIGN_ID = 7;

const makeRows = (n: number): PendingRow[] =>
  Array.from({ length: n }, (_, i) => ({
    result_id: 1000 + i,
    result_code: 2000 + i,
    title: `Innovation ${i}`,
    result_type_id: i % 2 === 0 ? 2 : 7,
    version_id: 42,
    initiative_id: 1,
    initiative_code: 'SP01',
    initiative_short_name: 'Short',
    lead_email: `lead${i}@example.org`,
    lead_name: `Lead ${i}`,
    lead_contact_person: null,
  }));

const dupError = () =>
  Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });

interface Opts {
  rows?: PendingRow[];
  claim?: boolean;
  template?: { template: string } | null;
  params?: Record<string, string>;
  kind?: ReplicatedReminderKind;
}

function setup(opts: Opts = {}) {
  const params: Record<string, string> = {
    rir_test_recipient_email: TEST_EMAIL,
    rir_batch_size: '25',
    rir_batch_pause_ms: '2000',
    rir_stale_sending_minutes: '60',
    ...(opts.params ?? {}),
  };
  const campaignRepo = {
    claim: jest.fn().mockResolvedValue(opts.claim ?? true),
    findWithPhase: jest.fn().mockResolvedValue({
      id: CAMPAIGN_ID,
      version_id: 42,
      kind: opts.kind ?? ReplicatedReminderKind.Q4_NOTICE,
      obj_version: { phase_name: 'Reporting 2026' },
    }),
    releaseStale: jest.fn().mockResolvedValue(0),
    findDueIds: jest.fn().mockResolvedValue([]),
    finalize: jest.fn().mockResolvedValue(true),
    insertLog: jest.fn().mockResolvedValue(undefined),
  };
  const pendingRepo = {
    findPending: jest.fn().mockResolvedValue(opts.rows ?? makeRows(3)),
    findCcByInitiatives: jest
      .fn()
      .mockResolvedValue(new Map([[1, ['coord@example.org']]])),
  };
  const templateRepo = {
    findOne: jest
      .fn()
      .mockResolvedValue(
        opts.template === undefined
          ? { template: '<p>{{leadName}} {{resultCount}} {{intendedTo}}</p>' }
          : opts.template,
      ),
  };
  const globalParamRepo = {
    findOne: jest.fn(({ where }) =>
      Promise.resolve(
        where.name in params ? { value: params[where.name] } : null,
      ),
    ),
  };
  const emailService = {
    sendEmail: jest.fn(),
    addLabel: jest.fn().mockReturnValue('[PRMS Testing]'),
  };
  const dispatcher = new ReminderDispatcher(
    campaignRepo as any,
    pendingRepo as any,
    templateRepo as any,
    globalParamRepo as any,
    emailService as any,
  );
  const sleep = jest
    .spyOn(dispatcher as any, 'sleep')
    .mockResolvedValue(undefined);
  return {
    dispatcher,
    campaignRepo,
    pendingRepo,
    templateRepo,
    emailService,
    sleep,
  };
}

describe('ReminderDispatcher', () => {
  const originalProd = process.env.IS_PRODUCTION;
  let logged: string[];

  beforeEach(() => {
    process.env.IS_PRODUCTION = 'true';
    logged = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      jest
        .spyOn(Logger.prototype, level)
        .mockImplementation((...args: any[]) => {
          logged.push(args.map((a) => String(a?.message ?? a)).join(' '));
        });
    }
  });

  afterEach(() => {
    process.env.IS_PRODUCTION = originalProd;
    jest.restoreAllMocks();
  });

  const finalOf = (campaignRepo: any) => campaignRepo.finalize.mock.calls[0][2];

  it('(a) claim lost (affected 0) => sendEmail is never called and nothing else is read', async () => {
    const { dispatcher, emailService, pendingRepo, campaignRepo } = setup({
      claim: false,
    });
    const outcome = await dispatcher.dispatch(CAMPAIGN_ID);
    expect(outcome.result).toBe('CLAIM_LOST');
    expect(emailService.sendEmail).toHaveBeenCalledTimes(0);
    expect(pendingRepo.findPending).not.toHaveBeenCalled();
    expect(campaignRepo.insertLog).not.toHaveBeenCalled();
    expect(campaignRepo.finalize).not.toHaveBeenCalled();
  });

  it('(b) log INSERT hits ER_DUP_ENTRY for 40 of 100 digests => exactly 60 sends, 40 skipped', async () => {
    const { dispatcher, emailService, campaignRepo } = setup({
      rows: makeRows(100),
    });
    let call = 0;
    campaignRepo.insertLog.mockImplementation(() => {
      call += 1;
      return call <= 40 ? Promise.reject(dupError()) : Promise.resolve();
    });
    const outcome = await dispatcher.dispatch(CAMPAIGN_ID);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(60);
    expect(outcome).toMatchObject({ sent: 60, skipped: 40, failed: 0 });
    expect(finalOf(campaignRepo)).toMatchObject({
      status: ReplicatedReminderStatus.SENT,
      sent_count: 60,
      skipped_count: 40,
    });
  });

  it('the log row is written BEFORE the email of the same digest', async () => {
    const { dispatcher, emailService, campaignRepo } = setup({
      rows: makeRows(1),
    });
    await dispatcher.dispatch(CAMPAIGN_ID);
    expect(campaignRepo.insertLog.mock.invocationCallOrder[0]).toBeLessThan(
      emailService.sendEmail.mock.invocationCallOrder[0],
    );
    expect(campaignRepo.insertLog).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_id: CAMPAIGN_ID,
        recipient_email: 'lead0@example.org',
        result_ids: '1000',
        cc_count: 1,
        redirected: false,
      }),
    );
  });

  it('(c) sendEmail throws on digest 3 => later digests are still sent, FAILED with failed = 1', async () => {
    const { dispatcher, emailService, campaignRepo } = setup({
      rows: makeRows(5),
    });
    emailService.sendEmail.mockImplementation(() => {
      if (emailService.sendEmail.mock.calls.length === 3)
        throw new Error('boom for lead2@example.org');
    });
    const outcome = await dispatcher.dispatch(CAMPAIGN_ID);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(5);
    expect(outcome).toMatchObject({ sent: 4, failed: 1 });
    const final = finalOf(campaignRepo);
    expect(final.status).toBe(ReplicatedReminderStatus.FAILED);
    expect(final.failed_count).toBe(1);
    expect(final.last_error).not.toContain('@');
  });

  it('(d) IS_PRODUCTION=false => every call has to=[testEmail], cc=[] and an intended-recipients block', async () => {
    process.env.IS_PRODUCTION = 'false';
    const { dispatcher, emailService, campaignRepo } = setup({
      rows: makeRows(3),
    });
    await dispatcher.dispatch(CAMPAIGN_ID);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(3);
    for (const [msg] of emailService.sendEmail.mock.calls) {
      expect(msg.emailBody.to).toEqual([TEST_EMAIL]);
      expect(msg.emailBody.cc).toEqual([]);
    }
    const body =
      emailService.sendEmail.mock.calls[0][0].emailBody.message.socketFile;
    expect(body).toContain('lead0@example.org');
    expect(campaignRepo.insertLog.mock.calls[0][0]).toMatchObject({
      recipient_email: 'lead0@example.org',
      redirected: true,
    });
  });

  it('in production the digest goes to the lead with the CC list', async () => {
    const { dispatcher, emailService } = setup({ rows: makeRows(1) });
    await dispatcher.dispatch(CAMPAIGN_ID);
    const { emailBody } = emailService.sendEmail.mock.calls[0][0];
    expect(emailBody.to).toEqual(['lead0@example.org']);
    expect(emailBody.cc).toEqual(['coord@example.org']);
  });

  it('(e) IS_PRODUCTION=false with an empty test address => 0 sends and FAILED', async () => {
    process.env.IS_PRODUCTION = 'false';
    const { dispatcher, emailService, campaignRepo } = setup({
      params: { rir_test_recipient_email: '  ' },
    });
    const outcome = await dispatcher.dispatch(CAMPAIGN_ID);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(campaignRepo.insertLog).not.toHaveBeenCalled();
    expect(outcome.status).toBe(ReplicatedReminderStatus.FAILED);
    expect(finalOf(campaignRepo)).toMatchObject({
      status: ReplicatedReminderStatus.FAILED,
      last_error: 'test recipient not configured',
    });
  });

  it('(f) dryRun => 0 sends, 0 log inserts, 0 status updates, and the preview is returned', async () => {
    const { dispatcher, emailService, campaignRepo } = setup({
      rows: [
        ...makeRows(2),
        { ...makeRows(1)[0], result_id: 9, lead_email: null },
      ],
    });
    const outcome = await dispatcher.dispatch(CAMPAIGN_ID, { dryRun: true });
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(campaignRepo.insertLog).not.toHaveBeenCalled();
    expect(campaignRepo.claim).not.toHaveBeenCalled();
    expect(campaignRepo.finalize).not.toHaveBeenCalled();
    expect(outcome.result).toBe('DRY_RUN');
    expect(outcome.digests).toHaveLength(2);
    expect(outcome.unreachableRows).toHaveLength(1);
  });

  it('(g) missing template => FAILED, no throw, nothing sent', async () => {
    const { dispatcher, emailService, campaignRepo } = setup({
      template: null,
    });
    await expect(dispatcher.dispatch(CAMPAIGN_ID)).resolves.toMatchObject({
      status: ReplicatedReminderStatus.FAILED,
    });
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(finalOf(campaignRepo).last_error).toMatch(/template/i);
  });

  it('(h) the logger is never called with an @ character, even when an error carries an address', async () => {
    process.env.IS_PRODUCTION = 'false';
    const a = setup({ rows: makeRows(3) });
    a.emailService.sendEmail.mockImplementation(() => {
      throw new Error('smtp rejected lead1@example.org');
    });
    await a.dispatcher.dispatch(CAMPAIGN_ID);
    const b = setup({ template: null });
    await b.dispatcher.dispatch(CAMPAIGN_ID);
    const c = setup();
    c.pendingRepo.findPending.mockRejectedValue(
      new Error('x lead9@example.org'),
    );
    await c.dispatcher.dispatch(CAMPAIGN_ID);
    expect(logged.length).toBeGreaterThan(0);
    expect(logged.filter((line) => line.includes('@'))).toEqual([]);
  });

  it('an unexpected error finalizes FAILED without leaking its message', async () => {
    const { dispatcher, pendingRepo, campaignRepo } = setup();
    pendingRepo.findPending.mockRejectedValue(
      new Error('secret lead9@example.org'),
    );
    const outcome = await dispatcher.dispatch(CAMPAIGN_ID);
    expect(outcome.status).toBe(ReplicatedReminderStatus.FAILED);
    expect(finalOf(campaignRepo).last_error).not.toContain('@');
    expect(finalOf(campaignRepo).last_error.length).toBeLessThanOrEqual(500);
  });

  it('publishes in batches of rir_batch_size and pauses rir_batch_pause_ms between them only', async () => {
    const { dispatcher, sleep } = setup({
      rows: makeRows(60),
      params: { rir_batch_size: '25', rir_batch_pause_ms: '1500' },
    });
    await dispatcher.dispatch(CAMPAIGN_ID);
    expect(sleep).toHaveBeenCalledTimes(2); // 25 | 25 | 10
    expect(sleep).toHaveBeenCalledWith(1500);
  });

  it('falls back to defaults when batch params are missing or invalid', async () => {
    const { dispatcher, sleep } = setup({
      rows: makeRows(30),
      params: { rir_batch_size: 'abc', rir_batch_pause_ms: '-5' },
    });
    await dispatcher.dispatch(CAMPAIGN_ID);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('the subject carries addLabel(), the phase name and the kind', async () => {
    const q4 = setup({ rows: makeRows(1) });
    await q4.dispatcher.dispatch(CAMPAIGN_ID);
    const fin = setup({
      rows: makeRows(1),
      kind: ReplicatedReminderKind.FINAL_REMINDER,
    });
    await fin.dispatcher.dispatch(CAMPAIGN_ID);
    const s1 = q4.emailService.sendEmail.mock.calls[0][0].emailBody.subject;
    const s2 = fin.emailService.sendEmail.mock.calls[0][0].emailBody.subject;
    expect(s1).toContain('[PRMS Testing]');
    expect(s1).toContain('Reporting 2026');
    expect(s1).not.toMatch(/final reminder/i);
    expect(s2).toMatch(/final reminder/i);
    expect(s2).toContain('Reporting 2026');
  });

  it('SENT with unreachable count when failed = 0', async () => {
    const { dispatcher, campaignRepo } = setup({
      rows: [
        ...makeRows(2),
        { ...makeRows(1)[0], result_id: 9, lead_email: null },
      ],
    });
    await dispatcher.dispatch(CAMPAIGN_ID);
    expect(finalOf(campaignRepo)).toMatchObject({
      status: ReplicatedReminderStatus.SENT,
      sent_count: 2,
      unreachable_count: 1,
    });
  });

  describe('rework', () => {
    it('the cron path claims PENDING only: a campaign already FAILED => claim lost, 0 sends', async () => {
      const { dispatcher, emailService, campaignRepo } = setup();
      const storedStatus = ReplicatedReminderStatus.FAILED;
      campaignRepo.claim.mockImplementation((_id, _at, allowed) =>
        Promise.resolve(allowed.includes(storedStatus)),
      );
      campaignRepo.findDueIds.mockResolvedValue([CAMPAIGN_ID]);
      const outcomes = await dispatcher.dispatchDue();
      expect(campaignRepo.claim.mock.calls[0][2]).toEqual([
        ReplicatedReminderStatus.PENDING,
      ]);
      expect(outcomes[0].result).toBe('CLAIM_LOST');
      expect(emailService.sendEmail).not.toHaveBeenCalled();

      // Send now (allowRetry) may re-claim the same FAILED campaign.
      const retry = await dispatcher.dispatch(CAMPAIGN_ID, {
        allowRetry: true,
      });
      expect(campaignRepo.claim.mock.calls[1][2]).toEqual([
        ReplicatedReminderStatus.PENDING,
        ReplicatedReminderStatus.FAILED,
      ]);
      expect(retry.result).toBe('DONE');
    });

    it('finalize is keyed on this run claimed_at, and a lost finalize is reported NOT_SAVED', async () => {
      const { dispatcher, campaignRepo } = setup({ rows: makeRows(2) });
      campaignRepo.finalize.mockResolvedValue(false);
      const outcome = await dispatcher.dispatch(CAMPAIGN_ID);
      const claimedAt = campaignRepo.claim.mock.calls[0][1];
      expect(campaignRepo.finalize.mock.calls[0][1]).toBe(claimedAt);
      expect(claimedAt.getMilliseconds()).toBe(0);
      expect(outcome.result).toBe('NOT_SAVED');
      expect(outcome.status).toBeNull();
      expect(outcome.sent).toBe(2);
      expect(logged.filter((l) => l.includes('NOT saved'))).toHaveLength(1);
    });

    it('a retry hands finalize only THIS run counts (60 sent, 40 skipped); the repository adds sent', async () => {
      const { dispatcher, campaignRepo } = setup({ rows: makeRows(100) });
      let call = 0;
      campaignRepo.insertLog.mockImplementation(() => {
        call += 1;
        return call <= 40 ? Promise.reject(dupError()) : Promise.resolve();
      });
      await dispatcher.dispatch(CAMPAIGN_ID, { allowRetry: true });
      expect(finalOf(campaignRepo)).toMatchObject({
        sent_count: 60,
        skipped_count: 40,
        failed_count: 0,
      });
    });

    it('a blank lead name renders as "colleague"', async () => {
      const rows = makeRows(2);
      rows[0].lead_name = null;
      rows[1].lead_name = '   ';
      const { dispatcher, emailService } = setup({
        rows,
        template: { template: '<p>Dear {{leadName}},</p>' },
      });
      await dispatcher.dispatch(CAMPAIGN_ID);
      expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
      for (const [msg] of emailService.sendEmail.mock.calls) {
        expect(msg.emailBody.message.socketFile).toBe('<p>Dear colleague,</p>');
      }
    });

    it('the NOT_FOUND path still logs "dispatch end"', async () => {
      const { dispatcher, campaignRepo } = setup();
      campaignRepo.findWithPhase.mockResolvedValue(null);
      const outcome = await dispatcher.dispatch(CAMPAIGN_ID);
      expect(outcome.result).toBe('NOT_FOUND');
      expect(logged.some((l) => l.startsWith('dispatch end'))).toBe(true);
    });
  });

  describe('dispatchDue', () => {
    it('releases stale claims older than rir_stale_sending_minutes, then dispatches each due campaign even if one throws', async () => {
      const { dispatcher, campaignRepo } = setup();
      campaignRepo.findDueIds.mockResolvedValue([1, 2]);
      const spy = jest
        .spyOn(dispatcher, 'dispatch')
        .mockRejectedValueOnce(new Error('x'))
        .mockResolvedValueOnce({ result: 'DONE' } as any);
      const before = Date.now();
      await dispatcher.dispatchDue();
      const olderThan: Date = campaignRepo.releaseStale.mock.calls[0][0];
      expect(before - olderThan.getTime()).toBeGreaterThanOrEqual(59 * 60_000);
      expect(before - olderThan.getTime()).toBeLessThanOrEqual(61 * 60_000);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, 1, {
        dryRun: false,
        allowRetry: false,
      });
    });
  });
});
