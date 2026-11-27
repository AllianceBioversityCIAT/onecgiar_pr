// @akili-spec changes/rir-breeding-exclusion
// RBX-T-1: frozen copy module. (a) v2 equality against the three landed migrations that write
// RIR template bodies (DD-7), (b) v3 render against design.md section 6.5. Names, URLs and emails
// are invented.
import * as handlebars from 'handlebars';
import { RIRRecipientModelV21791700000000 } from '../../../migrations/1791700000000-RIR-RecipientModelV2';
import { RIRResultIdHyperlink1791900000000 } from '../../../migrations/1791900000000-RIR-ResultIdHyperlink';
import { RCFCenterRouting1793400000000 } from '../../../migrations/1793400000000-RCF-CenterRouting';
import {
  RIR_CENTER_TEMPLATE_NAME,
  RIR_FINAL_TEMPLATE_NAME,
  RIR_MELIA_TEMPLATE_NAME,
  RIR_Q4_TEMPLATE_NAME,
  buildRirTemplatesV2,
  buildRirTemplatesV3,
  buildRirTemplatesV4,
  buildRirTemplatesV5,
} from './rir-template-copy';

const ALL_NAMES = [
  RIR_Q4_TEMPLATE_NAME,
  RIR_FINAL_TEMPLATE_NAME,
  RIR_MELIA_TEMPLATE_NAME,
  RIR_CENTER_TEMPLATE_NAME,
];

/**
 * Fake query runner: `template` is an in-memory name -> body map. It understands only the
 * statements the three migrations issue against `template`; everything else returns an empty
 * result (so `hasIndex` is false and every guarded DDL path runs). Statements it does not
 * understand are recorded in `ignored`, so a spec can prove that none of them wrote to `template`.
 */
class FakeTemplateRunner {
  readonly bodies = new Map<string, string>();
  readonly ignored: string[] = [];

  async hasColumn(): Promise<boolean> {
    return true;
  }

  async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
    const text = sql.replace(/\s+/g, ' ');
    if (/^ ?UPDATE `template` SET `template` = \?, /.test(text)) {
      const [body, name] = params as string[];
      this.bodies.set(name, body);
    } else if (
      /INSERT INTO `template` \(name, description, template/.test(text)
    ) {
      const [name, , body] = params as string[];
      if (!this.bodies.has(name)) this.bodies.set(name, body);
    } else if (/REPLACE\(`template`, \?, \?\)/.test(text)) {
      // Params are [from, to, ...names, from]: the last `from` is the trailing INSTR guard
      // (1791900000000 and 1793400000000 both end with it), so it is not a template name.
      const [from, to, ...rest] = params as string[];
      const names = rest.slice(0, -1);
      for (const name of names) {
        const body = this.bodies.get(name);
        if (body !== undefined && body.includes(from)) {
          this.bodies.set(name, body.split(from).join(to));
        }
      }
    } else if (/SELECT cc\.code AS code/.test(text)) {
      // 1793400000000 resolves the ICARDA center code and throws on an empty result.
      return [{ code: 'X' }];
    } else {
      // `center_reminder_routing` DDL and INSERT, `hasIndex`, column DDL: nothing to model.
      this.ignored.push(text);
    }
    return [];
  }
}

describe('rir-template-copy', () => {
  describe('(a) v2 equals what the landed migrations leave in PROD (DD-7)', () => {
    let landed: Map<string, string>;
    let beforeRcf: Map<string, string>;
    let ignored: string[];

    beforeAll(async () => {
      const runner = new FakeTemplateRunner();
      // Rows 1 and 2 pre-exist in PROD; the migration updates them by name.
      runner.bodies.set(RIR_Q4_TEMPLATE_NAME, 'legacy q4');
      runner.bodies.set(RIR_FINAL_TEMPLATE_NAME, 'legacy final');
      await new RIRRecipientModelV21791700000000().up(runner as never);
      await new RIRResultIdHyperlink1791900000000().up(runner as never);
      beforeRcf = new Map(runner.bodies);
      await new RCFCenterRouting1793400000000().up(runner as never);
      landed = runner.bodies;
      ignored = runner.ignored;
    });

    it('the landed migrations produced exactly the four RIR bodies', () => {
      expect([...landed.keys()].sort()).toEqual([...ALL_NAMES].sort());
    });

    it.each(ALL_NAMES)('buildRirTemplatesV2()[%s] is byte-equal', (name) => {
      const v2 = buildRirTemplatesV2();
      expect(v2[name]).toBe(landed.get(name));
    });

    it('the landed bodies carry the linked Result ID cell (guards the fixture itself)', () => {
      for (const name of ALL_NAMES) {
        expect(landed.get(name)).toContain(
          '<td><a class="link" href="{{resultUrl}}">{{resultCode}}</a></td>',
        );
      }
    });

    it('1793400000000 really ran: it dropped "bilateral" from the Center intro only (guards the fixture itself)', () => {
      expect(beforeRcf.get(RIR_CENTER_TEMPLATE_NAME)).toContain(
        '{{resultCount}} bilateral innovation(s)',
      );
      expect(landed.get(RIR_CENTER_TEMPLATE_NAME)).toContain(
        '{{resultCount}} innovation(s)',
      );
      expect(landed.get(RIR_CENTER_TEMPLATE_NAME)).not.toContain(
        'bilateral innovation(s)',
      );
      for (const name of ALL_NAMES.filter(
        (n) => n !== RIR_CENTER_TEMPLATE_NAME,
      )) {
        expect(landed.get(name)).toBe(beforeRcf.get(name));
      }
    });

    it('v2 Center intro has no "bilateral" (the landed RCF copy fix is kept by down)', () => {
      expect(buildRirTemplatesV2()[RIR_CENTER_TEMPLATE_NAME]).not.toContain(
        'bilateral innovation(s)',
      );
    });

    it('no statement the fake runner ignored wrote to `template` (a skipped statement is not evidence)', () => {
      const templateWrites = ignored.filter((text) =>
        /(UPDATE|INSERT INTO|DELETE FROM) `template`/.test(text),
      );
      expect(templateWrites).toEqual([]);
    });
  });

  describe('(b) v3 render (design.md section 6.5)', () => {
    const v3 = buildRirTemplatesV3();

    const result = {
      resultCode: 101,
      resultUrl: 'https://example.test/result/101/general-information',
      resultTitle: 'Test innovation',
      resultTypeName: 'Innovation development',
      spCode: 'SP01',
      spName: 'Breeding for Tomorrow',
      developerText: 'Ana Lopez',
    };
    const data = {
      kindLabel: 'Q4 notice',
      leadName: 'Ana Lopez',
      centerName: 'Test Center',
      spCode: 'SP01',
      spName: 'Breeding for Tomorrow',
      phaseName: 'Reporting 2026',
      phaseYear: 2026,
      previousYear: 2025,
      nextYear: 2027,
      nextNextYear: 2028,
      resultCount: 1,
      results: [result],
    };
    const render = (name: string, extra: Record<string, unknown> = {}) =>
      handlebars.compile(v3[name])({ ...data, ...extra });

    const DISCLAIMER =
      '<p class="disclaimer">This is an automated message from the CGIAR PRMS system. Please do not reply directly to this email.</p>';

    const DEVELOPER_INTRO =
      '<p>The CGIAR Performance and Results Management System (PRMS) shows that you have 1 innovation(s), reported in previous years, with no update yet to reflect any work done on them during the 2026 reporting period:</p>';

    // §6.5 "Developer digest ... and the MELIA summary body": paragraphs after the table, in order.
    const DEVELOPER_PARAGRAPHS = [
      '<p>For existing innovations that received active investment in 2026, you only need to update what has changed. All other existing data will be pre-filled for you to review, so this should not take much of your time.</p>',
      "<p>For existing innovations that did not receive investment in 2026, or were stopped or put on hold, you can set the status to 'Inactive' and give the reason for discontinuation.</p>",
      '<p>If you reported breeding lines or varieties as innovations in previous years, they are not included in the list above and you do not need to update them. The Breeding for Tomorrow Program MELIA focal point will complete their 2026 update in PRMS and will contact you directly if she has any questions.</p>',
      "<p>If you do not update your innovation results, PRMS will automatically close them with the status 'Inactive – not updated' at the end of January 2027. You can reopen and update an innovation in any later reporting phase (2027, 2028 and beyond).</p>",
      '<p>This update helps CGIAR keep its innovation records current and monitor their progress over the years. Thank you for your contribution to this process; it is much appreciated.</p>',
      DISCLAIMER,
    ];

    // §6.5 "Center email": paragraphs after the table, in order.
    const CENTER_INTRO =
      '<p>The CGIAR Performance and Results Management System (PRMS) shows that your Center has 1 innovation(s) reported in 2025 that have not yet been updated to reflect any work undertaken during the 2026 reporting period:</p>';
    const CENTER_PARAGRAPHS = [
      '<p>If your Center reported breeding lines or varieties as innovations in 2025, they are not included in the list above and you do not need to update them. The Breeding for Tomorrow Program MELIA focal point will complete their 2026 update in PRMS and will contact you or the relevant teams directly if she has any questions.</p>',
      '<p>For the innovations listed above that received active investment in 2026, you only need to update what has changed. All other existing data will be pre-filled for you to review, so the update should not take much time.</p>',
      "<p>For listed innovations that did not receive investment in 2026, or were stopped or put on hold, you can set the status to 'Inactive' and provide the reason for discontinuation.</p>",
      "<p>If the innovations listed above are not updated, PRMS will automatically close them with the status 'Inactive – not updated' in mid-February 2027. You can reopen and update an innovation in any later reporting phase (2027, 2028 and beyond).</p>",
      '<p>Keeping these records updated helps CGIAR maintain current information on its innovations and monitor their progress over time. Thank you for your contribution to this process; it is much appreciated.</p>',
      DISCLAIMER,
    ];

    /** Every paragraph is present, after the table, and in the stated order. */
    const expectInOrderAfterTable = (html: string, paragraphs: string[]) => {
      let cursor = html.indexOf('</table>\n');
      expect(cursor).toBeGreaterThan(-1);
      for (const p of paragraphs) {
        const at = html.indexOf(p, cursor);
        expect(at).toBeGreaterThan(-1);
        cursor = at + p.length;
      }
    };

    it('has the four template names', () => {
      expect(Object.keys(v3).sort()).toEqual([...ALL_NAMES].sort());
    });

    it.each([RIR_Q4_TEMPLATE_NAME, RIR_FINAL_TEMPLATE_NAME])(
      'developer digest %s: greeting, intro, table, paragraphs',
      (name) => {
        const html = render(name);
        expect(html).toContain(
          '<h2 class="fw-600" style="font-size:18px; margin-top:0;">Dear Ana Lopez,</h2>',
        );
        expect(html).toContain(DEVELOPER_INTRO);
        expect(html).toContain('<th>Result ID</th>');
        expect(html).toContain('<th>Innovation</th>');
        expect(html).toContain('<th>Science Program / Accelerator</th>');
        expect(html).not.toContain('Innovation developer (as listed)');
        expectInOrderAfterTable(html, DEVELOPER_PARAGRAPHS);
        expect(html).toContain('at the end of January 2027');
        expect(html).not.toContain('mid-February');
      },
    );

    it('the Q4 notice and the final reminder share one body', () => {
      expect(v3[RIR_Q4_TEMPLATE_NAME]).toBe(v3[RIR_FINAL_TEMPLATE_NAME]);
    });

    it('MELIA summary: own greeting, developer intro, developer column, developer paragraphs', () => {
      const html = render(RIR_MELIA_TEMPLATE_NAME);
      expect(html).toContain(
        '<h2 class="fw-600" style="font-size:18px; margin-top:0;">Dear MELIA focal point(s) of SP01 – Breeding for Tomorrow,</h2>',
      );
      expect(html).toContain(DEVELOPER_INTRO);
      expect(html).toContain('<th>Science Program / Accelerator</th>');
      expect(html).toContain('<th>Innovation developer (as listed)</th>');
      expect(html).toContain('<td>Ana Lopez</td>');
      expectInOrderAfterTable(html, DEVELOPER_PARAGRAPHS);
      expect(html).toContain('at the end of January 2027');
      expect(html).not.toContain('mid-February');
      expect(html).not.toContain('can be reached through PRMS');
    });

    it('MELIA summary shows "Not provided" with no developer text', () => {
      const html = render(RIR_MELIA_TEMPLATE_NAME, {
        results: [{ ...result, developerText: null }],
      });
      expect(html).toContain('<td>Not provided</td>');
    });

    it('Center email: greeting, intro, SP header, paragraphs, mid-February', () => {
      const html = render(RIR_CENTER_TEMPLATE_NAME);
      expect(html).toContain(
        '<h2 class="fw-600" style="font-size:18px; margin-top:0;">Dear Center MEL focal point(s) of Test Center,</h2>',
      );
      expect(html).toContain(CENTER_INTRO);
      expect(html).toContain('<th>Result ID</th>');
      expect(html).toContain('<th>Innovation</th>');
      expect(html).toContain(
        '<th>Science Program / Accelerator who has approved the result in 2025</th>',
      );
      expect(html).not.toContain('Innovation developer (as listed)');
      expectInOrderAfterTable(html, CENTER_PARAGRAPHS);
      expect(html).toContain('in mid-February 2027');
      expect(html).not.toContain('end of January');
      expect(html).toContain('reported in 2025');
    });

    it.each(ALL_NAMES)(
      '%s: years render as "(2027, 2028 and beyond)"',
      (name) => {
        expect(render(name)).toContain('(2027, 2028 and beyond)');
      },
    );

    it.each(ALL_NAMES)('%s: breeding paragraph is present', (name) => {
      const html = render(name);
      expect(html).toContain(
        'Breeding for Tomorrow Program MELIA focal point will complete their 2026 update in PRMS',
      );
    });

    it.each(ALL_NAMES)('%s: Result ID is a link to the row URL', (name) => {
      expect(render(name)).toContain(
        '<td><a class="link" href="https://example.test/result/101/general-information">101</a></td>',
      );
    });

    it.each(ALL_NAMES)(
      '%s: redirect notice only when intendedTo is set',
      (name) => {
        const without = render(name);
        expect(without).not.toContain('redirect-notice">');
        const html = render(name, {
          intendedTo: 'owner@example.test',
          intendedCc: 'copy@example.test',
        });
        expect(html).toContain('<div class="redirect-notice">');
        expect(html).toContain('Intended recipients (test message)');
        expect(html).toContain(
          '<span class="fw-600">owner@example.test</span>',
        );
        expect(html).toContain(
          '<span class="fw-600">copy@example.test</span> in copy',
        );
      },
    );

    it.each(ALL_NAMES)('%s: kind label and disclaimer survive', (name) => {
      const html = render(name);
      expect(html).toContain('<p class="kind">Q4 notice</p>');
      expect(html).toContain(DISCLAIMER);
    });
  });
});

// SR-167303 (Nicoleta, 2026-11-26): v4 = v3 without the breeding paragraph.
describe('rir-template-copy v4', () => {
  const v3 = buildRirTemplatesV3();
  const v4 = buildRirTemplatesV4();

  it.each(ALL_NAMES)(
    '%s has no breeding text and is v3 minus exactly one paragraph',
    (name) => {
      expect(v4[name]).not.toMatch(/breeding/i);
      expect(v4[name]).not.toMatch(/varieties/i);
      expect(v4[name]).not.toMatch(/Breeding for Tomorrow/);
      const removed = v3[name].length - v4[name].length;
      expect(removed).toBeGreaterThan(0);
      const para = v3[name].match(
        /<p>If (?:you|your Center) reported breeding lines[^]*?<\/p>\n\n/,
      );
      expect(para).not.toBeNull();
      expect(v3[name].replace(para![0], '')).toBe(v4[name]);
    },
  );

  it('keeps the closing dates: end of January for developers/MELIA, mid-February for Centers', () => {
    const ctx = {
      phaseYear: 2026,
      nextYear: 2027,
      nextNextYear: 2028,
      previousYear: 2025,
      results: [],
    };
    expect(handlebars.compile(v4[RIR_Q4_TEMPLATE_NAME])(ctx)).toContain(
      'at the end of January 2027',
    );
    expect(handlebars.compile(v4[RIR_MELIA_TEMPLATE_NAME])(ctx)).toContain(
      'at the end of January 2027',
    );
    expect(handlebars.compile(v4[RIR_CENTER_TEMPLATE_NAME])(ctx)).toContain(
      'in mid-February 2027',
    );
  });

  it('the v4 migration writes v4 up and restores v3 down, by name', async () => {
    const { RIRCopyV4NoBreedingNote1793700000000: M } = await import(
      '../../../migrations/1793700000000-RIR-CopyV4NoBreedingNote'
    );
    const runner = new FakeTemplateRunner();
    await new M().up(runner as any);
    for (const name of ALL_NAMES)
      expect(runner.bodies.get(name)).toBe(v4[name]);
    await new M().down(runner as any);
    for (const name of ALL_NAMES)
      expect(runner.bodies.get(name)).toBe(v3[name]);
  });
});

describe('rir-template-copy v5', () => {
  const v4 = buildRirTemplatesV4();
  const v5 = buildRirTemplatesV5();
  const ctx = {
    phaseYear: 2026,
    nextYear: 2027,
    nextNextYear: 2028,
    previousYear: 2025,
    results: [],
  };

  it('Center email closes "on 10 February" and no longer says mid-February', () => {
    const html = handlebars.compile(v5[RIR_CENTER_TEMPLATE_NAME])(ctx);
    expect(html).toContain(
      "with the status 'Inactive – not updated' on 10 February 2027.",
    );
    expect(html).not.toContain('mid-February');
    expect(
      v4[RIR_CENTER_TEMPLATE_NAME].replace(
        'in mid-February {{nextYear}}',
        'on 10 February {{nextYear}}',
      ),
    ).toBe(v5[RIR_CENTER_TEMPLATE_NAME]);
  });

  it.each([
    RIR_Q4_TEMPLATE_NAME,
    RIR_FINAL_TEMPLATE_NAME,
    RIR_MELIA_TEMPLATE_NAME,
  ])('%s is v4 byte for byte (end of January)', (name) => {
    expect(v5[name]).toBe(v4[name]);
    expect(handlebars.compile(v5[name])(ctx)).toContain(
      'at the end of January 2027',
    );
  });

  it('the v5 migration writes v5 up and restores v4 down, by name', async () => {
    const { RIRCopyV5CenterClosingDate1793800000000: M } = await import(
      '../../../migrations/1793800000000-RIR-CopyV5CenterClosingDate'
    );
    const runner = new FakeTemplateRunner();
    await new M().up(runner as any);
    for (const name of ALL_NAMES)
      expect(runner.bodies.get(name)).toBe(v5[name]);
    await new M().down(runner as any);
    for (const name of ALL_NAMES)
      expect(runner.bodies.get(name)).toBe(v4[name]);
  });
});
