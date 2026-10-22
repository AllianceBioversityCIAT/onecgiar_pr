// @akili-spec changes/kp-related-relevance-ranking
/**
 * `KRR-T-1` — relevance block, factors and tier (`design.md` §7.1, `KRR-R-5`, `KRR-R-6`,
 * `KRR-R-9`, `KRR-DD-2`, `KRR-DD-4`).
 *
 * Pure module (no Nest, no logger, no HTTP). It owns three things:
 * - the distinctive keywords of a project (`extractRelevanceKeywords`),
 * - the boost block the related query appends (`buildRelevanceBlock`),
 * - the factors and tier each related item carries (`evaluateProjectMatch`).
 *
 * Only `[a-z0-9]` tokens (the KPSF `normalizeText` whitelist) ever enter the block (`KRR-R-9`):
 * raw project text is never interpolated, operator words are stop words, and field names come only
 * from the adapter.
 */
import {
  MIN_WORD_LENGTH,
  normalizeText,
  ROMAN_NUMERALS,
  STOPWORDS,
  tokenize,
} from './project-match';

export interface RelevanceContext {
  title?: string | null;
  description?: string | null;
  /** Lead-center acronym (e.g. `CIP`): never a keyword. */
  leadCenter?: string | null;
  /** Project code (e.g. `P-1486-GCDT`): its tokens are never keywords (`KRR-T-6`). */
  code?: string | null;
}

/** Science Program of the project; either part may be missing. */
export interface ProjectProgram {
  code?: string | null;
  name?: string | null;
}

/**
 * The adapter fields the block reads. Declared structurally so this module stays free of
 * `repositories.config` imports (which will import this one): a `RepositoryAdapter` satisfies it
 * once `fields.subject` and `fields.program` exist (`KRR-T-2`).
 */
export interface RelevanceAdapter {
  fields: {
    subject: string;
    /** Undefined when the host has no affiliation field: the center boost is skipped. */
    affiliation?: string;
    program: string;
  };
}

/** Boost per factor (`design.md` §7.2, `KRR-DD-3`). */
export interface RelevanceWeights {
  subject: number;
  center: number;
  program: number;
}

/** The fields of a mapped item the factors read (`CgspaceItemDto`; `subjects` arrives in `KRR-T-3`). */
export interface RelevanceItemInput {
  subjects?: string[] | null;
  affiliations?: string[] | null;
  programAccelerators?: string[] | null;
}

export type ProjectMatchFactor = 'keywords' | 'center' | 'program';
export type ProjectMatchTier = 'strong' | 'partial' | 'weak' | 'none';

export interface ProjectMatchResult {
  tier: ProjectMatchTier;
  /** Satisfied factors, always in the order `keywords`, `center`, `program`. */
  factors: ProjectMatchFactor[];
}

const MAX_TITLE_KEYWORDS = 8;
const MAX_DESCRIPTION_KEYWORDS = 12;
/**
 * Longer tokens are not words worth boosting and would eat the `KRR-NFR-2` budget: 20 keywords (8 title + 12
 * description) of 30 characters plus two 200-character phrases stay under 2000 encoded characters.
 */
const MAX_KEYWORD_LENGTH = 30;
const MIN_FOLD_LENGTH = 4;
/**
 * Funding / administrative boilerplate (`KRR-T-6`): words common to most project descriptions that
 * say nothing about the subject matter and would crowd real topic words out of the capped pool.
 * Explicit and small on purpose; extend only with evidence from real descriptions.
 */
const BOILERPLATE_WORDS = new Set([
  'grant',
  'grants',
  'funding',
  'funded',
  'fund',
  'provide',
  'provides',
  'providing',
  'dedicated',
  'support',
  'supporting',
  'operation',
  'operations',
  'long',
  'term',
  'project',
  'projects',
  'program',
  'programme',
  'phase',
  'activities',
  'implementation',
  'international',
  'standards',
  'standard',
]);
/**
 * Longest center / program phrase the block emits (`KRR-NFR-2`). A phrase clause then encodes to at
 * most ~170 characters (spaces encode to 3), so after the longest ASCII related prefix the DTO
 * allows (~1770 encoded) one bounded clause still fits under 2000. A longer name is cut at a word
 * boundary: the shorter phrase still matches the full affiliation as a phrase prefix.
 */
export const MAX_PHRASE_LENGTH = 60;

const TIERS: ProjectMatchTier[] = ['none', 'weak', 'partial', 'strong'];

/**
 * Candidate forms of a word for plural-insensitive comparison: the word itself plus, for words of
 * 4+ letters, the word minus a trailing `s` (never after `ss`) and, only after s|x|z|ch|sh|o,
 * minus `es` (`rates` never reaches `rat`; `rates` -> {rates, rate}).
 * `potatoes` -> {potatoes, potatoe, potato}; `classes` -> {classes, classe, class}; `class` -> {class}.
 * Two words match when their form sets intersect, so the irregular `-oes`/`-ses` plurals line up
 * with their singular without a single lossy fold (`gene` still never matches `genebanks`).
 * Words under 4 letters (`gas`, `bus`) are never folded.
 */
export function pluralForms(word: string): Set<string> {
  const forms = new Set([word]);
  if (word.length < MIN_FOLD_LENGTH || !word.endsWith('s')) return forms;
  if (!word.endsWith('ss')) forms.add(word.slice(0, -1));
  if (/(?:s|x|z|ch|sh|o)es$/.test(word)) forms.add(word.slice(0, -2));
  return forms;
}

/** True when two words share a plural form (`potatoes` ~ `potato`). Whole-word, never a prefix. */
export function samePluralWord(a: string, b: string): boolean {
  const formsB = pluralForms(b);
  for (const form of pluralForms(a)) {
    if (formsB.has(form)) return true;
  }
  return false;
}

/**
 * Distinctive project words: up to 8 from the title, then up to 12 more from the description.
 * Same tokenizer, stop words, roman numerals and minimum length as the KPSF match; the lead-center
 * acronym, the project-code tokens, purely numeric tokens and funding boilerplate are excluded;
 * deduped on shared plural forms (`pluralForms`; the first spelling wins).
 */
export function extractRelevanceKeywords(ctx: RelevanceContext): string[] {
  const excluded = new Set([
    ...tokenize(ctx.leadCenter),
    ...tokenize(ctx.code),
  ]);
  const keywords: string[] = [];

  const take = (text: string | null | undefined, max: number): void => {
    let taken = 0;
    for (const token of tokenize(text)) {
      if (taken === max) return;
      if (
        token.length < MIN_WORD_LENGTH ||
        token.length > MAX_KEYWORD_LENGTH ||
        STOPWORDS.has(token) ||
        ROMAN_NUMERALS.has(token) ||
        excluded.has(token) ||
        /^\d+$/.test(token) ||
        BOILERPLATE_WORDS.has(token) ||
        keywords.some((kept) => samePluralWord(kept, token))
      ) {
        continue;
      }
      keywords.push(token);
      taken += 1;
    }
  };

  take(ctx.title, MAX_TITLE_KEYWORDS);
  take(ctx.description, MAX_DESCRIPTION_KEYWORDS);
  return keywords;
}

/**
 * `*:* OR <subject:kw^w>… OR <affiliation:"name"^w> OR <program:"…"^w>`; the caller wraps it in
 * `AND ( … )`. The program phrase is the program name, or its code when it has no name. Returns
 * `null` when no clause is usable, so the request stays what it is today (`KRR-R-3`).
 */
export function buildRelevanceBlock(
  adapter: RelevanceAdapter,
  keywords: readonly string[],
  centerName: string | null | undefined,
  program: ProjectProgram | null | undefined,
  weights: RelevanceWeights,
): string | null {
  const clauses: string[] = [];

  for (const keyword of keywords) {
    const token = normalizeText(keyword).replace(/ /g, '');
    if (token) {
      clauses.push(`${adapter.fields.subject}:${token}^${weights.subject}`);
    }
  }

  const center = boundPhrase(normalizeText(centerName));
  if (center && adapter.fields.affiliation) {
    clauses.push(`${adapter.fields.affiliation}:"${center}"^${weights.center}`);
  }

  const programPhrase = boundPhrase(
    normalizeText(program?.name) || normalizeText(program?.code),
  );
  if (programPhrase) {
    clauses.push(
      `${adapter.fields.program}:"${programPhrase}"^${weights.program}`,
    );
  }

  return clauses.length > 0 ? `*:* OR ${clauses.join(' OR ')}` : null;
}

/** Cuts an already-normalized phrase to `MAX_PHRASE_LENGTH`, at a word boundary when possible. */
function boundPhrase(phrase: string): string {
  if (phrase.length <= MAX_PHRASE_LENGTH) return phrase;
  const cut = phrase.slice(0, MAX_PHRASE_LENGTH + 1);
  const boundary = cut.lastIndexOf(' ');
  return (
    boundary > 0 ? cut.slice(0, boundary) : phrase.slice(0, MAX_PHRASE_LENGTH)
  ).trim();
}

// ---------------------------------------------------------------------------------------------
// Program rule — port of the client `matchesTaggedMetadata` (KPAM, `kp-cgspace-browse.component.ts`).
// Keep it identical; the vectors in `project-relevance.spec.ts` are copied from the client spec
// (`KRR-DD-4`). Do not "improve" one side only.
// ---------------------------------------------------------------------------------------------

function expandCompactIdentifiers(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

function normalizeMatchString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactMatchString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchesTaggedMetadata(
  tags: string[] | null | undefined,
  rawCode: string,
  rawName: string,
): boolean {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return false;
  }

  const code = expandCompactIdentifiers(rawCode.trim());
  const name = expandCompactIdentifiers(rawName.trim());
  if (!code && !name) {
    return false;
  }

  const normCode = normalizeMatchString(code);
  const compactCode = compactMatchString(code);
  const normName = normalizeMatchString(name);
  const compactName = compactMatchString(name);

  return tags.some((tag) => {
    if (!tag || typeof tag !== 'string') return false;

    const normTag = normalizeMatchString(tag);
    const compactTag = compactMatchString(tag);
    if (!normTag && !compactTag) return false;

    if (compactCode) {
      if (compactTag === compactCode || normTag === normCode) return true;
      const tokens = normTag.split(' ');
      if (tokens.includes(normCode) || tokens.includes(compactCode))
        return true;
      if (
        compactTag.startsWith(compactCode) ||
        compactTag.includes(compactCode)
      )
        return true;
    }

    if (compactName && compactName.length >= 3) {
      if (compactTag === compactName || normTag === normName) return true;
      if (normTag.includes(normName) || compactTag.includes(compactName))
        return true;
      if (
        compactTag.length >= 3 &&
        (normName.includes(normTag) || compactName.includes(compactTag))
      ) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Factors an item satisfies, in the fixed order `keywords`, `center`, `program`, and the tier by
 * their count (3/2/1/0 -> strong/partial/weak/none). All factors weigh the same (`KRR-R-6`).
 */
export function evaluateProjectMatch(
  item: RelevanceItemInput,
  keywords: readonly string[],
  centerName: string | null | undefined,
  program: ProjectProgram | null | undefined,
): ProjectMatchResult {
  const factors: ProjectMatchFactor[] = [];

  if (matchesKeywords(item.subjects, keywords)) factors.push('keywords');
  if (matchesCenter(item.affiliations, centerName)) factors.push('center');
  if (
    matchesTaggedMetadata(
      item.programAccelerators,
      program?.code ?? '',
      program?.name ?? '',
    )
  ) {
    factors.push('program');
  }

  return { tier: TIERS[factors.length], factors };
}

/** Whole-word, case-insensitive, plural-folded: `gene` never matches `genebanks`. */
function matchesKeywords(
  subjects: string[] | null | undefined,
  keywords: readonly string[],
): boolean {
  if (!subjects || subjects.length === 0 || keywords.length === 0) return false;
  const wanted = keywords.map((keyword) => keyword.toLowerCase());
  return subjects.some((subject) =>
    tokenize(subject).some((word) =>
      wanted.some((keyword) => samePluralWord(keyword, word)),
    ),
  );
}

/** Full-name equality, case- and accent-insensitive. An acronym-only context has no name. */
function matchesCenter(
  affiliations: string[] | null | undefined,
  centerName: string | null | undefined,
): boolean {
  const center = normalizeText(centerName);
  if (!center || !affiliations) return false;
  return affiliations.some(
    (affiliation) => normalizeText(affiliation) === center,
  );
}
