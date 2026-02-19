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

  /** P25 report payload (hardcoded for now). */
  P25: {
    TEMPLATE_NAME: 'results_p25',
    PAPER_WIDTH: '600px',
    PAPER_HEIGHT: '1000px',
  } as const,
} as const;
