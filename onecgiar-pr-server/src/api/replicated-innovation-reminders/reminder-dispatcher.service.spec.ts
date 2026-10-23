// @akili-spec changes/replicated-innovation-reminders
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ReminderDispatcher } from './reminder-dispatcher.service';
import {
  ReplicatedReminderKind,
  ReplicatedReminderStatus,
} from './entities/replicated-innovation-reminder-campaign.entity';

/**
 * `RIR-T-4` — falsifiers (a)-(h) of tasks.md plus the batching, stale-release and subject rules.
 * Everything below the dispatcher (repositories, template lookup, email service) is a mock: the
 * seam is "which calls the dispatcher makes, in what order, with what arguments".
 */
import { PendingInnovationRowV2 } from './digest-builder';

const TEST_EMAIL = 'tester@example.org';
const CAMPAIGN_ID = 7;
const T_Q4 = 'email_template_replicated_innovation_q4_notice';
const T_FINAL = 'email_template_replicated_innovation_final_reminder';
const T_MELIA = 'email_template_replicated_innovation_melia_summary';
const T_CENTER = 'email_template_replicated_innovation_center';
const MELIA_EMAIL = 'melia@example.org';

const baseRow = (
  over: Partial<PendingInnovationRowV2> = {},
): PendingInnovationRowV2 => ({
  result_id: 1000,
  result_code: 2000,
  title: 'Innovation',
  result_type_id: 7,
  version_id: 42,
  initiative_id: 1,
  initiative_code: 'SP01',
  initiative_short_name: 'Short',
  lead_email: null,
  lead_name: null,
  lead_contact_person: null,
  source: 'Result',
  developer_text: null,
  lead_center_code: null,
  lead_center_name: null,
  ...over,
});

/** n type-7 W1/W2 rows, each with its own reachable developer devI@example.org. */
const makeRows = (n: number): PendingInnovationRowV2[] =>
  Array.from({ length: n }, (_, i) =>
    baseRow({
      result_id: 1000 + i,
      result_code: 2000 + i,
      title: `Innovation ${i}`,
      developer_text: `Dev ${i} <dev${i}@example.org>`,
    }),
  );

const activeFor = (rows: PendingInnovationRowV2[]) =>
  rows
    .flatMap((r) => [...(r.developer_text ?? '').matchAll(/<([^>]+)>/g)])
    .map((m) => ({ email: m[1], name: `Name ${m[1].split('@')[0]}` }));

const dupError = () =>
  Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });

interface Opts {
  rows?: PendingInnovationRowV2[];
  active?: { email: string; name: string }[];
  melia?: { initiative_id: number; name: string | null; email: string }[];
  centerMel?: { center_code: string; name: string | null; email: string }[];
  claim?: boolean;
  /** name -> template body; `null` = row missing. Unlisted names get a default body. */
  templates?: Record<string, string | null>;
  params?: Record<string, string>;
  kind?: ReplicatedReminderKind;
}

function setup(opts: Opts = {}) {
  const rows = opts.rows ?? makeRows(3);
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
      obj_version: { phase_name: 'Reporting 2026', phase_year: 2026 },
    }),
    releaseStale: jest.fn().mockResolvedValue(0),
    findDueIds: jest.fn().mockResolvedValue([]),
    finalize: jest.fn().mockResolvedValue(true),
    insertLog: jest.fn().mockResolvedValue(undefined),
  };
  const pendingRepo = {
    findPending: jest.fn().mockResolvedValue(rows),
    findActiveUserEmails: jest
      .fn()
      .mockResolvedValue(opts.active ?? activeFor(rows)),
    findMeliaByInitiatives: jest
      .fn()
      .mockResolvedValue(
        opts.melia ?? [{ initiative_id: 1, name: null, email: MELIA_EMAIL }],
      ),
    findCenterMel: jest.fn().mockResolvedValue(opts.centerMel ?? []),
  };
  const templateRepo = {
    findOne: jest.fn(({ where }) => {
      const custom = opts.templates?.[where.name];
      if (custom === null) return Promise.resolve(null);
      return Promise.resolve({
        template:
          custom ??
          `[${where.name}] {{kindLabel}} {{leadName}} {{resultCount}} {{phaseYear}}/{{nextYear}} {{intendedTo}} | {{intendedCc}}`,
      });
    }),
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
        message_key: 'DEVELOPER:dev0@example.org',
        recipient_email: 'dev0@example.org',
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
    expect(body).toContain('dev0@example.org');
    expect(campaignRepo.insertLog.mock.calls[0][0]).toMatchObject({
      recipient_email: 'dev0@example.org',
      redirected: true,
    });
  });

  it('in production the digest goes to the lead with the CC list', async () => {
    const { dispatcher, emailService } = setup({ rows: makeRows(1) });
    await dispatcher.dispatch(CAMPAIGN_ID);
    const { emailBody } = emailService.sendEmail.mock.calls[0][0];
    expect(emailBody.to).toEqual(['dev0@example.org']);
    expect(emailBody.cc).toEqual([MELIA_EMAIL]);
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
        baseRow({ result_id: 9, initiative_id: 2, initiative_code: 'SP02' }),
      ],
    });
    const outcome = await dispatcher.dispatch(CAMPAIGN_ID, { dryRun: true });
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(campaignRepo.insertLog).not.toHaveBeenCalled();
    expect(campaignRepo.claim).not.toHaveBeenCalled();
    expect(campaignRepo.finalize).not.toHaveBeenCalled();
    expect(outcome.result).toBe('DRY_RUN');
    expect(outcome.messages).toHaveLength(2);
    expect(outcome.unreachableRows).toHaveLength(1);
  });

  it('(g) missing template => FAILED, no throw, nothing sent', async () => {
    const { dispatcher, emailService, campaignRepo } = setup({
      templates: { [T_Q4]: null },
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
    const b = setup({ templates: { [T_Q4]: null } });
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

  it('in production the subject carries the [PRMS] label, the phase name and the kind', async () => {
    const q4 = setup({ rows: makeRows(1) });
    await q4.dispatcher.dispatch(CAMPAIGN_ID);
    const fin = setup({
      rows: makeRows(1),
      kind: ReplicatedReminderKind.FINAL_REMINDER,
    });
    await fin.dispatcher.dispatch(CAMPAIGN_ID);
    const s1 = q4.emailService.sendEmail.mock.calls[0][0].emailBody.subject;
    const s2 = fin.emailService.sendEmail.mock.calls[0][0].emailBody.subject;
    expect(s1).toContain('[PRMS]');
    expect(s1).toContain('Reporting 2026');
    expect(s1).not.toMatch(/final reminder/i);
    expect(s2).toMatch(/final reminder/i);
    expect(s2).toContain('Reporting 2026');
    // RIR-R-11 / RIR-OQ-6: exact wording, en dash, one space after the label.
    expect(s1).toBe(
      '[PRMS] Reminder: innovations pending a 2026 update \u2013 Reporting 2026',
    );
    expect(s2).toBe(
      '[PRMS] Final reminder: innovations pending a 2026 update \u2013 Reporting 2026',
    );
  });

  it('the subject label follows the dispatcher own isProd: non-prod and unset IS_PRODUCTION say Testing', async () => {
    for (const value of ['false', undefined]) {
      if (value === undefined) delete process.env.IS_PRODUCTION;
      else process.env.IS_PRODUCTION = value;
      const { dispatcher, emailService } = setup({ rows: makeRows(1) });
      emailService.addLabel.mockReturnValue('[PRMS]'); // must be ignored
      await dispatcher.dispatch(CAMPAIGN_ID);
      expect(emailService.sendEmail.mock.calls[0][0].emailBody.subject).toBe(
        '[PRMS Testing] Reminder: innovations pending a 2026 update – Reporting 2026',
      );
    }
  });

  it('dryRun whose build fails rejects and never claims, logs, finalizes or sends (RIR-R-9)', async () => {
    const { dispatcher, emailService, campaignRepo, pendingRepo } = setup();
    pendingRepo.findPending.mockRejectedValue(
      new Error('db down for lead9@example.org'),
    );
    const failure = await dispatcher
      .dispatch(CAMPAIGN_ID, { dryRun: true })
      .catch((e) => e);
    expect(failure).toBeInstanceOf(InternalServerErrorException);
    expect(failure.message).not.toContain('@');
    expect(campaignRepo.claim).not.toHaveBeenCalled();
    expect(campaignRepo.insertLog).not.toHaveBeenCalled();
    expect(campaignRepo.finalize).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('SENT with unreachable count when failed = 0', async () => {
    const { dispatcher, campaignRepo } = setup({
      rows: [
        ...makeRows(2),
        baseRow({ result_id: 9, initiative_id: 2, initiative_code: 'SP02' }),
      ],
    });
    await dispatcher.dispatch(CAMPAIGN_ID);
    expect(finalOf(campaignRepo)).toMatchObject({
      status: ReplicatedReminderStatus.SENT,
      sent_count: 2,
      unreachable_count: 1,
    });
  });

  describe('recipient model v2 (RIR-T-13)', () => {
    const w3Row = (over: Partial<PendingInnovationRowV2> = {}) =>
      baseRow({
        result_id: 5000,
        result_code: 6000,
        source: 'API',
        lead_center_code: 'CTR-1',
        lead_center_name: 'Center One',
        // Must be ignored: a W3 result never reaches a developer or the SP MELIA.
        developer_text: 'Dev Zed <dev0@example.org>',
        ...over,
      });
    const mixed = (): Opts => {
      const rows = [
        baseRow({
          result_id: 1,
          result_code: 11,
          developer_text: 'Ann <ann@example.org>',
        }),
        // No developer -> MELIA summary of SP02, which has ann as MELIA focal point.
        baseRow({
          result_id: 2,
          result_code: 12,
          initiative_id: 2,
          initiative_code: 'SP02',
        }),
        w3Row(),
      ];
      return {
        rows,
        active: [
          { email: 'ann@example.org', name: 'Ann' },
          { email: 'dev0@example.org', name: 'Zed' },
        ],
        melia: [
          { initiative_id: 1, name: null, email: MELIA_EMAIL },
          { initiative_id: 2, name: null, email: 'Ann@Example.org' },
        ],
        centerMel: [
          { center_code: 'CTR-1', name: null, email: 'Mel1@Example.org' },
          { center_code: 'CTR-1', name: null, email: 'mel2@example.org' },
        ],
      };
    };
    const keys = (campaignRepo: any): string[] =>
      campaignRepo.insertLog.mock.calls.map((c: any[]) => c[0].message_key);
    const bodyOf = (call: any[]): string =>
      call[0].emailBody.message.socketFile;

    it('one address that is both a developer and an SP MELIA gets BOTH messages (distinct keys)', async () => {
      const { dispatcher, emailService, campaignRepo } = setup(mixed());
      const outcome = await dispatcher.dispatch(CAMPAIGN_ID);
      expect(keys(campaignRepo).sort()).toEqual([
        'CENTER:CTR-1',
        'DEVELOPER:ann@example.org',
        'MELIA_SUMMARY:2',
      ]);
      expect(emailService.sendEmail).toHaveBeenCalledTimes(3);
      const toAnn = emailService.sendEmail.mock.calls.filter(([m]: any[]) =>
        m.emailBody.to.includes('ann@example.org'),
      );
      expect(toAnn).toHaveLength(2);
      expect(outcome).toMatchObject({ sent: 3, skipped: 0, failed: 0 });
      expect(outcome.sentByType).toEqual({
        DEVELOPER: 1,
        MELIA_SUMMARY: 1,
        CENTER: 1,
      });
    });

    it('a retry skips by message_key: only the already-logged message is skipped', async () => {
      const { dispatcher, emailService, campaignRepo } = setup(mixed());
      campaignRepo.insertLog.mockImplementation((row: any) =>
        row.message_key === 'MELIA_SUMMARY:2'
          ? Promise.reject(dupError())
          : Promise.resolve(),
      );
      const outcome = await dispatcher.dispatch(CAMPAIGN_ID, {
        allowRetry: true,
      });
      expect(outcome).toMatchObject({ sent: 2, skipped: 1, failed: 0 });
      expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
      const bodies = emailService.sendEmail.mock.calls.map(bodyOf);
      expect(bodies.some((b) => b.startsWith(`[${T_MELIA}]`))).toBe(false);
      expect(outcome.sentByType).toEqual({
        DEVELOPER: 1,
        MELIA_SUMMARY: 0,
        CENTER: 1,
      });
    });

    it('selects the template by message type (developer by kind, summary, center) and fetches each once', async () => {
      const q4 = setup(mixed());
      await q4.dispatcher.dispatch(CAMPAIGN_ID);
      const bodies = q4.emailService.sendEmail.mock.calls.map(bodyOf);
      for (const name of [T_Q4, T_MELIA, T_CENTER]) {
        expect(bodies.filter((b) => b.startsWith(`[${name}]`))).toHaveLength(1);
      }
      expect(q4.templateRepo.findOne).toHaveBeenCalledTimes(3);

      const fin = setup({
        ...mixed(),
        kind: ReplicatedReminderKind.FINAL_REMINDER,
      });
      await fin.dispatcher.dispatch(CAMPAIGN_ID);
      const finBodies = fin.emailService.sendEmail.mock.calls.map(bodyOf);
      expect(finBodies.some((b) => b.startsWith(`[${T_FINAL}]`))).toBe(true);
      expect(finBodies.some((b) => b.startsWith(`[${T_Q4}]`))).toBe(false);
    });

    it('renders kindLabel, phaseYear and nextYear', async () => {
      const q4 = setup({ rows: makeRows(1) });
      await q4.dispatcher.dispatch(CAMPAIGN_ID);
      expect(bodyOf(q4.emailService.sendEmail.mock.calls[0])).toContain(
        'Q4 notice Name dev0 1 2026/2027',
      );
      const fin = setup({
        rows: makeRows(1),
        kind: ReplicatedReminderKind.FINAL_REMINDER,
      });
      await fin.dispatcher.dispatch(CAMPAIGN_ID);
      expect(bodyOf(fin.emailService.sendEmail.mock.calls[0])).toContain(
        'Final reminder Name dev0',
      );
    });

    it('passes per-result vars to the template (code, title, type, SP, url, developer text)', async () => {
      const originalUrl = process.env.RESULTS_URL;
      process.env.RESULTS_URL = 'https://prms.test/result/';
      const { dispatcher, emailService } = setup({
        rows: [
          baseRow({
            result_code: 77,
            title: 'My title',
            developer_text: 'Ann <ann@example.org>',
          }),
        ],
        active: [{ email: 'ann@example.org', name: 'Ann' }],
        templates: {
          [T_Q4]:
            '{{#each results}}{{resultCode}}|{{resultTitle}}|{{resultTypeName}}|{{spCode}}|{{spName}}|{{{resultUrl}}}|{{{developerText}}}{{/each}}',
        },
      });
      await dispatcher.dispatch(CAMPAIGN_ID);
      expect(bodyOf(emailService.sendEmail.mock.calls[0])).toMatch(
        /^77\|My title\|Innovation development\|SP01\|Short\|https:\/\/prms\.test\/result\/77\/general-information\?phase=42\|Ann <ann@example.org>$/,
      );
      process.env.RESULTS_URL = originalUrl;
    });

    it('a multi-address message is ONE email to all its To addresses (prod)', async () => {
      const { dispatcher, emailService, campaignRepo } = setup(mixed());
      await dispatcher.dispatch(CAMPAIGN_ID);
      const center = emailService.sendEmail.mock.calls.find(([m]: any[]) =>
        m.emailBody.to.includes('mel1@example.org'),
      )![0];
      expect(center.emailBody.to).toEqual([
        'mel1@example.org',
        'mel2@example.org',
      ]);
      expect(center.emailBody.cc).toEqual([]);
      const log = campaignRepo.insertLog.mock.calls
        .map((c: any[]) => c[0])
        .find((r: any) => r.message_key === 'CENTER:CTR-1');
      expect(log.recipient_email).toBe('mel1@example.org');
    });

    it('W3 is dispatched only to the center MEL (never to a developer or the SP MELIA)', async () => {
      const { dispatcher, emailService, campaignRepo } = setup({
        rows: [w3Row()],
        active: [{ email: 'dev0@example.org', name: 'Zed' }],
        centerMel: [
          { center_code: 'CTR-1', name: null, email: 'mel@example.org' },
        ],
      });
      await dispatcher.dispatch(CAMPAIGN_ID);
      expect(keys(campaignRepo)).toEqual(['CENTER:CTR-1']);
      const { emailBody } = emailService.sendEmail.mock.calls[0][0];
      expect(emailBody.to).toEqual(['mel@example.org']);
      expect(emailBody.cc).toEqual([]);
    });

    it('non-prod redirects EVERY message type to the test address, cc [], and logs the intended address, never the redirect', async () => {
      process.env.IS_PRODUCTION = 'false';
      const { dispatcher, emailService, campaignRepo } = setup(mixed());
      await dispatcher.dispatch(CAMPAIGN_ID);
      expect(emailService.sendEmail).toHaveBeenCalledTimes(3);
      for (const [msg] of emailService.sendEmail.mock.calls) {
        expect(msg.emailBody.to).toEqual([TEST_EMAIL]);
        expect(msg.emailBody.cc).toEqual([]);
      }
      const logs = campaignRepo.insertLog.mock.calls.map((c: any[]) => c[0]);
      expect(logs).toHaveLength(3);
      for (const log of logs) {
        expect(log.redirected).toBe(true);
        expect(log.recipient_email).not.toBe(TEST_EMAIL);
        expect(log.recipient_email).toBe(log.recipient_email.toLowerCase());
      }
      expect(logs.map((l: any) => l.recipient_email).sort()).toEqual([
        'ann@example.org',
        'ann@example.org',
        'mel1@example.org',
      ]);
      const bodies = emailService.sendEmail.mock.calls.map(bodyOf);
      expect(bodies.find((b) => b.startsWith(`[${T_CENTER}]`))).toContain(
        'mel1@example.org, mel2@example.org',
      );
      expect(bodies.find((b) => b.startsWith(`[${T_Q4}]`))).toContain(
        `ann@example.org | ${MELIA_EMAIL}`,
      );
    });

    it('a missing template of a type that has messages fails the run cleanly before any send', async () => {
      const { dispatcher, emailService, campaignRepo } = setup({
        ...mixed(),
        templates: { [T_CENTER]: null },
      });
      const outcome = await dispatcher.dispatch(CAMPAIGN_ID);
      expect(outcome.status).toBe(ReplicatedReminderStatus.FAILED);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(campaignRepo.insertLog).not.toHaveBeenCalled();
      expect(finalOf(campaignRepo).last_error).toContain(T_CENTER);
    });

    it('the same build path feeds a dry run: messages by type, no side effects', async () => {
      const { dispatcher, emailService, campaignRepo } = setup(mixed());
      const outcome = await dispatcher.dispatch(CAMPAIGN_ID, { dryRun: true });
      expect(outcome.messages!.map((m) => m.type).sort()).toEqual([
        'CENTER',
        'DEVELOPER',
        'MELIA_SUMMARY',
      ]);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(campaignRepo.insertLog).not.toHaveBeenCalled();
    });

    it('plan() looks up only what the rows need: type-7 W1/W2 developers, SP ids, lead centers', async () => {
      const { dispatcher, pendingRepo } = setup(mixed());
      const plan = await dispatcher.plan(42);
      expect(pendingRepo.findActiveUserEmails).toHaveBeenCalledWith([
        'ann@example.org',
      ]);
      expect(
        [...pendingRepo.findMeliaByInitiatives.mock.calls[0][0]].sort(),
      ).toEqual([1, 2]);
      expect(pendingRepo.findCenterMel).toHaveBeenCalledWith(['CTR-1']);
      expect(plan.rows).toHaveLength(3);
      expect(plan.messages).toHaveLength(3);
      expect(plan.unreachable).toEqual([]);
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

    it('a blank PRMS user name renders as "colleague"', async () => {
      const rows = makeRows(2);
      const { dispatcher, emailService } = setup({
        rows,
        active: [
          { email: 'dev0@example.org', name: '' },
          { email: 'dev1@example.org', name: '   ' },
        ],
        templates: { [T_Q4]: '<p>Dear {{leadName}},</p>' },
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
