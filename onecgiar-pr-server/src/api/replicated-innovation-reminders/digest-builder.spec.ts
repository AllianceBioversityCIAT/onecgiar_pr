// @akili-spec changes/replicated-innovation-reminders
// RIR-T-12: revision-2 message builder (RIR-R-2, R-3, R-4, R-17). Names and emails are invented.
import { build, BuildInput, PendingInnovationRowV2 } from './digest-builder';

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
  initiative_short_name: 'Breeding',
  lead_email: null,
  lead_name: null,
  lead_contact_person: null,
  source: 'W1/W2',
  developer_text: null,
  lead_center_code: null,
  lead_center_name: null,
  ...over,
});

const users = (...emails: string[]): Map<string, { name: string }> =>
  new Map(emails.map((e) => [e, { name: `User ${e.split('@')[0]}` }]));

const input = (over: Partial<BuildInput> = {}): BuildInput => ({
  rows: [],
  activeUsers: new Map(),
  meliaByInitiative: new Map(),
  centerMelByCenter: new Map(),
  ...over,
});

const mel = (...emails: string[]) =>
  emails.map((email) => ({ name: null, email }));

describe('build (RIR-T-12)', () => {
  describe('developer digests (RIR-R-2)', () => {
    it('one digest per developer listing every result (A, B, G), ordered by SP then code', () => {
      const out = build(
        input({
          rows: [
            row({
              result_id: 3,
              result_code: 700,
              initiative_id: 4,
              initiative_code: 'SP04',
              title: 'G',
              developer_text: 'Vera <v@x.org>',
            }),
            row({
              result_id: 2,
              result_code: 200,
              title: 'B',
              developer_text: 'Vera <v@x.org>',
            }),
            row({
              result_id: 1,
              result_code: 100,
              title: 'A',
              developer_text: 'Vera <v@x.org>',
            }),
          ],
          activeUsers: users('v@x.org'),
        }),
      );
      expect(out.messages).toHaveLength(1);
      const m = out.messages[0];
      expect(m.type).toBe('DEVELOPER');
      expect(m.messageKey).toBe('DEVELOPER:v@x.org');
      expect(m.to).toEqual(['v@x.org']);
      expect(m.results.map((r) => r.title)).toEqual(['A', 'B', 'G']);
      expect(m.results[0].developerText).toBe('Vera <v@x.org>');
      expect(out.unreachable).toEqual([]);
    });

    it('a result with several reachable developers appears in each digest', () => {
      const out = build(
        input({
          rows: [
            row({
              developer_text:
                '1. Vera <v1@x.org> (Main contact) 2. Wes <V2@x.org>',
            }),
          ],
          activeUsers: users('v1@x.org', 'v2@x.org'),
        }),
      );
      expect(out.messages.map((m) => m.messageKey)).toEqual([
        'DEVELOPER:v1@x.org',
        'DEVELOPER:v2@x.org',
      ]);
      out.messages.forEach((m) => expect(m.results).toHaveLength(1));
    });

    it('greets by the matched PRMS user name and falls back to colleague (A5)', () => {
      const out = build(
        input({
          rows: [row({ developer_text: 'Written Name <v@x.org>' })],
          activeUsers: new Map([['v@x.org', { name: 'Vera Account' }]]),
        }),
      );
      expect(out.messages[0].greetingName).toBe('Vera Account');
      const blank = build(
        input({
          rows: [row({ developer_text: 'v@x.org' })],
          activeUsers: new Map([['v@x.org', { name: '  ' }]]),
        }),
      );
      expect(blank.messages[0].greetingName).toBe('colleague');
    });

    it('falsifier: sends one email per developer, not per result', () => {
      const rows = [1, 2, 3, 4].map((i) =>
        row({ result_id: i, result_code: i, developer_text: 'v@x.org' }),
      );
      const out = build(input({ rows, activeUsers: users('v@x.org') }));
      expect(out.messages.filter((m) => m.type === 'DEVELOPER')).toHaveLength(
        1,
      );
    });
  });

  describe('CC (RIR-R-3)', () => {
    it('is the union of MELIA of the owning SPs, deduped, case-folded', () => {
      const out = build(
        input({
          rows: [
            row({ result_id: 1, developer_text: 'v@x.org' }),
            row({
              result_id: 2,
              result_code: 700,
              initiative_id: 4,
              initiative_code: 'SP04',
              developer_text: 'v@x.org',
            }),
          ],
          activeUsers: users('v@x.org'),
          meliaByInitiative: new Map([
            [1, mel('m1@x.org', 'Shared@x.org')],
            [4, mel('shared@x.org', 'm4@x.org')],
          ]),
        }),
      );
      expect(out.messages[0].cc).toEqual([
        'm1@x.org',
        'm4@x.org',
        'shared@x.org',
      ]);
    });

    it('falsifier: never repeats the To address in CC', () => {
      const out = build(
        input({
          rows: [row({ developer_text: 'v@x.org' })],
          activeUsers: users('v@x.org'),
          meliaByInitiative: new Map([[1, mel('V@x.org', 'm@x.org')]]),
        }),
      );
      expect(out.messages[0].to).toEqual(['v@x.org']);
      expect(out.messages[0].cc).toEqual(['m@x.org']);
    });

    it('still sends when an owning SP has no MELIA (empty CC)', () => {
      const out = build(
        input({
          rows: [row({ developer_text: 'v@x.org' })],
          activeUsers: users('v@x.org'),
        }),
      );
      expect(out.messages[0].cc).toEqual([]);
    });
  });

  describe('MELIA summary (RIR-R-4)', () => {
    it('empty field, null field and name-only results of an SP go in ONE summary', () => {
      const out = build(
        input({
          rows: [
            row({ result_id: 1, result_code: 1, developer_text: '' }),
            row({ result_id: 2, result_code: 2, developer_text: null }),
            row({ result_id: 3, result_code: 3, developer_text: 'Juan Ruiz' }),
          ],
          meliaByInitiative: new Map([[1, mel('M@x.org', 'm2@x.org')]]),
        }),
      );
      expect(out.messages).toHaveLength(1);
      const m = out.messages[0];
      expect(m.type).toBe('MELIA_SUMMARY');
      expect(m.messageKey).toBe('MELIA_SUMMARY:1');
      expect(m.to).toEqual(['m@x.org', 'm2@x.org']);
      expect(m.cc).toEqual([]);
      expect(m.spCode).toBe('SP01');
      expect(m.spName).toBe('Breeding');
      expect(m.greetingName).toBeTruthy();
      expect(m.results.map((r) => r.result_id)).toEqual([1, 2, 3]);
      expect(m.results[2].developerText).toBe('Juan Ruiz');
    });

    it('external developer (not an active PRMS user) goes to the MELIA summary and is never addressed', () => {
      const out = build(
        input({
          rows: [row({ developer_text: 'Ext <ext@partner.org>' })],
          activeUsers: users('someone@x.org'),
          meliaByInitiative: new Map([[1, mel('m@x.org')]]),
        }),
      );
      expect(out.messages.map((m) => m.type)).toEqual(['MELIA_SUMMARY']);
      const addressed = out.messages.flatMap((m) => [...m.to, ...m.cc]);
      expect(addressed).not.toContain('ext@partner.org');
    });

    it('a result with one external and one active developer goes only to the active digest', () => {
      const out = build(
        input({
          rows: [
            row({ developer_text: 'Ext <ext@partner.org>; Vera <v@x.org>' }),
          ],
          activeUsers: users('v@x.org'),
          meliaByInitiative: new Map([[1, mel('m@x.org')]]),
        }),
      );
      expect(out.messages.map((m) => m.messageKey)).toEqual([
        'DEVELOPER:v@x.org',
      ]);
    });

    it('one summary per owning SP', () => {
      const out = build(
        input({
          rows: [
            row({ result_id: 2, initiative_id: 4, initiative_code: 'SP04' }),
            row({ result_id: 1 }),
          ],
          meliaByInitiative: new Map([
            [1, mel('a@x.org')],
            [4, mel('b@x.org')],
          ]),
        }),
      );
      expect(out.messages.map((m) => m.messageKey)).toEqual([
        'MELIA_SUMMARY:1',
        'MELIA_SUMMARY:4',
      ]);
    });

    it('SP without MELIA: results are unreachable NO_MELIA with the developer text', () => {
      const out = build(
        input({ rows: [row({ developer_text: 'Juan Ruiz' })] }),
      );
      expect(out.messages).toEqual([]);
      expect(out.unreachable).toHaveLength(1);
      expect(out.unreachable[0]).toMatchObject({
        result_id: 1,
        reason: 'NO_MELIA',
        developer_text: 'Juan Ruiz',
      });
    });

    it('Innovation Use (no developer field) goes to the MELIA summary by default (RIR-OQ-7)', () => {
      const out = build(
        input({
          rows: [row({ result_type_id: 2, developer_text: 'Vera <v@x.org>' })],
          activeUsers: users('v@x.org'),
          meliaByInitiative: new Map([[1, mel('m@x.org')]]),
        }),
      );
      expect(out.messages.map((m) => m.type)).toEqual(['MELIA_SUMMARY']);
    });

    it('the Innovation Use routing is driven by INNOVATION_USE_ROUTING: a non-summary routing makes it unreachable', () => {
      const out = build(
        input({
          rows: [row({ result_type_id: 2 })],
          meliaByInitiative: new Map([[1, mel('m@x.org')]]),
        }),
        'UNREACHABLE',
      );
      expect(out.messages).toEqual([]);
      expect(out.unreachable.map((u) => u.result_id)).toEqual([1]);
    });

    it('lists a result once per message even when the same row arrives twice', () => {
      const dup = row({ result_id: 5, developer_text: 'v@x.org' });
      const dev = build(
        input({ rows: [dup, { ...dup }], activeUsers: users('v@x.org') }),
      );
      expect(dev.messages[0].results.map((r) => r.result_id)).toEqual([5]);
      const sum = build(
        input({
          rows: [row({ result_id: 6 }), row({ result_id: 6 })],
          meliaByInitiative: new Map([[1, mel('m@x.org')]]),
        }),
      );
      expect(sum.messages[0].results).toHaveLength(1);
      const ctr = build(
        input({
          rows: [
            row({ result_id: 7, source: 'API', lead_center_code: 'CTR-1' }),
            row({ result_id: 7, source: 'API', lead_center_code: 'CTR-1' }),
          ],
          centerMelByCenter: new Map([['CTR-1', mel('c@x.org')]]),
        }),
      );
      expect(ctr.messages[0].results).toHaveLength(1);
    });
  });

  it('exposes no lead name or address on message items or unreachable items', () => {
    const out = build(
      input({
        rows: [
          row({
            result_id: 1,
            developer_text: 'Vera <v@x.org>',
            lead_email: 'lead@x.org',
            lead_name: 'Lead',
            lead_contact_person: 'Lead P',
          }),
          row({
            result_id: 2,
            lead_email: 'lead@x.org',
            lead_name: 'Lead',
            lead_contact_person: 'Lead P',
          }),
        ],
        activeUsers: users('v@x.org'),
      }),
    );
    const items = [
      ...out.messages.flatMap((m) => m.results),
      ...out.unreachable,
    ];
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item).not.toHaveProperty('lead_email');
      expect(item).not.toHaveProperty('lead_name');
      expect(item).not.toHaveProperty('lead_contact_person');
    }
  });

  it('lists an unreachable result once even when the same row arrives twice (T-12 A3)', () => {
    const dup = row({ result_id: 8 });
    const out = build(input({ rows: [dup, { ...dup }] }));
    expect(out.unreachable.map((u) => u.result_id)).toEqual([8]);
  });

  describe('W3 center email (RIR-R-4)', () => {
    const w3 = (over: Partial<PendingInnovationRowV2> = {}) =>
      row({
        source: 'API',
        lead_center_code: 'CTR-1',
        lead_center_name: 'Center One',
        ...over,
      });

    it('one email per center to its MEL focal points, no CC', () => {
      const out = build(
        input({
          rows: [
            w3({ result_id: 2, result_code: 2 }),
            w3({ result_id: 1, result_code: 1 }),
            w3({
              result_id: 3,
              result_code: 3,
              lead_center_code: 'CTR-2',
              lead_center_name: 'Center Two',
            }),
          ],
          centerMelByCenter: new Map([
            ['CTR-1', mel('Mel@x.org', 'mel@x.org', 'mel2@x.org')],
            ['CTR-2', mel('other@x.org')],
          ]),
        }),
      );
      expect(out.messages.map((m) => m.messageKey)).toEqual([
        'CENTER:CTR-1',
        'CENTER:CTR-2',
      ]);
      const c1 = out.messages[0];
      expect(c1.type).toBe('CENTER');
      expect(c1.to).toEqual(['mel@x.org', 'mel2@x.org']);
      expect(c1.cc).toEqual([]);
      expect(c1.centerCode).toBe('CTR-1');
      expect(c1.centerName).toBe('Center One');
      expect(c1.greetingName).toBe('Center One');
      expect(c1.results.map((r) => r.result_id)).toEqual([1, 2]);
    });

    it('no lead center -> unreachable NO_CENTER', () => {
      const out = build(
        input({
          rows: [w3({ lead_center_code: null, lead_center_name: null })],
        }),
      );
      expect(out.messages).toEqual([]);
      expect(out.unreachable[0].reason).toBe('NO_CENTER');
      expect(out.unreachable[0].lead_center_code).toBeNull();
      expect(out.unreachable[0].lead_center_name).toBeNull();
    });

    it('center without active MEL -> unreachable NO_CENTER_MEL', () => {
      const out = build(input({ rows: [w3()] }));
      expect(out.unreachable[0].reason).toBe('NO_CENTER_MEL');
      expect(out.unreachable[0].lead_center_code).toBe('CTR-1');
      expect(out.unreachable[0].lead_center_name).toBe('Center One');
    });

    it('falsifier: a W3 result never reaches a developer or a MELIA focal point', () => {
      const out = build(
        input({
          rows: [w3({ developer_text: 'Vera <v@x.org>' })],
          activeUsers: users('v@x.org'),
          meliaByInitiative: new Map([[1, mel('m@x.org')]]),
          centerMelByCenter: new Map([['CTR-1', mel('mel@x.org')]]),
        }),
      );
      expect(out.messages.map((m) => m.type)).toEqual(['CENTER']);
      const addressed = out.messages.flatMap((m) => [...m.to, ...m.cc]);
      expect(addressed).toEqual(['mel@x.org']);
    });

    it('a W3 Innovation Use (type 2) result goes to the center email, not to the MELIA summary (T-12 A1)', () => {
      const out = build(
        input({
          rows: [w3({ result_type_id: 2 })],
          meliaByInitiative: new Map([[1, mel('m@x.org')]]),
          centerMelByCenter: new Map([['CTR-1', mel('mel@x.org')]]),
        }),
      );
      expect(out.messages.map((m) => m.type)).toEqual(['CENTER']);
      expect(out.messages[0].to).toEqual(['mel@x.org']);
    });

    it('falsifier: W3 with no center MEL is not rerouted to the SP MELIA', () => {
      const out = build(
        input({
          rows: [w3()],
          meliaByInitiative: new Map([[1, mel('m@x.org')]]),
        }),
      );
      expect(out.messages).toEqual([]);
      expect(out.unreachable[0].reason).toBe('NO_CENTER_MEL');
    });
  });

  it('the same address may receive a DEVELOPER digest and a MELIA_SUMMARY', () => {
    const out = build(
      input({
        rows: [
          row({ result_id: 1, developer_text: 'Mia <mia@x.org>' }),
          row({ result_id: 2, result_code: 200, developer_text: null }),
        ],
        activeUsers: users('mia@x.org'),
        meliaByInitiative: new Map([[1, mel('mia@x.org')]]),
      }),
    );
    expect(out.messages.map((m) => m.messageKey)).toEqual([
      'DEVELOPER:mia@x.org',
      'MELIA_SUMMARY:1',
    ]);
    expect(out.messages[0].cc).toEqual([]);
    expect(out.messages[1].to).toEqual(['mia@x.org']);
  });

  it('mixed batch: developer digest, MELIA summary and an unreachable W3 in one build', () => {
    const out = build(
      input({
        rows: [
          row({ result_id: 1, developer_text: 'v@x.org' }),
          row({ result_id: 2, developer_text: null }),
          row({ result_id: 3, source: 'API', lead_center_code: null }),
        ],
        activeUsers: users('v@x.org'),
        meliaByInitiative: new Map([[1, mel('m@x.org')]]),
      }),
    );
    expect(out.messages.map((m) => m.messageKey)).toEqual([
      'DEVELOPER:v@x.org',
      'MELIA_SUMMARY:1',
    ]);
    expect(out.unreachable.map((u) => u.result_id)).toEqual([3]);
  });
});
