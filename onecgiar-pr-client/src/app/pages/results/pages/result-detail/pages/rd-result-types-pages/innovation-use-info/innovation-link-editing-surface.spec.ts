import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { INNOVATION_LINK_QUESTION } from '../../../../../../../shared/services/global/qa-innovation-development-results.service';

/**
 * P2-3424 — ONE editing surface for the QA'd Innovation Development link, statically enforced.
 *
 * The PO asked for the question to be shown in the Innovation Use section (10 Sep 2026). It used to be
 * asked in Contributors and partners, and both questions answer the SAME stored field
 * (`results_innovations_use.has_innovation_link` + the `linked_result` table). Two surfaces over one
 * answer is not a cosmetic duplication: it is the defect P2-3199 removed, where whichever section was
 * saved last overwrote the other and dropped the stored links.
 *
 * Why a source-level guard and not a DOM one: the duplication is invisible to any single component
 * test. Each surface passes its own spec in isolation — the defect only exists in the pair. Re-adding
 * the block to the other template would ship green.
 */
describe('the QA’d Innovation Development link has exactly one editing surface (P2-3424)', () => {
  const RESULT_DETAIL = join(__dirname, '..', '..', '..');
  const CONTRIBUTORS = join(RESULT_DETAIL, 'pages', 'rd-contributors-and-partners', 'rd-contributors-and-partners.component.html');
  const HERE = join(__dirname, 'innovation-use-info.component.html');

  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (entry.endsWith('.html')) out.push(full);
    }
    return out;
  };

  /** Comments stripped: prose that names a binding is not a rendered binding. */
  const markup = (file: string) => readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');

  const templates = walk(RESULT_DETAIL);

  it('finds the result-detail templates at all (guards against this file moving)', () => {
    expect(templates.length).toBeGreaterThan(10);
    expect(templates).toContain(CONTRIBUTORS);
    expect(templates).toContain(HERE);
  });

  it('renders the story’s question in exactly ONE template, and it is the Innovation Use section', () => {
    const asking = templates.filter(file => {
      const html = markup(file);
      return html.includes('innovationLinkQuestion') || html.includes(INNOVATION_LINK_QUESTION);
    });

    expect(asking).toEqual([HERE]);
  });

  it('takes the whole linked/bundled block out of Contributors and partners for these results', () => {
    // Not "removes the 2026 branch": dropping only that branch hands the question to the legacy
    // `@if` right below it, which writes the very same field. The gate has to wrap the block.
    const html = markup(CONTRIBUTORS);
    expect(html).toContain('!showsQaInnovationLink()');
    expect(html).not.toContain('cp-field-has_innovation_link~qa-innovation');
    expect(html).not.toContain('cp-field-linked_results~qa-innovation');
  });

  it('leaves the legacy controls of that section untouched — pre-2026 and the other result types', () => {
    const html = markup(CONTRIBUTORS);
    expect(html).toContain('cp-field-has_innovation_link"');
    expect(html).toContain('cp-field-has_innovation_link~generic');
    expect(html).toContain('cp-field-linked_results"');
  });

  /**
   * Both gates must read the SAME threshold and result type. A local copy of the year is how the
   * bilateral twin drifted (its own `INNOVATION_LINK_MIN_PHASE_YEAR = 2026`), and here a drift would
   * open the window where NEITHER surface asks the question — or BOTH do.
   */
  it('derives both gates from the shared constants, with no local year literal', () => {
    const contributorsTs = readFileSync(join(RESULT_DETAIL, 'pages', 'rd-contributors-and-partners', 'rd-contributors-and-partners.component.ts'), 'utf8');
    const hereTs = readFileSync(join(__dirname, 'innovation-use-info.component.ts'), 'utf8');

    for (const ts of [contributorsTs, hereTs]) {
      expect(ts).toContain('INNOVATION_LINK_MIN_PHASE_YEAR');
      expect(ts).toContain('INNOVATION_USE_RESULT_TYPE_ID');
      expect(ts).not.toMatch(/INNOVATION_LINK_MIN_PHASE_YEAR\s*=\s*\d/);
    }
  });
});
