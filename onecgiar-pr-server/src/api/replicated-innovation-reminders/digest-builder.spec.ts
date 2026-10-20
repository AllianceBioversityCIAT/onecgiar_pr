// @akili-spec changes/replicated-innovation-reminders
import { buildDigests, PendingRow, CcByInitiative } from './digest-builder';

const row = (over: Partial<PendingRow> = {}): PendingRow => ({
  result_id: 1,
  result_code: 100,
  title: 'Result',
  result_type_id: 7,
  version_id: 50,
  initiative_id: 1,
  initiative_code: 'SP01',
  initiative_short_name: 'Breeding',
  lead_email: 'l@x.org',
  lead_name: 'Lead L',
  lead_contact_person: null,
  ...over,
});

describe('buildDigests (RIR-T-3)', () => {
  it('Falsifier: lead L with A(SP01)+G(SP04), coordinator shared and also L -> one digest, CC without L, shared once', () => {
    const rows = [
      row({
        result_id: 2,
        result_code: 700,
        title: 'G',
        initiative_id: 4,
        initiative_code: 'SP04',
      }),
      row({
        result_id: 1,
        result_code: 100,
        title: 'A',
        initiative_id: 1,
        initiative_code: 'SP01',
      }),
    ];
    const cc: CcByInitiative = new Map([
      [1, ['L@x.org', 'coord@x.org']],
      [4, ['coord@x.org', 'melia@x.org']],
    ]);

    const out = buildDigests(rows, cc);

    expect(out.unreachable).toEqual([]);
    expect(out.digests).toHaveLength(1);
    const d = out.digests[0];
    expect(d.to).toBe('l@x.org');
    expect(d.results.map((r) => r.result_code)).toEqual([100, 700]);
    expect(d.cc).toEqual(['coord@x.org', 'melia@x.org']);
  });

  it('mails differing only in case or whitespace give one digest', () => {
    const rows = [
      row({ result_id: 1, result_code: 1, lead_email: 'Lead@X.org' }),
      row({ result_id: 2, result_code: 2, lead_email: ' lead@x.org ' }),
    ];
    const out = buildDigests(rows, new Map());
    expect(out.digests).toHaveLength(1);
    expect(out.digests[0].to).toBe('lead@x.org');
    expect(out.digests[0].results).toHaveLength(2);
  });

  it('NULL or empty mail goes to unreachable with code, title, SP and free-text contact', () => {
    const rows = [
      row({
        result_id: 1,
        result_code: 5,
        title: 'N',
        lead_email: null,
        lead_contact_person: 'Jane Doe',
      }),
      row({ result_id: 2, result_code: 6, title: 'E', lead_email: '   ' }),
    ];
    const out = buildDigests(rows, new Map());
    expect(out.digests).toEqual([]);
    expect(out.unreachable).toEqual([
      expect.objectContaining({
        result_code: 5,
        title: 'N',
        initiative_code: 'SP01',
        lead_contact_person: 'Jane Doe',
      }),
      expect.objectContaining({ result_code: 6, title: 'E' }),
    ]);
  });

  it('different leads give different digests, ordered by To; results ordered by SP code then result code', () => {
    const rows = [
      row({
        result_id: 1,
        result_code: 9,
        lead_email: 'z@x.org',
        initiative_code: 'SP01',
      }),
      row({
        result_id: 2,
        result_code: 8,
        lead_email: 'a@x.org',
        initiative_code: 'SP04',
        initiative_id: 4,
      }),
      row({
        result_id: 3,
        result_code: 3,
        lead_email: 'a@x.org',
        initiative_code: 'SP04',
        initiative_id: 4,
      }),
      row({
        result_id: 4,
        result_code: 20,
        lead_email: 'a@x.org',
        initiative_code: 'SP01',
      }),
    ];
    const out = buildDigests(rows, new Map());
    expect(out.digests.map((d) => d.to)).toEqual(['a@x.org', 'z@x.org']);
    expect(out.digests[0].results.map((r) => r.result_code)).toEqual([
      20, 3, 8,
    ]);
  });

  it('CC only uses the initiatives of that digest and is deduplicated case-insensitively and sorted', () => {
    const rows = [
      row({ result_id: 1, initiative_id: 1, lead_email: 'a@x.org' }),
      row({
        result_id: 2,
        initiative_id: 2,
        initiative_code: 'SP02',
        lead_email: 'b@x.org',
      }),
    ];
    const cc: CcByInitiative = new Map([
      [1, ['Zed@x.org', 'zed@x.org', 'amy@x.org']],
      [2, ['other@x.org']],
    ]);
    const out = buildDigests(rows, cc);
    expect(out.digests[0].cc).toEqual(['amy@x.org', 'zed@x.org']);
    expect(out.digests[1].cc).toEqual(['other@x.org']);
  });

  it('empty input gives empty output', () => {
    expect(buildDigests([], new Map())).toEqual({
      digests: [],
      unreachable: [],
    });
  });
});
