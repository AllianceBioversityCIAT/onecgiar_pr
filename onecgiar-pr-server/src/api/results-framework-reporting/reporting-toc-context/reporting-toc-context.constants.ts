/**
 * Reference phase UUIDs from ToC Integration (global phases).
 * Used by validation tooling; runtime resolution always reads from `version.toc_pahse_id`.
 */
export const REFERENCE_REPORTING_TOC_PHASES: Readonly<Record<number, string>> =
  {
    2025: '99134294-d7a1-4966-a63e-227c9e29b9fb',
    2026: '7baf200a-c958-4ded-9894-6557a94cae18',
  };

export const REPORTING_TOC_APP_MODULE_ID = 1;
