import {
  PLATFORM_REPORT_CONSTANTS,
  isIpsrP25ResultType,
} from './platform-report.constants';

describe('PLATFORM_REPORT_CONSTANTS', () => {
  it('should define P25_ACRONYM as P25', () => {
    expect(PLATFORM_REPORT_CONSTANTS.P25_ACRONYM).toBe('P25');
  });

  it('should define REPORT_EVENT_PATTERNS with legacy and P25 patterns', () => {
    expect(PLATFORM_REPORT_CONSTANTS.REPORT_EVENT_PATTERNS.PDF_GENERATE).toBe(
      'pdf.generate',
    );
    expect(
      PLATFORM_REPORT_CONSTANTS.REPORT_EVENT_PATTERNS.PDF_GENERATE_URL,
    ).toBe('pdf.generateUrl');
  });

  it('should define RESULT_P25 template and paper dimensions', () => {
    expect(PLATFORM_REPORT_CONSTANTS.RESULT_P25.TEMPLATE_NAME).toBe(
      'results_p25',
    );
    expect(PLATFORM_REPORT_CONSTANTS.RESULT_P25.PAPER_WIDTH).toBe('600px');
    expect(PLATFORM_REPORT_CONSTANTS.RESULT_P25.PAPER_HEIGHT).toBe('1000px');
  });

  it('should define IPSR_2025 template for IPSR P25 reports', () => {
    expect(PLATFORM_REPORT_CONSTANTS.IPSR_2025.TEMPLATE_NAME).toBe('ipsr_p25');
  });

  it('should identify IPSR result types via isIpsrP25ResultType', () => {
    expect(isIpsrP25ResultType(10)).toBe(true);
    expect(isIpsrP25ResultType(11)).toBe(true);
    expect(isIpsrP25ResultType(9)).toBe(false);
    expect(isIpsrP25ResultType(null)).toBe(false);
    expect(isIpsrP25ResultType(undefined)).toBe(false);
  });
});
