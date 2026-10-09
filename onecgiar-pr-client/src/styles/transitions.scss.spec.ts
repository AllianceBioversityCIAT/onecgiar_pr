import { readFileSync } from 'fs';
import { join } from 'path';

// Contract test (jsdom cannot compute stacking contexts): the screen containers must not retain
// the fadeIn end state, or `app-pr-dialog` (fixed, z-index 1100) is trapped under topbar/sidebar.
describe('transitions.scss — container fade-in stacking context (P2-3874)', () => {
  const scss = readFileSync(join(__dirname, 'transitions.scss'), 'utf8');

  it('releases the fill-mode on .section_container and .detail_container, after the .fadeIn rule', () => {
    const override = /\.section_container,\s*\.detail_container\s*\{[^}]*animation-fill-mode:\s*backwards;[^}]*\}/;
    expect(scss).toMatch(override);
    expect(scss.search(override)).toBeGreaterThan(scss.indexOf('.fadeIn {'));
  });

  it('keeps fill-mode both for the plain .fadeIn utility', () => {
    const fadeIn = scss.match(/\.fadeIn\s*\{[^}]*\}/)?.[0] ?? '';
    expect(fadeIn).toContain('animation-fill-mode: both');
  });
});
