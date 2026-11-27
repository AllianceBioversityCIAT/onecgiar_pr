// @akili-spec changes/rir-breeding-exclusion
// /akili-test backend-unit suite (independent of the author's TDD specs). Proves the negative
// constraints and migration semantics the author specs do not: RBX-R-1 (no unlisted row dropped,
// exclusion keyed on result_code only), RBX-R-3 (package link in its own phase, other rows keep
// result-detail, unknown base shape), RBX-R-5 (up/up/down/up of the exclusion + v3 migration),
// RBX-R-6 (one selection path), RBX-R-7 (lead contact routing edge cases) and RBX-R-8 (v4 render,
// v4 migration idempotency). Expected values are literals copied from requirements.md at commit
// 117b2de4a. Names, codes and addresses are invented except the sheet codes 24791 / 28580.
import * as handlebars from 'handlebars';
import { RIRBreedingExclusionCopyV31793600000000 } from '../../migrations/1793600000000-RIR-BreedingExclusionCopyV3';
import { RIRCopyV4NoBreedingNote1793700000000 } from '../../migrations/1793700000000-RIR-CopyV4NoBreedingNote';
import {
  build,
  BuildInput,
  PendingInnovationRowV2,
  ReminderMessage,
} from './digest-builder';
import { ReplicatedReminderKind } from './entities/replicated-innovation-reminder-campaign.entity';
import {
  buildResultUrl,
  ReminderDispatcher,
} from './reminder-dispatcher.service';
import { PendingInnovationRepository } from './repositories/pending-innovation.repository';
import {
  RIR_CENTER_TEMPLATE_NAME,
  RIR_FINAL_TEMPLATE_NAME,
  RIR_MELIA_TEMPLATE_NAME,
  RIR_Q4_TEMPLATE_NAME,
  buildRirTemplatesV2,
  buildRirTemplatesV3,
  buildRirTemplatesV4,
} from './templates/rir-template-copy';

const ALL_NAMES = [
  RIR_Q4_TEMPLATE_NAME,
  RIR_FINAL_TEMPLATE_NAME,
  RIR_MELIA_TEMPLATE_NAME,
  RIR_CENTER_TEMPLATE_NAME,
];

const row = (
  over: Partial<PendingInnovationRowV2> = {},
): PendingInnovationRowV2 => ({
  result_id: 1,
  result_code: 100,
  title: 'Result',
  result_type_id: 7,
  version_id: 50,
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

const input = (over: Partial<BuildInput> = {}): BuildInput => ({
  rows: [],
  activeUsers: new Map(),
  meliaByInitiative: new Map(),
  centerMelByCenter: new Map(),
  optedInCenters: new Set(),
  ...over,
});

const mel = (...emails: string[]) =>
  emails.map((email) => ({ name: null, email }));

const idsOf = (messages: ReminderMessage[]) =>
  messages.flatMap((m) => m.results.map((r) => r.result_id));

// ---------------------------------------------------------------------------------------------
// RBX-R-1 — exclusion list
// ---------------------------------------------------------------------------------------------
describe('RBX-R-1 exclusion (tester)', () => {
  const findPendingSql = async (rows: any[] = []) => {
    const dataSource = { query: jest.fn().mockResolvedValue(rows) };
    const repo = new PendingInnovationRepository(dataSource as any);
    const out = await repo.findPending(42);
    const sql: string = dataSource.query.mock.calls[0][0].replace(/\s+/g, ' ');
    return { out, sql, params: dataSource.query.mock.calls[0][1] };
  };

  it('the exclusion sub-select has exactly two predicates: same result_code and active entry', async () => {
    const { sql } = await findPendingSql();
    const block =
      /NOT EXISTS \( SELECT 1 FROM replicated_innovation_reminder_exclusion x WHERE (.*?) \)/.exec(
        sql,
      );
    expect(block).not.toBeNull();
    // Nothing on type, source, phase, center or opt-in: the entry excludes "whatever" the row is,
    // and an inactive entry (is_active = 0) excludes nothing.
    expect(block![1].trim()).toBe(
      'x.result_code = r.result_code AND x.is_active = 1',
    );
  });

  it('no codes are hard-coded in the selection (the list lives only in the table)', async () => {
    const { sql, params } = await findPendingSql();
    expect(sql).not.toMatch(/24791|28580/);
    expect(sql).not.toMatch(/result_code\s+NOT\s+IN/i);
    expect(params).toEqual([42, 42]);
  });

  it('must NOT drop any row the query returns: the mapper keeps every unlisted row', async () => {
    const dbRows = [
      { result_id: 1, result_code: 501, result_type_id: 7, version_id: 42 },
      { result_id: 2, result_code: 502, result_type_id: 2, version_id: 42 },
      { result_id: 3, result_code: 503, result_type_id: 10, version_id: 9 },
    ].map((r) => ({
      ...r,
      initiative_id: 1,
      initiative_code: 'SP01',
      title: 't',
    }));
    const { out } = await findPendingSql(dbRows);
    expect(out.map((r) => r.result_code)).toEqual([501, 502, 503]);
  });

  it('must NOT drop any unlisted row in build: every pending result lands in exactly one message or the unreachable list', () => {
    const rows = [
      row({ result_id: 1, result_code: 1, developer_text: 'A <a@x.org>' }),
      row({ result_id: 2, result_code: 2, result_type_id: 2 }),
      row({
        result_id: 3,
        result_code: 3,
        result_type_id: 10,
        lead_email: 'l@x.org',
      }),
      row({ result_id: 4, result_code: 4, result_type_id: 10 }),
      row({
        result_id: 5,
        result_code: 5,
        source: 'API',
        lead_center_code: 'C1',
      }),
      row({ result_id: 6, result_code: 6, source: 'API' }),
      row({
        result_id: 7,
        result_code: 7,
        initiative_id: 2,
        initiative_code: 'SP02',
      }),
    ];
    const out = build(
      input({
        rows,
        activeUsers: new Map([['a@x.org', { name: 'A' }]]),
        meliaByInitiative: new Map([[1, mel('m1@x.org')]]),
        centerMelByCenter: new Map([['C1', mel('c1@x.org')]]),
      }),
    );
    const listed = [
      ...idsOf(out.messages),
      ...out.unreachable.map((u) => u.result_id),
    ];
    expect(listed.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(listed).size).toBe(listed.length);
  });
});

// ---------------------------------------------------------------------------------------------
// RBX-R-2 — selection shape (type 10 only from IPSR, types 2/7 only from the bound phase)
// ---------------------------------------------------------------------------------------------
describe('RBX-R-2 selection shape (tester)', () => {
  it('branch A never admits type 10 and branch B admits only type 10 from IPSR (app_module_id = 2)', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([]) };
    await new PendingInnovationRepository(dataSource as any).findPending(42);
    const sql: string = dataSource.query.mock.calls[0][0].replace(/\s+/g, ' ');
    expect(sql).toContain('(r.version_id = ? AND r.result_type_id IN (2, 7))');
    expect(sql).toMatch(
      /OR \( r\.result_type_id = 10 AND r\.version_id IN \( SELECT ipv\.id FROM version ipv INNER JOIN version rpv ON rpv\.id = \? WHERE ipv\.app_module_id = 2 AND ipv\.is_active = 1 AND ipv\.status = 1 AND ipv\.phase_year = rpv\.phase_year \) \)/,
    );
    // Replicated + Editing + active apply to both branches (outside the OR group).
    const afterGroup = sql.slice(
      sql.indexOf('ipv.phase_year = rpv.phase_year'),
    );
    expect(afterGroup).toMatch(
      /\) \) \) AND r\.is_replicated = 1 AND r\.status_id = 1 AND r\.is_active = 1 AND NOT EXISTS/,
    );
  });
});

// ---------------------------------------------------------------------------------------------
// RBX-R-3 — package presentation
// ---------------------------------------------------------------------------------------------
describe('RBX-R-3 package link (tester)', () => {
  it.each([
    // Unknown shapes -> result-detail form (no guessing).
    [
      'https://x/results/',
      'https://x/results/9001/general-information?phase=9',
    ],
    [
      'https://x/result/result-detail/extra/',
      'https://x/result/result-detail/extra/9001/general-information?phase=9',
    ],
  ])(
    'type 10 with unknown base %s keeps the result-detail form',
    (base, expected) => {
      expect(buildResultUrl(base, 10, 9001, 9)).toBe(expected);
    },
  );

  it('the host and any prefix path are kept when the base matches', () => {
    expect(
      buildResultUrl(
        'https://reporting.example/app/result/result-detail/',
        10,
        9001,
        9,
      ),
    ).toBe(
      'https://reporting.example/app/ipsr/detail/9001/general-information?phase=9',
    );
  });

  it('an Innovation development row never gets the ipsr path', () => {
    expect(buildResultUrl('https://x/result/result-detail/', 7, 9001, 9)).toBe(
      'https://x/result/result-detail/9001/general-information?phase=9',
    );
  });
});

// ---------------------------------------------------------------------------------------------
// RBX-R-7 — Innovation package to its Lead contact person (negative / edge constraints)
// ---------------------------------------------------------------------------------------------
describe('RBX-R-7 lead contact routing (tester)', () => {
  const pkg = (over: Partial<PendingInnovationRowV2> = {}) =>
    row({ result_type_id: 10, developer_text: null, ...over });

  it('lead also develops a type-7 of another SP: ONE email with both rows, CC = MELIA of both SPs, lead not in its own CC', () => {
    const out = build(
      input({
        rows: [
          pkg({
            result_id: 1,
            result_code: 10,
            lead_email: 'LIA@x.org',
            lead_name: 'Lia AD',
          }),
          row({
            result_id: 2,
            result_code: 20,
            initiative_id: 2,
            initiative_code: 'SP02',
            developer_text: 'Lia <lia@x.org>',
          }),
        ],
        activeUsers: new Map([['lia@x.org', { name: 'Lia PRMS' }]]),
        // Lia is herself a MELIA of SP02.
        meliaByInitiative: new Map([
          [1, mel('m1@x.org', 'm2@x.org')],
          [2, mel('lia@x.org', 'm3@x.org')],
        ]),
      }),
    );
    expect(out.unreachable).toEqual([]);
    expect(out.messages).toHaveLength(1);
    const [m] = out.messages;
    expect(m.messageKey).toBe('DEVELOPER:lia@x.org');
    expect(m.to).toEqual(['lia@x.org']);
    expect(m.cc).toEqual(['m1@x.org', 'm2@x.org', 'm3@x.org']);
    expect(m.results.map((r) => r.result_id).sort()).toEqual([1, 2]);
    expect(m.greetingName).toBe('Lia PRMS');
  });

  it('a package sent to its lead contact is NOT also listed in the SP MELIA summary', () => {
    const out = build(
      input({
        rows: [
          pkg({ result_id: 1, lead_email: 'lia@x.org', lead_name: 'Lia' }),
          row({ result_id: 2, result_code: 200, result_type_id: 2 }),
        ],
        meliaByInitiative: new Map([[1, mel('m1@x.org')]]),
      }),
    );
    const summary = out.messages.find((m) => m.type === 'MELIA_SUMMARY');
    expect(summary!.results.map((r) => r.result_id)).toEqual([2]);
    const dev = out.messages.find((m) => m.type === 'DEVELOPER');
    expect(dev!.results.map((r) => r.result_id)).toEqual([1]);
    expect(dev!.cc).toEqual(['m1@x.org']);
  });

  it('two packages with the same lead contact (case differs) -> one email, never two', () => {
    const out = build(
      input({
        rows: [
          pkg({ result_id: 1, result_code: 10, lead_email: 'Lia@X.org' }),
          pkg({ result_id: 2, result_code: 20, lead_email: ' lia@x.org' }),
        ],
      }),
    );
    expect(out.messages.map((m) => m.messageKey)).toEqual([
      'DEVELOPER:lia@x.org',
    ]);
    expect(out.messages[0].results).toHaveLength(2);
  });

  it('a W3 package goes to its Center, not to its lead contact', () => {
    const out = build(
      input({
        rows: [
          pkg({
            source: 'API',
            lead_email: 'lia@x.org',
            lead_center_code: 'C1',
          }),
        ],
        centerMelByCenter: new Map([['C1', mel('c1@x.org')]]),
      }),
    );
    expect(out.messages.map((m) => [m.type, m.to])).toEqual([
      ['CENTER', ['c1@x.org']],
    ]);
  });

  it('opted-in Center wins over the lead contact, and the lead gets no email at all', () => {
    const out = build(
      input({
        rows: [pkg({ lead_email: 'lia@x.org', lead_center_code: ' C1 ' })],
        optedInCenters: new Set(['C1']),
        centerMelByCenter: new Map([['C1', mel('c1@x.org')]]),
        meliaByInitiative: new Map([[1, mel('m1@x.org')]]),
      }),
    );
    expect(out.messages.every((m) => !m.to.includes('lia@x.org'))).toBe(true);
    expect(out.messages.every((m) => !m.cc.includes('lia@x.org'))).toBe(true);
    expect(out.messages.map((m) => m.type)).toEqual(['CENTER']);
  });

  it('NO_MELIA fallback: no lead address and no SP MELIA -> unreachable, never a developer email', () => {
    const out = build(
      input({ rows: [pkg({ lead_email: null, lead_name: 'Ghost' })] }),
    );
    expect(out.messages).toEqual([]);
    expect(out.unreachable.map((u) => [u.result_id, u.reason])).toEqual([
      [1, 'NO_MELIA'],
    ]);
  });

  it('a lead contact with no PRMS account and no AD name is greeted "colleague"', () => {
    const out = build(
      input({ rows: [pkg({ lead_email: 'lia@x.org', lead_name: '  ' })] }),
    );
    expect(out.messages[0].greetingName).toBe('colleague');
  });
});

// ---------------------------------------------------------------------------------------------
// Dispatcher: RBX-R-3 in a real render path, RBX-R-6 one selection, RBX-R-7 end to end
// ---------------------------------------------------------------------------------------------
describe('ReminderDispatcher (tester)', () => {
  const T_CENTER = 'email_template_replicated_innovation_center';
  const T_Q4 = 'email_template_replicated_innovation_q4_notice';

  function setup(
    rows: PendingInnovationRowV2[],
    templates: Record<string, string> = {},
  ) {
    const campaignRepo = {
      claim: jest.fn().mockResolvedValue(true),
      findWithPhase: jest.fn().mockResolvedValue({
        id: 7,
        version_id: 42,
        kind: ReplicatedReminderKind.Q4_NOTICE,
        obj_version: { phase_name: 'Reporting 2026', phase_year: 2026 },
      }),
      finalize: jest.fn().mockResolvedValue(true),
      insertLog: jest.fn().mockResolvedValue(undefined),
    };
    const pendingRepo = {
      findPending: jest.fn().mockResolvedValue(rows),
      findActiveUserEmails: jest
        .fn()
        .mockImplementation((emails: string[]) =>
          Promise.resolve(
            emails.map((email) => ({ email, name: `Name ${email}` })),
          ),
        ),
      findMeliaByInitiatives: jest
        .fn()
        .mockResolvedValue([
          { initiative_id: 1, name: null, email: 'melia@x.org' },
        ]),
      findCenterMel: jest
        .fn()
        .mockResolvedValue([
          { center_code: 'C1', name: null, email: 'c1@x.org' },
        ]),
      findOptedInCenters: jest.fn().mockResolvedValue([]),
    };
    const templateRepo = {
      findOne: jest.fn(({ where }) =>
        Promise.resolve({
          template: templates[where.name] ?? '{{resultCount}}',
        }),
      ),
    };
    const globalParamRepo = {
      findOne: jest.fn(({ where }) =>
        Promise.resolve(
          where.name === 'rir_test_recipient_email'
            ? { value: 'tester@x.org' }
            : null,
        ),
      ),
    };
    const emailService = {
      sendEmail: jest.fn(),
      addLabel: jest.fn().mockReturnValue('[PRMS]'),
    };
    const dispatcher = new ReminderDispatcher(
      campaignRepo as any,
      pendingRepo as any,
      templateRepo as any,
      globalParamRepo as any,
      emailService as any,
    );
    jest.spyOn(dispatcher as any, 'sleep').mockResolvedValue(undefined);
    return { dispatcher, pendingRepo, emailService };
  }

  // The dispatcher reads `env` from node:process (same object): mutate it, restore after.
  const saved = {
    IS_PRODUCTION: process.env.IS_PRODUCTION,
    RESULTS_URL: process.env.RESULTS_URL,
  };
  beforeEach(() => {
    process.env.IS_PRODUCTION = 'true';
    process.env.RESULTS_URL = 'https://x/result/result-detail/';
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('RBX-R-3: a Center email links the package to IPSR in the package own phase, the type-7 row to result-detail', async () => {
    const { dispatcher, emailService } = setup(
      [
        row({
          result_id: 1,
          result_code: 9001,
          result_type_id: 10,
          version_id: 9,
          source: 'API',
          lead_center_code: 'C1',
        }),
        row({
          result_id: 2,
          result_code: 9002,
          result_type_id: 7,
          version_id: 42,
          source: 'API',
          lead_center_code: 'C1',
        }),
      ],
      {
        [T_CENTER]:
          '{{#each results}}{{resultTypeName}}|{{{resultUrl}}};{{/each}}',
      },
    );
    await dispatcher.dispatch(7);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    const body =
      emailService.sendEmail.mock.calls[0][0].emailBody.message.socketFile;
    expect(body).toBe(
      'Innovation package|https://x/ipsr/detail/9001/general-information?phase=9;' +
        'Innovation development|https://x/result/result-detail/9002/general-information?phase=42;',
    );
  });

  it('RBX-R-3: with an unknown RESULTS_URL shape the package uses the result-detail form', async () => {
    process.env.RESULTS_URL = 'https://x/results/';
    const { dispatcher, emailService } = setup(
      [
        row({
          result_code: 9001,
          result_type_id: 10,
          version_id: 9,
          lead_email: 'lia@x.org',
        }),
      ],
      { [T_Q4]: '{{#each results}}{{{resultUrl}}}{{/each}}' },
    );
    await dispatcher.dispatch(7);
    expect(
      emailService.sendEmail.mock.calls[0][0].emailBody.message.socketFile,
    ).toBe('https://x/results/9001/general-information?phase=9');
  });

  it('RBX-R-6: dry run and real dispatch read the selection once each through plan(campaign version)', async () => {
    const rows = [row({ developer_text: 'A <a@x.org>' })];
    const { dispatcher, pendingRepo } = setup(rows);
    const plan = jest.spyOn(dispatcher, 'plan');
    await dispatcher.dispatch(7, { dryRun: true });
    await dispatcher.dispatch(7);
    expect(plan.mock.calls).toEqual([[42], [42]]);
    expect(pendingRepo.findPending.mock.calls).toEqual([[42], [42]]);
  });

  it('RBX-R-7 end to end (prod): lead contact who also develops a type-7 gets ONE email with both rows and the MELIA in copy', async () => {
    const { dispatcher, emailService } = setup(
      [
        row({
          result_id: 1,
          result_code: 10,
          result_type_id: 10,
          lead_email: 'lia@x.org',
          lead_name: 'Lia AD',
        }),
        row({
          result_id: 2,
          result_code: 20,
          developer_text: 'Lia <lia@x.org>',
        }),
      ],
      { [T_Q4]: '{{leadName}}|{{resultCount}}' },
    );
    await dispatcher.dispatch(7);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    const { emailBody } = emailService.sendEmail.mock.calls[0][0];
    expect(emailBody.to).toEqual(['lia@x.org']);
    expect(emailBody.cc).toEqual(['melia@x.org']);
    expect(emailBody.message.socketFile).toBe('Name lia@x.org|2');
  });
});

// ---------------------------------------------------------------------------------------------
// RBX-R-8 / RBX-R-4 — v4 render
// ---------------------------------------------------------------------------------------------
describe('RBX-R-8 v4 render (tester)', () => {
  const v3 = buildRirTemplatesV3();
  const v4 = buildRirTemplatesV4();
  const DISCLAIMER =
    '<p class="disclaimer">This is an automated message from the CGIAR PRMS system. Please do not reply directly to this email.</p>';
  const data = {
    kindLabel: 'Final reminder',
    leadName: 'Ana',
    centerName: 'Test Center',
    spCode: 'SP09',
    spName: 'Neutral',
    phaseYear: 2026,
    previousYear: 2025,
    nextYear: 2027,
    nextNextYear: 2028,
    resultCount: 1,
    results: [
      {
        resultCode: 9001,
        resultUrl: 'https://x/ipsr/detail/9001/general-information?phase=9',
        resultTitle: 'Pkg',
        resultTypeName: 'Innovation package',
        spCode: 'SP09',
        spName: 'Neutral',
        developerText: 'Ana',
      },
    ],
  };
  const render = (name: string, extra: Record<string, unknown> = {}) =>
    handlebars.compile(v4[name])({ ...data, ...extra });

  const DEV_PARAGRAPHS = [
    '<p>For existing innovations that received active investment in 2026, you only need to update what has changed. All other existing data will be pre-filled for you to review, so this should not take much of your time.</p>',
    "<p>For existing innovations that did not receive investment in 2026, or were stopped or put on hold, you can set the status to 'Inactive' and give the reason for discontinuation.</p>",
    "<p>If you do not update your innovation results, PRMS will automatically close them with the status 'Inactive – not updated' at the end of January 2027. You can reopen and update an innovation in any later reporting phase (2027, 2028 and beyond).</p>",
    '<p>This update helps CGIAR keep its innovation records current and monitor their progress over the years. Thank you for your contribution to this process; it is much appreciated.</p>',
    DISCLAIMER,
  ];
  const CENTER_PARAGRAPHS = [
    '<p>For the innovations listed above that received active investment in 2026, you only need to update what has changed. All other existing data will be pre-filled for you to review, so the update should not take much time.</p>',
    "<p>For listed innovations that did not receive investment in 2026, or were stopped or put on hold, you can set the status to 'Inactive' and provide the reason for discontinuation.</p>",
    "<p>If the innovations listed above are not updated, PRMS will automatically close them with the status 'Inactive – not updated' in mid-February 2027. You can reopen and update an innovation in any later reporting phase (2027, 2028 and beyond).</p>",
    '<p>Keeping these records updated helps CGIAR maintain current information on its innovations and monitor their progress over time. Thank you for your contribution to this process; it is much appreciated.</p>',
    DISCLAIMER,
  ];

  /** The tail after the results table is exactly these paragraphs, in order, nothing in between. */
  const tailParagraphs = (html: string) =>
    html
      .slice(html.indexOf('</table>\n') + '</table>\n'.length)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('<p'));

  it.each([
    RIR_Q4_TEMPLATE_NAME,
    RIR_FINAL_TEMPLATE_NAME,
    RIR_MELIA_TEMPLATE_NAME,
  ])(
    '%s: tail is exactly the four v3 developer paragraphs + disclaimer, no breeding paragraph',
    (name) => {
      expect(tailParagraphs(render(name))).toEqual(DEV_PARAGRAPHS);
    },
  );

  it('Center: tail is exactly the four v3 Center paragraphs + disclaimer; intro and SP header keep the years', () => {
    const html = render(RIR_CENTER_TEMPLATE_NAME);
    expect(tailParagraphs(html)).toEqual(CENTER_PARAGRAPHS);
    expect(html).toContain('reported in 2025');
    expect(html).toContain('during the 2026 reporting period');
    expect(html).toContain(
      '<th>Science Program / Accelerator who has approved the result in 2025</th>',
    );
  });

  it.each(ALL_NAMES)(
    // Handlebars escapes '=' in {{resultUrl}} as &#x3D; (an HTML parser decodes it back).
    '%s: redirect notice, kind label, disclaimer and linked Result ID survive in v4',
    (name) => {
      const html = render(name, {
        intendedTo: 'owner@x.org',
        intendedCc: 'copy@x.org',
      });
      expect(html).toContain('<div class="redirect-notice">');
      expect(html).toContain('<span class="fw-600">owner@x.org</span>');
      expect(html).toContain('<p class="kind">Final reminder</p>');
      expect(html).toContain(DISCLAIMER);
      expect(html).toContain(
        '<td><a class="link" href="https://x/ipsr/detail/9001/general-information?phase&#x3D;9">9001</a></td>',
      );
      expect(html).toContain('Pkg</a> · Innovation package');
    },
  );

  it.each(ALL_NAMES)(
    '%s: rendered with a neutral SP, v4 says nothing about breeding, varieties or B4T',
    (name) => {
      const html = render(name);
      expect(html).not.toMatch(/breeding|varieties|Breeding for Tomorrow|B4T/i);
    },
  );

  it.each(ALL_NAMES)('%s: v4 is v3 with ONE contiguous cut', (name) => {
    const a = v3[name];
    const b = v4[name];
    let p = 0;
    while (p < b.length && a[p] === b[p]) p++;
    let s = 0;
    while (s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
    expect(p + s).toBe(b.length);
    expect(a.slice(p, a.length - s)).toMatch(/breeding lines/);
  });

  it('building v4 does not alter v3 (the down target stays frozen)', () => {
    const before = buildRirTemplatesV3();
    buildRirTemplatesV4();
    expect(buildRirTemplatesV3()).toEqual(before);
  });
});

// ---------------------------------------------------------------------------------------------
// RBX-R-5 / RBX-R-1 seed / RBX-R-8 migrations — in-memory QueryRunner
// ---------------------------------------------------------------------------------------------

/** Minimal MySQL model: the `template` table by name and the exclusion table with INSERT IGNORE. */
class FakeDb {
  templates = new Map<string, string>();
  exclusion: Map<number, { reason: string; is_active: number }> | null = null;
  statements: { sql: string; params: unknown[] }[] = [];

  async query(sql: string, params: unknown[] = []): Promise<unknown> {
    const text = sql.replace(/\s+/g, ' ').trim();
    this.statements.push({ sql: text, params });
    if (
      /^CREATE TABLE IF NOT EXISTS `replicated_innovation_reminder_exclusion`/.test(
        text,
      )
    ) {
      if (!this.exclusion) this.exclusion = new Map();
    } else if (
      /^INSERT IGNORE INTO `replicated_innovation_reminder_exclusion`/.test(
        text,
      )
    ) {
      if (!this.exclusion) throw new Error('ER_NO_SUCH_TABLE');
      for (let i = 0; i < params.length; i += 2) {
        const code = params[i] as number;
        if (!this.exclusion.has(code)) {
          this.exclusion.set(code, {
            reason: params[i + 1] as string,
            is_active: 1,
          });
        }
      }
    } else if (
      /^DROP TABLE IF EXISTS `replicated_innovation_reminder_exclusion`/.test(
        text,
      )
    ) {
      this.exclusion = null;
    } else if (
      /^UPDATE `template` SET `template` = \?, last_updated_date = CURRENT_TIMESTAMP WHERE name = \?;$/.test(
        text,
      )
    ) {
      const [body, name] = params as string[];
      if (this.templates.has(name)) this.templates.set(name, body);
    } else {
      throw new Error(`FakeDb: unexpected statement ${text.slice(0, 80)}`);
    }
    return [];
  }
}

const OTHER_TEMPLATE = 'email_template_unrelated';
const seedV2 = () => {
  const db = new FakeDb();
  const v2 = buildRirTemplatesV2();
  for (const name of ALL_NAMES) db.templates.set(name, v2[name]);
  db.templates.set(OTHER_TEMPLATE, 'untouched body');
  return db;
};

describe('RBX-R-5 migration 1793600000000 up/down/up (tester)', () => {
  const m = new RIRBreedingExclusionCopyV31793600000000();
  const v2 = buildRirTemplatesV2();
  const v3 = buildRirTemplatesV3();
  const expectBodies = (db: FakeDb, bodies: Record<string, string>) => {
    for (const name of ALL_NAMES)
      expect(db.templates.get(name)).toBe(bodies[name]);
    expect(db.templates.get(OTHER_TEMPLATE)).toBe('untouched body');
  };

  it('up, up, down, up: 114 rows and v3 after each up; table gone and v2 byte for byte after down', async () => {
    const db = seedV2();
    await m.up(db as any);
    expect(db.exclusion!.size).toBe(114);
    expectBodies(db, v3);

    await m.up(db as any);
    expect(db.exclusion!.size).toBe(114); // not 228
    expectBodies(db, v3);

    await m.down(db as any);
    expect(db.exclusion).toBeNull();
    expectBodies(db, v2);

    await m.up(db as any);
    expect(db.exclusion!.size).toBe(114);
    expectBodies(db, v3);
  });

  it('seeds the sheet codes 24791 and 28580 active, with a reason naming SR-167303', async () => {
    const db = seedV2();
    await m.up(db as any);
    for (const code of [24791, 28580]) {
      expect(db.exclusion!.get(code)).toEqual({
        reason: expect.stringContaining('SR-167303'),
        is_active: 1,
      });
    }
  });

  it('re-running up never re-activates an entry an admin switched off', async () => {
    const db = seedV2();
    await m.up(db as any);
    db.exclusion!.get(24791)!.is_active = 0;
    await m.up(db as any);
    expect(db.exclusion!.get(24791)!.is_active).toBe(0);
  });

  it('binds every code and the reason as parameters (none interpolated into the SQL text)', async () => {
    const db = seedV2();
    await m.up(db as any);
    const insert = db.statements.find((s) =>
      s.sql.startsWith('INSERT IGNORE'),
    )!;
    expect(insert.params).toHaveLength(228);
    expect(insert.sql).not.toMatch(/\d{3,}/);
  });

  it('down rewrites the bodies before dropping the table, and touches only the four RIR rows', async () => {
    const db = seedV2();
    await m.up(db as any);
    db.statements = [];
    await m.down(db as any);
    const kinds = db.statements.map((s) =>
      s.sql.startsWith('UPDATE') ? 'UPDATE' : 'DROP',
    );
    expect(kinds).toEqual(['UPDATE', 'UPDATE', 'UPDATE', 'UPDATE', 'DROP']);
    expect(
      db.statements
        .slice(0, 4)
        .map((s) => s.params[1])
        .sort(),
    ).toEqual([...ALL_NAMES].sort());
  });
});

describe('RBX-R-8 migration 1793700000000 (tester)', () => {
  const v3m = new RIRBreedingExclusionCopyV31793600000000();
  const v4m = new RIRCopyV4NoBreedingNote1793700000000();
  const v2 = buildRirTemplatesV2();
  const v3 = buildRirTemplatesV3();
  const v4 = buildRirTemplatesV4();

  it('chain v2 -> 1793600 up -> 1793700 up (twice) -> down -> down restores v3 then v2 byte for byte', async () => {
    const db = seedV2();
    await v3m.up(db as any);
    await v4m.up(db as any);
    await v4m.up(db as any);
    for (const name of ALL_NAMES) expect(db.templates.get(name)).toBe(v4[name]);
    expect(db.exclusion!.size).toBe(114); // breeding results stay excluded under v4

    await v4m.down(db as any);
    for (const name of ALL_NAMES) expect(db.templates.get(name)).toBe(v3[name]);
    expect(db.exclusion!.size).toBe(114);

    await v3m.down(db as any);
    for (const name of ALL_NAMES) expect(db.templates.get(name)).toBe(v2[name]);
    expect(db.templates.get(OTHER_TEMPLATE)).toBe('untouched body');
  });

  it('the v4 migration issues only four by-name template UPDATEs (no exclusion-table statement)', async () => {
    const db = seedV2();
    await v3m.up(db as any);
    db.statements = [];
    await v4m.up(db as any);
    await v4m.down(db as any);
    expect(db.statements).toHaveLength(8);
    expect(
      db.statements.every((s) => s.sql.startsWith('UPDATE `template`')),
    ).toBe(true);
    expect(db.statements.some((s) => /exclusion/.test(s.sql))).toBe(false);
  });
});
