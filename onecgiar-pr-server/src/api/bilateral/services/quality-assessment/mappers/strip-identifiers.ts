// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)

/**
 * Final denylist pass over the definitions-only payload (design.md §5 "Payload builder";
 * BIL-QAI-R-2 "Labels, never identifiers"). Recursively drops any object key matching
 * {@link DENYLIST_KEY_PATTERN} (`*_id`, `id`, `*_code`) and any bare integer value whose key
 * is not on {@link NUMERIC_LABEL_ALLOWLIST} (or does not look like a year — see
 * {@link isNumericLabelAllowed}).
 *
 * This is a safety net, not the mapping logic: the section/type-specific mappers already
 * project labels only, so a correct mapper should leave this pass a no-op. It exists so a
 * mapper regression (a stray id slipping through) fails the fixture tests instead of
 * reaching the AI service.
 *
 * Callers apply this only to the payload's `result` and `sections` content — never to
 * `request_id` (the UUID that identifies the call, not the result — the one identifier the
 * contract allows) or `constraints` (only `timeout_seconds`, already numeric-by-nature and
 * out of scope of this pass by construction).
 */

const DENYLIST_KEY_PATTERN = /_id$|^id$|_code$/;

/**
 * Exact label keys the section/type-specific mappers use for legitimately numeric-by-nature
 * values (counts, quantities). Single source of truth: if a mapper introduces a new numeric
 * label, add it here or it will be silently dropped by the pass.
 */
export const NUMERIC_LABEL_ALLOWLIST: ReadonlySet<string> = new Set<string>([
  'quantity',
  'timeout_seconds',
  'Quantity',
  // v0.1 flat labels — superseded by the v0.2 typed objects below, kept here in case an older
  // fixture or caller still emits them.
  'Number of women trained',
  'Number of men trained',
  'Number of non-binary people trained',
  'Number of people trained whose gender is unknown',
  'Number of women using the innovation',
  'Number of men using the innovation',
  'Number of women youth using the innovation',
  'Number of men youth using the innovation',
  // v0.2 typed-object keys (BIL-QAI-T-4b, design.md §4.5): plain-word-keyed counts and amounts
  // inside `"Number of people trained"`, `"Number of people using"` and `"USD amount"` /
  // `"Investment (USD)"`. Design.md §5 "Payload builder — v0.2 amendments" states these are
  // "already inside the numeric-by-nature allowlist" — they were not; this task adds them so a
  // v0.2 typed count/amount is not silently dropped by this pre-existing safety net.
  'total',
  'female',
  'male',
  'non_binary',
  'unknown',
  'women',
  'men',
  'women_youth',
  'men_youth',
  'amount',
]);

/** Years (e.g. "CGSpace year", "WoS year", "Issue year") are numeric-by-nature by suffix. */
const YEAR_KEY_PATTERN = /year/i;

export function isNumericLabelAllowed(key: string): boolean {
  if (NUMERIC_LABEL_ALLOWLIST.has(key)) {
    return true;
  }
  return YEAR_KEY_PATTERN.test(key);
}

export function stripIdentifiers<T>(value: T): T {
  return walk(value) as T;
}

function walk(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => walk(item));
  }

  if (value !== null && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, raw] of Object.entries(input)) {
      if (DENYLIST_KEY_PATTERN.test(key)) {
        continue;
      }

      if (
        typeof raw === 'number' &&
        Number.isInteger(raw) &&
        !isNumericLabelAllowed(key)
      ) {
        continue;
      }

      output[key] = walk(raw);
    }

    return output;
  }

  return value;
}
