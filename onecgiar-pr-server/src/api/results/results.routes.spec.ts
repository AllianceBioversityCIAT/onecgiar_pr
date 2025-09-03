import { ResultsRoutes } from './results.routes';

describe('ResultsRoutes', () => {
  it('should be an array of route configs', () => {
    expect(Array.isArray(ResultsRoutes)).toBe(true);
    expect(ResultsRoutes.length).toBeGreaterThan(0);
  });

  it('contains expected base paths', () => {
    const paths = ResultsRoutes.map((r) => r.path);
    expect(paths).toContain('gender-tag-levels');
    expect(paths).toContain('results-by-initiatives');
    expect(paths).toContain('results-knowledge-products');
    expect(paths).toContain('result-folders');
  });
});

