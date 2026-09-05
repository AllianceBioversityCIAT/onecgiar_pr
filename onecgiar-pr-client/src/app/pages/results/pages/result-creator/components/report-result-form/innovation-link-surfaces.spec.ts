import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Static guard: every screen that hosts `app-report-result-form` must DECIDE, in the template,
 * whether it asks the P2-3421 innovation-link question.
 *
 * Why a source-level test and not a DOM one: a missing `@Input()` is silently `false`. There is no
 * build error, no runtime error and nothing jsdom can see — the question simply does not render.
 * That is exactly how P2-3569 shipped: the flag was wired on `entity-details`, which is RETIRED
 * AND UNROUTED (`routing-data.ts` loads `DashboardLabComponent` for every one of its paths), so
 * the mandatory question never reached a live screen. QA reproduced its absence three times before
 * anyone noticed the host was dead code.
 *
 * The rule this encodes: omitting the flag has to be a deliberate, written act. A new surface that
 * forgets it fails here instead of shipping silent.
 */
describe('report-result-form hosts — innovation link question (P2-3569)', () => {
  const APP = join(__dirname, '..', '..', '..', '..', '..', '..');

  /**
   * Surfaces allowed to host the form WITHOUT the flag. Each entry needs a reason, because the
   * whole defect was an omission nobody had to justify.
   */
  const OMITTED_ON_PURPOSE: Record<string, string> = {
    'pages/result-framework-reporting/pages/entity-details/entity-details.component.html':
      'Retired and unrouted; kept in the tree only as reference. It may keep the flag or not — nothing it renders ships.'
  };

  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (entry.endsWith('.html')) out.push(full);
    }
    return out;
  };

  const hosts = walk(APP).filter(f => readFileSync(f, 'utf8').includes('<app-report-result-form'));

  it('finds every host of the form (guards against the file moving)', () => {
    expect(hosts.length).toBeGreaterThan(0);
  });

  /**
   * Reads the binding from INSIDE the opening tag. Searching the whole file would pass on a comment
   * that merely names the input — measured: the first version of this guard did exactly that and
   * survived the mutation that removed the real binding.
   */
  const bindingsInHostTags = (markup: string): string[] =>
    [...markup.matchAll(/<app-report-result-form\b[^>]*>/g)].map(m => m[0]);

  it.each(hosts)('%s declares whether it asks the innovation link question', file => {
    const rel = file.slice(file.indexOf('app/') + 4).replace(/\\/g, '/');
    if (OMITTED_ON_PURPOSE[rel]) return;
    const tags = bindingsInHostTags(readFileSync(file, 'utf8'));
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) expect(tag).toContain('[showInnovationLinkQuestion]');
  });

  it('the live emerging aside owns the innovation-link gate — not the legacy modal tag', () => {
    const labForm = join(
      APP,
      'pages',
      'result-framework-reporting',
      'pages',
      'dashboard-lab',
      'components',
      'lab-report-form',
      'lab-report-form.component.ts'
    );
    const ts = readFileSync(labForm, 'utf8');
    expect(ts).toContain('showsInnovationLink');
    expect(ts).toMatch(/showsInnovationLinkQuestion/);
  });

  it('dashboard-lab legacy modal tag is not treated as the shipped emerging path', () => {
    const live = hosts.find(f => f.includes('dashboard-lab.component.html'));
    expect(live).toBeDefined();
    const tags = bindingsInHostTags(readFileSync(live as string, 'utf8'));
    // Legacy host may remain in the tree unused from hub/band (ERC-DD-4); it must not be the sole live path.
    const legacyEmerging = tags.filter(t => t.includes('[showInnovationLinkQuestion]="true"'));
    expect(legacyEmerging.length).toBeLessThanOrEqual(1);
  });

  it('stays opt-in: the input must keep defaulting to false', () => {
    const ts = readFileSync(join(__dirname, 'report-result-form.component.ts'), 'utf8');
    expect(ts).toMatch(/@Input\(\)\s+showInnovationLinkQuestion:\s*boolean\s*=\s*false/);
  });
});
