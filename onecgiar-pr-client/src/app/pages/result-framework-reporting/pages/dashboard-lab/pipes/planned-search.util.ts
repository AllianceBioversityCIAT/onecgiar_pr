/**
 * Planned ToC text search priorities:
 * 1 — exact full phrase
 * 2 — all words present (any order / split)
 * 3 — average fuzzy similarity (typos), lowest priority
 */

/** 0 = no match; 1 = phrase; 2 = tokens unordered; 3 = similar (typos). */
export type PlannedSearchRank = 0 | 1 | 2 | 3;

export interface ParsedPlannedSearch {
  /** Normalized full query (lowercased, collapsed spaces). */
  phrase: string;
  /** Non-empty words from the phrase. */
  tokens: string[];
}

export interface PlannedSearchEvaluation {
  rank: PlannedSearchRank;
  /** 0..1 — higher is better; used to order within the same rank. */
  score: number;
  /** Haystack words chosen as fuzzy counterparts (for highlighting). */
  similarWords: string[];
}

/** Minimum average token similarity to accept a rank-3 hit. */
export const PLANNED_SEARCH_SIMILARITY_THRESHOLD = 0.72;
/** Tokens shorter than this require an exact substring (avoid noisy fuzzy on "ma"). */
const MIN_FUZZY_TOKEN_LEN = 3;

export function parsePlannedSearch(query: string | null | undefined): ParsedPlannedSearch {
  const phrase = (query ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const tokens = phrase ? phrase.split(' ').filter(Boolean) : [];
  return { phrase, tokens };
}

/** Build the haystack used for indicator matching. */
export function indicatorSearchHaystack(ind: any): string {
  return `${ind?.indicator_description ?? ''} ${ind?.type_name ?? ''} ${ind?.__hlo ?? ''} ${ind?.__aowCode ?? ''} ${ind?.center_acronym ?? ''}`;
}

export function plannedSearchEvaluate(haystack: string, parsed: ParsedPlannedSearch): PlannedSearchEvaluation {
  const { phrase, tokens } = parsed;
  if (!phrase) return { rank: 1, score: 1, similarWords: [] };

  const hay = haystack.toLowerCase();

  if (hay.includes(phrase)) {
    return { rank: 1, score: 1, similarWords: [] };
  }

  if (tokens.every(t => hay.includes(t))) {
    return { rank: tokens.length > 1 ? 2 : 1, score: 0.95, similarWords: [] };
  }

  const fuzzy = averageTokenSimilarity(hay, tokens);
  if (fuzzy.avg >= PLANNED_SEARCH_SIMILARITY_THRESHOLD) {
    return { rank: 3, score: fuzzy.avg, similarWords: fuzzy.matchedWords };
  }

  return { rank: 0, score: 0, similarWords: [] };
}

/**
 * 0 = no match
 * 1 = full phrase
 * 2 = every token present (unordered)
 * 3 = average fuzzy similarity above threshold
 */
export function plannedSearchRank(haystack: string, parsed: ParsedPlannedSearch): PlannedSearchRank {
  return plannedSearchEvaluate(haystack, parsed).rank;
}

export function plannedSearchMatches(haystack: string, parsed: ParsedPlannedSearch): boolean {
  return plannedSearchRank(haystack, parsed) > 0;
}

/** Sort helper: 1 → 2 → 3 → 0 (no match last). */
export function comparePlannedSearchRank(a: PlannedSearchRank, b: PlannedSearchRank): number {
  const av = a === 0 ? 99 : a;
  const bv = b === 0 ? 99 : b;
  return av - bv;
}

export function comparePlannedSearchEvaluation(a: PlannedSearchEvaluation, b: PlannedSearchEvaluation): number {
  const byRank = comparePlannedSearchRank(a.rank, b.rank);
  if (byRank !== 0) return byRank;
  return b.score - a.score;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Collect [start, end) ranges for the phrase, each token, and fuzzy similar words;
 * merge overlaps; wrap each range in a yellow mark.
 */
export function highlightPlannedSearch(text: string, query: string | null | undefined): string {
  const raw = text == null ? '' : String(text);
  const parsed = parsePlannedSearch(query);
  if (!raw) return '';
  if (!parsed.phrase) return escapeHtml(raw);

  const lower = raw.toLowerCase();
  const ranges: Array<[number, number]> = [];
  const evalResult = plannedSearchEvaluate(raw, parsed);

  const pushAll = (needle: string) => {
    if (!needle) return;
    const n = needle.toLowerCase();
    let from = 0;
    while (from <= lower.length - n.length) {
      const idx = lower.indexOf(n, from);
      if (idx < 0) break;
      ranges.push([idx, idx + n.length]);
      from = idx + n.length;
    }
  };

  pushAll(parsed.phrase);
  for (const token of parsed.tokens) pushAll(token);
  for (const word of evalResult.similarWords) pushAll(word);

  const merged = mergeRanges(ranges);
  if (!merged.length) return escapeHtml(raw);

  let out = '';
  let cursor = 0;
  for (const [start, end] of merged) {
    if (cursor < start) out += escapeHtml(raw.slice(cursor, start));
    out += `<mark class="planned-search-hit">${escapeHtml(raw.slice(start, end))}</mark>`;
    cursor = end;
  }
  if (cursor < raw.length) out += escapeHtml(raw.slice(cursor));
  return out;
}

function haystackWords(hay: string): string[] {
  return hay.split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * For each query token, pick the best-matching word in the haystack.
 * Short tokens (< 3) must appear exactly; longer ones use Levenshtein similarity.
 */
function averageTokenSimilarity(hay: string, tokens: string[]): { avg: number; matchedWords: string[] } {
  const words = haystackWords(hay);
  if (!tokens.length) return { avg: 0, matchedWords: [] };

  let sum = 0;
  const matchedWords: string[] = [];

  for (const token of tokens) {
    if (token.length < MIN_FUZZY_TOKEN_LEN) {
      if (hay.includes(token)) {
        sum += 1;
        matchedWords.push(token);
      }
      continue;
    }

    let best = 0;
    let bestWord = '';
    for (const word of words) {
      const s = stringSimilarity(token, word);
      if (s > best) {
        best = s;
        bestWord = word;
      }
    }
    sum += best;
    if (best >= PLANNED_SEARCH_SIMILARITY_THRESHOLD && bestWord) {
      matchedWords.push(bestWord);
    }
  }

  return { avg: sum / tokens.length, matchedWords: unique(matchedWords) };
}

/** 1 = identical; 0 = totally different. Uses normalized Levenshtein (+ contain bonus). */
export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;

  // Two-row DP keeps memory tiny for short tokens.
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function mergeRanges(ranges: Array<[number, number]>): Array<[number, number]> {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: Array<[number, number]> = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1];
    const cur = sorted[i];
    if (cur[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], cur[1]);
    } else {
      out.push(cur);
    }
  }
  return out;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
