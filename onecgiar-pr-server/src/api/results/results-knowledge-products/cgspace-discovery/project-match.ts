// @akili-spec changes/kp-project-strict-filter
/**
 * `KPSF-T-1` — project match rule (`design.md` §8.1, `KPSF-R-2`, `KPSF-R-9`, `KPSF-DD-4`).
 *
 * Pure module (no Nest, no logger, no HTTP). A project label matches when, after normalization,
 * it contains ALL the project's distinctive words (max 8, and only when there are at least 2)
 * OR the PJ code phrase. The Solr clause and the label predicate share one `buildProjectMatch`
 * result, so the fixtures prove exactly what the clause asks the repository for.
 *
 * Only `[a-z0-9]` tokens ever enter the clause (`KPSF-R-9`): raw project text is never
 * interpolated, and operator words (`and`/`or`/`not`) are stopwords.
 */

export interface ProjectMatchContext {
  /** CLARISA project code, e.g. `T-PJ-003942`. */
  code?: string | null;
  /** CLARISA project title. */
  title?: string | null;
  /** Lead-center acronym (e.g. `IITA`): a prefix Centers may or may not write in the label. */
  leadCenter?: string | null;
}

export interface ProjectMatch {
  /** Distinctive words, in title order, deduped, max `MAX_WORDS`. */
  words: string[];
  /** Normalized code phrases, with and without leading zeros (`pj 003942`, `pj 3942`). */
  codePhrases: string[];
  /** `>= 2` distinctive words or `>= 1` code phrase. */
  usable: boolean;
}

const MAX_WORDS = 8;
const MIN_WORD_LENGTH = 3;
const MIN_WORDS_FOR_GROUP = 2;

const ROMAN_NUMERALS = new Set([
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  'xi',
  'xii',
]);

/** Basic en/fr/es stopwords + `project`, `phase`. Includes Solr operator words (`and`/`or`/`not`). */
const STOPWORDS = new Set([
  // en
  'the',
  'and',
  'or',
  'not',
  'for',
  'of',
  'in',
  'on',
  'to',
  'with',
  'from',
  'by',
  'at',
  'an',
  'as',
  'is',
  'are',
  'be',
  'this',
  'that',
  'its',
  'into',
  'via',
  'under',
  'between',
  'through',
  'their',
  'our',
  // fr
  'les',
  'des',
  'du',
  'de',
  'la',
  'le',
  'et',
  'ou',
  'pour',
  'dans',
  'par',
  'sur',
  'aux',
  'une',
  'un',
  'au',
  'en',
  // es
  'los',
  'las',
  'del',
  'el',
  'y',
  'o',
  'para',
  'por',
  'con',
  'una',
  'uno',
  'al',
  'sin',
  // domain
  'project',
  'phase',
]);

/** Lowercase; non-alphanumerics -> space; collapse spaces. Accents are folded to ASCII. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(value: string | null | undefined): string[] {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(' ') : [];
}

function buildCodePhrases(code: string | null | undefined): string[] {
  const digits = normalizeText(code).match(/\d+/)?.[0];
  if (!digits) return [];
  const withoutZeros = digits.replace(/^0+/, '');
  const phrases = [`pj ${digits}`];
  if (withoutZeros && withoutZeros !== digits) {
    phrases.push(`pj ${withoutZeros}`);
  }
  return phrases;
}

export function buildProjectMatch(ctx: ProjectMatchContext): ProjectMatch {
  const excluded = new Set<string>([
    ...tokenize(ctx.code),
    ...tokenize(ctx.leadCenter),
    't',
    'pj',
  ]);

  const words: string[] = [];
  for (const token of tokenize(ctx.title)) {
    if (
      token.length < MIN_WORD_LENGTH ||
      STOPWORDS.has(token) ||
      ROMAN_NUMERALS.has(token) ||
      excluded.has(token) ||
      words.includes(token)
    ) {
      continue;
    }
    words.push(token);
    if (words.length === MAX_WORDS) break;
  }

  const codePhrases = buildCodePhrases(ctx.code);
  return {
    words,
    codePhrases,
    usable: words.length >= MIN_WORDS_FOR_GROUP || codePhrases.length > 0,
  };
}

/**
 * Solr clause for one project field:
 * `F:(w1 AND … AND wn) OR F:"pj 003942" OR F:"pj 3942"` (word group only with >= 2 words).
 * Returns `null` when the project is not usable (`KPSF-R-9`).
 */
export function buildProjectClause(
  field: string,
  ctx: ProjectMatchContext,
): string | null {
  const match = buildProjectMatch(ctx);
  if (!match.usable) return null;

  const parts: string[] = [];
  if (match.words.length >= MIN_WORDS_FOR_GROUP) {
    parts.push(`${field}:(${match.words.join(' AND ')})`);
  }
  for (const phrase of match.codePhrases) {
    parts.push(`${field}:"${phrase}"`);
  }
  return parts.join(' OR ');
}

/** Same semantics as the clause, evaluated on a label (whole-token match). */
export function labelMatchesProject(
  label: string | null | undefined,
  ctx: ProjectMatchContext,
): boolean {
  const match = buildProjectMatch(ctx);
  if (!match.usable) return false;

  const normalized = normalizeText(label);
  if (!normalized) return false;
  const padded = ` ${normalized} `;
  const tokens = new Set(normalized.split(' '));

  if (
    match.words.length >= MIN_WORDS_FOR_GROUP &&
    match.words.every((word) => tokens.has(word))
  ) {
    return true;
  }
  return match.codePhrases.some((phrase) => padded.includes(` ${phrase} `));
}
