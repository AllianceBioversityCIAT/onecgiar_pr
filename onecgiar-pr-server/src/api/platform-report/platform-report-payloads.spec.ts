import type {
  PdfGenerateUrlPayload,
  PdfGenerateUrlResponse,
} from './platform-report-payloads';

describe('platform-report-payloads (shape validation)', () => {
  describe('PdfGenerateUrlPayload', () => {
    it('should accept a valid payload shape', () => {
      const payload: PdfGenerateUrlPayload = {
        data: { foo: 'bar' },
        paperWidth: '600px',
        paperHeight: '1000px',
        templateName: 'results_p25',
        bucketName: 'my-bucket',
        fileName: 'report.pdf',
        credentials: '{}',
      };
      expect(payload.data).toBeDefined();
      expect(payload.paperWidth).toBe('600px');
      expect(payload.paperHeight).toBe('1000px');
      expect(payload.templateName).toBe('results_p25');
      expect(payload.bucketName).toBe('my-bucket');
      expect(payload.fileName).toBe('report.pdf');
      expect(payload.credentials).toBeDefined();
    });

    it('should require all payload fields', () => {
      const requiredKeys: (keyof PdfGenerateUrlPayload)[] = [
        'data',
        'paperWidth',
        'paperHeight',
        'templateName',
        'bucketName',
        'fileName',
        'credentials',
      ];
      const payload: PdfGenerateUrlPayload = {
        data: {},
        paperWidth: '',
        paperHeight: '',
        templateName: '',
        bucketName: '',
        fileName: '',
        credentials: '',
      };
      requiredKeys.forEach((key) => {
        expect(payload).toHaveProperty(key);
      });
    });
  });

  describe('PdfGenerateUrlResponse', () => {
    it('should accept a valid response shape', () => {
      const response: PdfGenerateUrlResponse = {
        data: { url: 'https://example.com/file.pdf' },
        status: 200,
        description: 'OK',
        timestamp: '2026-02-19T12:00:00.000Z',
        path: '/api/reports/pdf/generate-url',
      };
      expect(response.data.url).toBe('https://example.com/file.pdf');
      expect(response.status).toBe(200);
    });

    it('should require data.url and status', () => {
      const response: PdfGenerateUrlResponse = {
        data: { url: 'https://s3.example.com/doc.pdf' },
        status: 200,
      };
      expect(response.data).toHaveProperty('url');
      expect(typeof response.data.url).toBe('string');
      expect(response.status).toBe(200);
    });
  });
});
