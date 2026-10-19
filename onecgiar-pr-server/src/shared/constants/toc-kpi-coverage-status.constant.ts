import { ResultStatusData } from './result-status.enum';

/**
 * TKP-R-2 (toc-kpi-progress) — the result statuses that make a ToC KPI count
 * as "covered": Quality Assessed (2) and Submitted (3). Editing (1) is a draft
 * and does not count. Single-homed here, beside
 * `W1_W2_RESULT_SOURCE_FILTER`, so a business change to TKP-OQ-2 is a
 * one-line edit that the repository query picks up through bound parameters.
 */
export const TOC_KPI_COVERAGE_STATUS_IDS: readonly number[] = [
  ResultStatusData.QualityAssessed.value,
  ResultStatusData.Submitted.value,
];
