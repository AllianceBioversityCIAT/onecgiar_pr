import { DateFormatter } from './date-formatter';

describe('DateFormatter', () => {
  describe('forFilename', () => {
    it('should return date and time without separators (digits only)', () => {
      const res = DateFormatter.forFilename(new Date(2026, 0, 23, 15, 4, 0));

      expect(res.date).toMatch(/^\d{8}$/);
      expect(res.time).toMatch(/^\d{3,4}$/);
    });
  });
});
