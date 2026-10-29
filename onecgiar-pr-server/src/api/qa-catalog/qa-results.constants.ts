// @akili-spec quality-assurance/qa-results-feed
/**
 * QRF-DD-12 / OQ-5 (confirmed 2026-10-28): contract limits live in code, in this one file, and are
 * changed by code only. QA must know them, so they are documented in `docs/qa-catalog.en.md`.
 */
export const QA_RESULTS_PAGE_SIZE_DEFAULT = 100;
export const QA_RESULTS_PAGE_SIZE_MAX = 200;

/** Plausibility range of `phase_year` (QRF-R-2). Signed off by the owner on 2026-10-28; 1999 gets 400 here while /api/qa/catalog answers 404. */
export const QA_RESULTS_PHASE_YEAR_MIN = 2000;
export const QA_RESULTS_PHASE_YEAR_MAX = 2100;

/**
 * Upper bound of `page` (QRF-R-5; NFR Security QAS-10 / AC-9). Without it `page=1e19` passes
 * `@IsInt()` and `(page - 1) * page_size` reaches 1e21, which JS prints as `1e+21` in the OFFSET:
 * a MySQL syntax error that would surface as a 500 carrying parser text. At 1,000,000 pages the
 * largest OFFSET is 199,999,800 (far below 2^53), and it is above any plausible portfolio size.
 */
export const QA_RESULTS_PAGE_MAX = 1_000_000;

/** Largest id a `program_ids` value may carry: the signed 32-bit range of the CLARISA id column. */
export const QA_RESULTS_PROGRAM_ID_MAX = 2_147_483_647;

/** QRF-DD-12 / OQ-5 (confirmed 2026-10-28): most `result_ids` one `details` call may carry. */
export const QA_RESULTS_BATCH_MAX = 50;

/** Largest `result_ids` value: the signed 32-bit range of `result.id`. */
export const QA_RESULTS_RESULT_ID_MAX = 2_147_483_647;

/** Longest `field_keys` entry; a longer one cannot be a catalog key and is not echoed back (QRF-R-7). */
export const QA_RESULTS_FIELD_KEY_MAX_LENGTH = 200;
