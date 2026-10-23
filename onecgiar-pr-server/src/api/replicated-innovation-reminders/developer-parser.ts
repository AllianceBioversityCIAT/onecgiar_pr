// @akili-spec changes/replicated-innovation-reminders
// Pure parser of the free-text results_innovations_dev.innovation_developers field (RIR-R-16, RIR-DD-7).
// No I/O: the caller matches the returned emails against active PRMS users (RIR-R-17).

export interface ParsedDeveloper {
  name: string;
  email: string | null;
}

// RFC-lite: enough for the addresses typed in this field, and it never swallows a trailing dot.
const EMAIL_RE = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

// Entry numbering "1." / "2)" at the start of a text or after whitespace (never inside an email).
const NUMBERING_RE = /(?:^|\s)\d{1,2}[.)](?=\s|$)/;

// Marks that are not a person even when they survive the parenthesis cleanup.
const NOT_A_NAME_RE = /^(?:main\s+contact|contact|n\/?a|none|tbd|-+)$/i;

// The address pattern tolerates a leading quote/dash/dot/plus/percent (typing noise); no PRMS user has one.
const normEmail = (mail: string): string =>
  mail
    .trim()
    .toLowerCase()
    .replace(/^['\-.+%]+/, '');

/** Drops (...) / [...] notes, brackets and edge punctuation; returns '' for non-names. */
const cleanName = (raw: string): string => {
  const name = raw
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/mailto:/gi, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:|\-–—)\]}]+|[\s,;:|\-–—.(\[{]+$/g, '')
    .trim();
  return NOT_A_NAME_RE.test(name) ? '' : name;
};

/**
 * Heuristic (RIR-DD-7):
 * 1. Split into entries on new lines, ";" and the numbering marker "N." (also inline).
 *    A comma is NOT an entry separator, because names are often "Last, First".
 * 2. An entry with no email is one person (its whole cleaned text is the name).
 * 3. An entry with emails is split around them: each email owns the text between the
 *    previous email and itself (so "Last, First <e1>, Last2, First2 <e2>" yields two
 *    people and only commas next to an email split). Text after the last email is used
 *    as the name only when nothing precedes it.
 */
export function parseDevelopers(
  text: string | null | undefined,
): ParsedDeveloper[] {
  if (!text || !text.trim()) return [];

  const entries = text
    .split(/[\r\n;]+/)
    .flatMap((line) => line.split(NUMBERING_RE));

  const out: ParsedDeveloper[] = [];
  const seenEmails = new Set<string>();
  const seenNames = new Set<string>();

  for (const entry of entries) {
    if (!entry.trim()) continue;
    const matches = [...entry.matchAll(EMAIL_RE)];

    if (!matches.length) {
      const name = cleanName(entry);
      const key = name.toLowerCase();
      if (name && !seenNames.has(key)) {
        seenNames.add(key);
        out.push({ name, email: null });
      }
      continue;
    }

    let cursor = 0;
    matches.forEach((match, i) => {
      const start = match.index ?? 0;
      let name = cleanName(entry.slice(cursor, start));
      cursor = start + match[0].length;
      if (!name && i === matches.length - 1) {
        name = cleanName(entry.slice(cursor));
      }
      const email = normEmail(match[0]);
      if (seenEmails.has(email)) return;
      seenEmails.add(email);
      out.push({ name, email });
    });
  }

  return out;
}
