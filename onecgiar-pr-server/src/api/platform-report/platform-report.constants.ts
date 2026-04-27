/**
 * Portfolio and report flow constants.
 * Used to route PDF generation to the correct pattern (legacy vs P25).
 */
export const PLATFORM_REPORT_CONSTANTS = {
  /** Portfolio acronym that uses the pdf.generateUrl flow (P25). */
  P25_ACRONYM: 'P25',

  /** RabbitMQ event patterns for the Reports microservice. */
  REPORT_EVENT_PATTERNS: {
    /** Legacy flow: template + options, generates PDF and uploads to S3. */
    PDF_GENERATE: 'pdf.generate',
    /** P25 flow: URL-based generation with templateName and paper size. */
    PDF_GENERATE_URL: 'pdf.generateUrl',
  } as const,

  /**
   * Result types that use the IPSR PDF template (`ipsr_p25`) when portfolio is P25.
   * Aligns with IPSR SQL/views (innovation package = 10, complementary = 11).
   */
  IPSR_P25_RESULT_TYPE_IDS: [10, 11] as const,

  /** Default P25 result report — standard results template. */
  RESULT_P25: {
    TEMPLATE_NAME: 'results_p25',
    PAPER_WIDTH: '600px',
    PAPER_HEIGHT: '1000px',
  } as const,

  /** P25 bilateral result report (non-SGP-02 bilateral branch). */
  RESULT_P25_BILATERAL: {
    TEMPLATE_NAME: 'results_bilaterals_p25',
    PAPER_WIDTH: '600px',
    PAPER_HEIGHT: '1000px',
  } as const,

  /** IPSR innovation package report for P25 reporting phases. */
  IPSR_2025: {
    TEMPLATE_NAME: 'ipsr_p25',
    PAPER_WIDTH: '600px',
    PAPER_HEIGHT: '1000px',
  } as const,
} as const;

/** Union of P25 `pdf.generateUrl` layout blocks (result, bilateral, IPSR). */
export type P25PdfGenerateUrlLayout =
  | (typeof PLATFORM_REPORT_CONSTANTS)['RESULT_P25']
  | (typeof PLATFORM_REPORT_CONSTANTS)['RESULT_P25_BILATERAL']
  | (typeof PLATFORM_REPORT_CONSTANTS)['IPSR_2025'];

/** True when the result should use the IPSR P25 PDF template (portfolio must still be P25). */
export function isIpsrP25ResultType(
  resultTypeId: number | null | undefined,
): boolean {
  if (resultTypeId == null || Number.isNaN(Number(resultTypeId))) {
    return false;
  }
  return (
    PLATFORM_REPORT_CONSTANTS.IPSR_P25_RESULT_TYPE_IDS as readonly number[]
  ).includes(Number(resultTypeId));
}
