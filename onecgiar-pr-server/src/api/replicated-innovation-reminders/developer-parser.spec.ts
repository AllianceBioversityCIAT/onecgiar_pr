// @akili-spec changes/replicated-innovation-reminders
// RIR-T-9: parseDevelopers (RIR-R-16, RIR-DD-7). Names and emails are invented.
import { parseDevelopers } from './developer-parser';

describe('parseDevelopers (RIR-R-16)', () => {
  it('parses the R-16 mixed scenario on one line', () => {
    const out = parseDevelopers(
      '1. Ana Perez <a.perez@cgiar.org> (Main contact) 2. Juan Ruiz 3. B.Lee@CGIAR.org',
    );
    expect(out).toEqual([
      { name: 'Ana Perez', email: 'a.perez@cgiar.org' },
      { name: 'Juan Ruiz', email: null },
      { name: '', email: 'b.lee@cgiar.org' },
    ]);
  });

  it('parses three numbered entries over new lines', () => {
    const out = parseDevelopers(
      '1. Perez, Ana <a.perez@x.org> (Main contact)\n2. Ruiz, Juan <j.ruiz@x.org>\r\n3. Lee, Bo <b.lee@x.org>',
    );
    expect(out).toEqual([
      { name: 'Perez, Ana', email: 'a.perez@x.org' },
      { name: 'Ruiz, Juan', email: 'j.ruiz@x.org' },
      { name: 'Lee, Bo', email: 'b.lee@x.org' },
    ]);
  });

  it('keeps "Last, First" names whole when there is no email', () => {
    expect(parseDevelopers('1. Perez, Ana')).toEqual([
      { name: 'Perez, Ana', email: null },
    ]);
  });

  it('splits a comma list only on email-bearing segments', () => {
    const out = parseDevelopers(
      'Perez, Ana <a.perez@x.org>, Ruiz, Juan <j.ruiz@x.org>',
    );
    expect(out).toEqual([
      { name: 'Perez, Ana', email: 'a.perez@x.org' },
      { name: 'Ruiz, Juan', email: 'j.ruiz@x.org' },
    ]);
  });

  it('returns a name with no email as not reachable', () => {
    expect(parseDevelopers('Juan Ruiz')).toEqual([
      { name: 'Juan Ruiz', email: null },
    ]);
  });

  it('returns a bare email with an empty name, lower-cased', () => {
    expect(parseDevelopers('  Ana.Perez@CGIAR.org ')).toEqual([
      { name: '', email: 'ana.perez@cgiar.org' },
    ]);
  });

  it('counts a duplicate email once, keeping the first', () => {
    const out = parseDevelopers(
      '1. Ana Perez <a.perez@x.org>\n2. A. Perez <A.PEREZ@x.org>',
    );
    expect(out).toEqual([{ name: 'Ana Perez', email: 'a.perez@x.org' }]);
  });

  it.each([null, undefined, '', '   ', '\n\t '])(
    'returns [] for %p',
    (input) => {
      expect(parseDevelopers(input as string | null | undefined)).toEqual([]);
    },
  );

  it('splits on semicolons', () => {
    const out = parseDevelopers(
      'Ana Perez <a.perez@x.org>; Juan Ruiz; b.lee@x.org',
    );
    expect(out).toEqual([
      { name: 'Ana Perez', email: 'a.perez@x.org' },
      { name: 'Juan Ruiz', email: null },
      { name: '', email: 'b.lee@x.org' },
    ]);
  });

  it('splits bare emails separated by commas', () => {
    expect(parseDevelopers('a@x.org, B@x.org')).toEqual([
      { name: '', email: 'a@x.org' },
      { name: '', email: 'b@x.org' },
    ]);
  });

  it('reads an email without angle brackets after the name', () => {
    expect(parseDevelopers('Ana Perez a.perez@x.org')).toEqual([
      { name: 'Ana Perez', email: 'a.perez@x.org' },
    ]);
  });

  it('drops parenthetical institution and contact marks from the name', () => {
    expect(
      parseDevelopers('1. Ana Perez (IITA) <a.perez@x.org> (Main contact)'),
    ).toEqual([{ name: 'Ana Perez', email: 'a.perez@x.org' }]);
    expect(parseDevelopers('Juan Ruiz (IITA)')).toEqual([
      { name: 'Juan Ruiz', email: null },
    ]);
  });

  it('never returns numbering or "Main contact" as a person', () => {
    const out = parseDevelopers('1.\n2. (Main contact)\n3. Main contact');
    expect(out).toEqual([]);
  });

  it('does not treat a trailing dot after an email as part of it', () => {
    expect(parseDevelopers('Ana Perez <a.perez@x.org>.')).toEqual([
      { name: 'Ana Perez', email: 'a.perez@x.org' },
    ]);
  });
  it('strips leading punctuation that the address pattern tolerates (T-9 A1)', () => {
    const out = parseDevelopers("'a.perez@x.org, -b.lee@x.org; %c.diaz@x.org");
    expect(out.map((d) => d.email)).toEqual([
      'a.perez@x.org',
      'b.lee@x.org',
      'c.diaz@x.org',
    ]);
  });

  it('trims unclosed brackets from the name edges (T-9 A3)', () => {
    expect(parseDevelopers('Ana Perez (')).toEqual([
      { name: 'Ana Perez', email: null },
    ]);
    expect(parseDevelopers('Ana Perez [IITA <a.perez@x.org>')).toEqual([
      { name: 'Ana Perez [IITA', email: 'a.perez@x.org' },
    ]);
    expect(parseDevelopers(') Juan Ruiz')).toEqual([
      { name: 'Juan Ruiz', email: null },
    ]);
  });

  describe('declared limits (T-9 A4)', () => {
    it('keeps "Juan Ruiz, Ana Perez" as one person (a comma never splits alone)', () => {
      expect(parseDevelopers('Juan Ruiz, Ana Perez')).toEqual([
        { name: 'Juan Ruiz, Ana Perez', email: null },
      ]);
    });

    it('drops text after the last email when a name precedes it ("A <e1>, B")', () => {
      expect(parseDevelopers('A <a@x.org>, B')).toEqual([
        { name: 'A', email: 'a@x.org' },
      ]);
    });

    it('splits "Version 2. x" on the numbering marker', () => {
      expect(parseDevelopers('Version 2. x')).toEqual([
        { name: 'Version', email: null },
        { name: 'x', email: null },
      ]);
    });
  });
});
