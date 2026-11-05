/**
 * INC-167646 — compare a Progress Tracker result type with the indicator's PRMS category.
 *
 * The vocabulary is the one the pull-bridge guide lists (`result_type` slugs) plus the labels
 * PRMS shows on a Reporting row (`result_type_name`). Anything else does not match: this file
 * never guesses a category from a free-text rationale.
 */

export type PtTypologyTone = 'aligned' | 'divergent' | 'none';

const CANONICAL: Record<string, string> = {
  knowledge_product: 'knowledge_product',
  'knowledge product': 'knowledge_product',
  'knowledge products': 'knowledge_product',
  innovation_development: 'innovation_development',
  'innovation development': 'innovation_development',
  innovation_use: 'innovation_use',
  'innovation use': 'innovation_use',
  capacity_sharing: 'capacity_sharing',
  'capacity sharing': 'capacity_sharing',
  'capacity sharing for development': 'capacity_sharing',
  policy_change: 'policy_change',
  'policy change': 'policy_change',
  other_output: 'other_output',
  'other output': 'other_output',
  'other outputs': 'other_output',
  other_outcome: 'other_outcome',
  'other outcome': 'other_outcome',
  'other outcomes': 'other_outcome'
};

/** `null` when the text is not one of the result types PRMS and Progress Tracker share. */
export function canonicalResultType(value: string | null | undefined): string | null {
  const key = (value ?? '').trim().toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ');
  if (!key) return null;
  return CANONICAL[key] ?? CANONICAL[key.replace(/ /g, '_')] ?? null;
}

/**
 * Blue (`aligned`) when every recognised drafted type is the indicator's category.
 * Yellow (`divergent`) when a recognised type is a different category.
 * No flag (`none`) when there is no indicator category, or no recognised drafted type —
 * a missing type is not treated as a match.
 */
export function ptTypologyTone(indicatorType: string | null | undefined, draftedTypes: readonly (string | null | undefined)[]): PtTypologyTone {
  const expected = canonicalResultType(indicatorType);
  const known = draftedTypes.map(canonicalResultType).filter((type): type is string => !!type);
  if (!expected || !known.length) return 'none';
  return known.every(type => type === expected) ? 'aligned' : 'divergent';
}
