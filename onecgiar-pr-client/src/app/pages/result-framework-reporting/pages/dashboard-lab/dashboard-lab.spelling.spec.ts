import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * P2-3816 — the Reporting tab's "Section / Area of Work" filter groups its options under a header
 * that still read "Programme-level" (shown as PROGRAMME-LEVEL) after the P2-3505 British-to-American
 * sweep. The twin grouping in `programme-results.component.ts` already says "Program-level".
 * On the source on purpose: the computed lives in a component too heavy to mount for one label.
 */
describe('DashboardLabComponent · P2-3816 Program-level spelling', () => {
  const source = readFileSync(join(__dirname, 'dashboard-lab.component.ts'), 'utf8');

  it('labels the programme-level group "Program-level"', () => {
    expect(source).toContain("label: 'Program-level'");
  });

  it('shows no British "Programme" in any user-facing label', () => {
    expect(source).not.toMatch(/label:\s*['"`][^'"`]*Programme/);
  });
});
