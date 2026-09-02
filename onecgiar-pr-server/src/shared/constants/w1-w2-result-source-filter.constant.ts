/**
 * OSF-DD-2 (FIND-01) — the population predicate every W1/W2 result count in
 * PRMS MUST share: `r.source` values other than `'Result'` are bilateral/API
 * results and must never enter a W1/W2 population.
 *
 * Single-homed here, in `shared/constants/`, deliberately — not in either
 * consuming service — so importing it never creates a circular dependency
 * between `api/results/results.service.ts` (the science-program progress
 * card) and `api/results-framework-reporting/results-framework-reporting.service.ts`
 * (the Overview's scope buckets). Both filter the *same* W1/W2 population;
 * this constant is the one place that population's source predicate is
 * declared, so the two cannot silently drift apart (measured impact of
 * drifting: 365 vs 556 results — a 52% inflation).
 */
export const W1_W2_RESULT_SOURCE_FILTER: readonly string[] = ['Result'];
