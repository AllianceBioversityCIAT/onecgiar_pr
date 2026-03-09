/**
 * Payload for the pdf.generateUrl pattern (P25 portfolio).
 * Consumed by the Reports microservice.
 */
export interface PdfGenerateUrlPayload {
  data: Record<string, unknown>;
  paperWidth: string;
  paperHeight: string;
  templateName: string;
  bucketName: string;
  fileName: string;
  /** Auth header for the Reports microservice (e.g. JSON string with username/password). */
  credentials: string;
}

/**
 * Response from the Reports microservice for pdf.generateUrl (P25).
 * The URL is returned directly; File Management is not used.
 */
export interface PdfGenerateUrlResponse {
  data: { url: string };
  status: number;
  description?: string;
  timestamp?: string;
  path?: string;
}
