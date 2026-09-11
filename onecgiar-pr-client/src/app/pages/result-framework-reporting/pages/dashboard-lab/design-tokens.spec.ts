// @akili-spec changes/mass-reporting-flow
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Static guard: every `var(--pr-*)` referenced in the reporting module resolves to a definition.
 *
 * An undefined CSS custom property is silently transparent — no build error, no runtime error, no
 * jsdom-visible symptom. That is exactly how `--pr-surface-ground` shipped referenced ~50 times
 * with no definition, making every loading skeleton (hub lanes, By-AOW banner, table) invisible:
 * the page looked loaded-and-empty while fetching (field report 2026-08-31).
 */
describe('reporting module design tokens', () => {
  const CLIENT_SRC = join(__dirname, '../../../..', '..');

  const walk = (dir: string, exts: string[]): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) out.push(...walk(full, exts));
      else if (exts.some(e => entry.endsWith(e))) out.push(full);
    }
    return out;
  };

  it('every var(--pr-*) used under result-framework-reporting is defined somewhere in the styles', () => {
    const defined = new Set<string>();
    const definitionFiles = [
      ...walk(join(CLIENT_SRC, 'styles'), ['.scss']),
      join(CLIENT_SRC, 'styles.scss'),
      ...walk(join(CLIENT_SRC, 'app'), ['.scss'])
    ];
    for (const file of definitionFiles) {
      for (const m of readFileSync(file, 'utf8').matchAll(/(--pr-[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
    }

    const moduleDir = join(CLIENT_SRC, 'app/pages/result-framework-reporting');
    const offenders: string[] = [];
    for (const file of walk(moduleDir, ['.html', '.scss', '.ts'])) {
      for (const m of readFileSync(file, 'utf8').matchAll(/var\((--pr-[a-z0-9-]+)[),]/g)) {
        if (!defined.has(m[1])) offenders.push(`${m[1]} in ${file.split('/app/')[1]}`);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });
});
