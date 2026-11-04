// @akili-spec bugfix/toc-kpi-optional-green-check (TKG-T-1)
import * as fs from 'fs';
import * as path from 'path';
import { CONTRIBUTOR_PARTNER_WITH_IMPACT } from '../../../migrations/1792000000000-IRS-ImpactResultsFoundation';

/**
 * TKG-T-1 regression spec (TKG-R-1, TKG-NFR-1, TKG-NFR-2).
 *
 * Jest ignores src/migrations, so the spec lives here. It finds the NEWEST migration that
 * (re)defines `validation_contributor_partner_P25`, runs its up()/down() against a recording
 * queryRunner, and asserts on the SQL text.
 *
 * Disqualifier: these are text assertions. They do NOT prove MySQL accepts the body nor how real
 * rows evaluate (that is TKG-T-3 on PRTest).
 */
const MIGRATIONS_DIR = path.join(__dirname, '../../../migrations');
const FUNCTION_NAME = 'validation_contributor_partner_P25';
const GATE_MARKER = 'TKG-GATE';

function newestFunctionMigration(): string {
  const re = new RegExp(`CREATE FUNCTION \\\\?\`${FUNCTION_NAME}\\\\?\``);
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+-.*\.ts$/.test(f))
    .filter((f) =>
      re.test(fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')),
    )
    .sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]));
  expect(files.length).toBeGreaterThan(0);
  return files[files.length - 1];
}

async function run(direction: 'up' | 'down'): Promise<string[]> {
  const file = newestFunctionMigration();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(path.join(MIGRATIONS_DIR, file));
  const Ctor = Object.values(mod).find(
    (v) => typeof v === 'function',
  ) as new () => any;
  const calls: string[] = [];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql);
      return [];
    }),
  } as any;
  await new Ctor()[direction](queryRunner);
  return calls;
}

const createBody = (calls: string[]): string => {
  const hit = calls.find((s) =>
    s.includes(`CREATE FUNCTION \`${FUNCTION_NAME}\``),
  );
  expect(hit).toBeDefined();
  return hit as string;
};

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('validation_contributor_partner_P25 newest migration (TKG-T-1)', () => {
  it('(a) up() has the NULL + phase_year >= 2026 gate before the planned_result = FALSE branch', async () => {
    const body = createBody(await run('up'));
    const gate = body.search(
      /IF planned_result IS NULL AND COALESCE\(phase_year, ?0\) >= 2026 THEN/,
    );
    const falseBranch = body.search(/IF planned_result = FALSE THEN/);
    expect(gate).toBeGreaterThan(-1);
    expect(falseBranch).toBeGreaterThan(gate);
    expect(body).toMatch(/ELSEIF planned_result = FALSE THEN/);
  });

  it('(b) outside the gate lines the body equals CONTRIBUTOR_PARTNER_WITH_IMPACT', async () => {
    const body = createBody(await run('up'));
    const withoutGate = body
      .split('\n')
      .filter((l) => !l.includes(GATE_MARKER))
      .join('\n')
      .replace(
        'ELSEIF planned_result = FALSE THEN',
        'IF planned_result = FALSE THEN',
      );
    expect(norm(withoutGate)).toBe(norm(CONTRIBUTOR_PARTNER_WITH_IMPACT));
  });

  it('(c) down() issues CONTRIBUTOR_PARTNER_WITH_IMPACT', async () => {
    const calls = await run('down');
    expect(
      calls.some((s) => norm(s) === norm(CONTRIBUTOR_PARTNER_WITH_IMPACT)),
    ).toBe(true);
  });

  it('(d) phase year is read from version.phase_year via result.version_id with the bound resultId', async () => {
    const body = createBody(await run('up'));
    expect(norm(body)).toMatch(
      /SELECT v\.phase_year INTO phase_year FROM `result` r INNER JOIN version v ON v\.id = r\.version_id WHERE r\.id = resultId/,
    );
    expect(body).not.toMatch(/r\.id = \d+/);
  });
});
