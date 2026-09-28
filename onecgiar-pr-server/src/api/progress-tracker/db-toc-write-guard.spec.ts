// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
/**
 * PTM-T-9 — Repository guard: no write statement against the ToC Integration schema.
 *
 * `env.DB_TOC` (including `toc_results_indicators`) is read-only to PRMS —
 * `docs/trd/trd.md` §7: "PRMS attaches results to ToC, never authors ToC." This guard
 * asserts no source file under `onecgiar-pr-server/src` issues an `INSERT`, `UPDATE`,
 * `DELETE`, or DDL statement against that schema. Implements `PTM-R-12`, `PTM-AC-14`
 * (`requirements.md` §9 defect class `D-5`).
 *
 * Pattern and scope mirror `design.md` §1A `P-2` exactly — the same commands the Leader
 * ran at baseline commit `24a91da0e`, scope `onecgiar-pr-server/src`:
 *
 *   grep -rniE '(INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE)[^;]*\$\{env\.DB_TOC\}' \
 *     --include='*.ts' src
 *     → 0 hits (checked against ALL .ts files, specs included — no exemption)
 *
 *   grep -rn 'env\.DB_TOC' --include='*.ts' src | grep -v spec
 *     → 115 hits, all reads, across 10+ repositories
 *
 * This file re-implements both greps in pure Node (walk + per-line RegExp) instead of
 * shelling out, so the guard does not depend on which `grep` binary/flavor is on a given
 * CI runner's PATH. Matching is done per LINE, exactly like the `grep` command above, not
 * across the whole file — see "Known blind spot" below.
 *
 * Known blind spot (recorded per the task's Disqualifier clause — a named gap, not a
 * muted check): a write statement whose keyword and `${env.DB_TOC}` reference are split
 * across a multi-line template literal would not be caught, because both the `grep`
 * command this mirrors and this guard match one line at a time. No such statement exists
 * in the codebase today (`P-2`), and every current `DB_TOC` access — read or write — is
 * single-line, so this is a documented limitation of the chosen pattern, not blindness to
 * a case that actually occurs.
 *
 * Self-exclusion: the repo-wide scan below excludes THIS file from its own file list. The
 * "write-pattern unit proof" further down deliberately embeds violation-shaped strings (the
 * task's own falsifier, one per forbidden keyword) as string literals, to prove in-memory
 * that the pattern positively detects a write before any real file is touched. Scanning this
 * file's own source text would flag those literals as findings — a false alarm against a
 * fixture, not a real violation — so this file is excluded by identity (`__filename`), not by
 * a blanket "specs are exempt" rule (specs are NOT exempt from the real check, matching the
 * baseline `grep` command, which carries no `grep -v spec` on the write side).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '..', '..');

const WRITE_PATTERN =
  /(INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE)[^;]*\$\{env\.DB_TOC\}/i;
const READ_REFERENCE_PATTERN = /env\.DB_TOC/;

interface Hit {
  file: string;
  lineNumber: number;
  line: string;
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function scan(files: string[], pattern: RegExp): Hit[] {
  const hits: Hit[] = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        hits.push({
          file: path.relative(SRC_ROOT, file),
          lineNumber: idx + 1,
          line: line.trim(),
        });
      }
    });
  }
  return hits;
}

describe('db-toc-write-guard (PTM-T-9) — no write statement targets the ToC Integration schema', () => {
  const allTsFiles = listTsFiles(SRC_ROOT);
  // Excludes this guard's own file — see "Self-exclusion" in the header comment.
  const scannedFiles = allTsFiles.filter((f) => f !== __filename);

  it('finds real .ts files under src (sanity: the scan is not vacuously empty)', () => {
    expect(allTsFiles.length).toBeGreaterThan(1000);
  });

  it('has zero write statements against env.DB_TOC anywhere under src (PTM-AC-14, D-5)', () => {
    const hits = scan(scannedFiles, WRITE_PATTERN);
    expect(hits).toEqual([]);
  });

  it('does not fire on the existing non-spec read references to env.DB_TOC (P-2 baseline: 115)', () => {
    // Mirrors `grep -rn 'env\.DB_TOC' --include='*.ts' src | grep -v spec`: filter on the
    // combined "file:line" text, the same substring `grep -v spec` operates on, rather than
    // on the filename alone.
    const allReadHits = scan(scannedFiles, READ_REFERENCE_PATTERN);
    const nonSpecReadHits = allReadHits.filter(
      (hit) => !`${hit.file}:${hit.line}`.includes('spec'),
    );

    // A floor, not an exact count: proves the scan found the known population (115 at
    // baseline) without pinning the number, so it does not flake if a sibling task in this
    // spec lands a new read in the same window.
    expect(nonSpecReadHits.length).toBeGreaterThanOrEqual(100);

    const falselyFlagged = nonSpecReadHits.filter((hit) =>
      WRITE_PATTERN.test(hit.line),
    );
    expect(falselyFlagged).toEqual([]);
  });

  describe('write-pattern unit proof (falsifier, in-memory — no source file is mutated)', () => {
    it('matches the exact falsifier statement named by the task', () => {
      const falsifier =
        'await this.dataSource.query(`UPDATE ${env.DB_TOC}.toc_results_indicators SET x = 1`);';
      expect(WRITE_PATTERN.test(falsifier)).toBe(true);
    });

    it.each([
      [
        'INSERT',
        'INSERT INTO ${env.DB_TOC}.toc_results_indicators (id) VALUES (1)',
      ],
      ['UPDATE', 'UPDATE ${env.DB_TOC}.toc_results_indicators SET x = 1'],
      [
        'DELETE',
        'DELETE FROM ${env.DB_TOC}.toc_results_indicators WHERE id = 1',
      ],
      ['CREATE TABLE', 'CREATE TABLE ${env.DB_TOC}.new_table (id INT)'],
      [
        'ALTER TABLE',
        'ALTER TABLE ${env.DB_TOC}.toc_results_indicators ADD COLUMN y INT',
      ],
    ])(
      'matches the forbidden %s keyword against DB_TOC',
      (_keyword, statement) => {
        expect(WRITE_PATTERN.test(statement)).toBe(true);
      },
    );

    it('does NOT match a read statement against the same schema (SELECT is not a write keyword)', () => {
      const read =
        'const rows = await this.dataSource.query(`SELECT * FROM ${env.DB_TOC}.toc_results_indicators WHERE id = ?`, [id]);';
      expect(WRITE_PATTERN.test(read)).toBe(false);
    });

    it('does NOT match a write statement against an unrelated schema (scoped to DB_TOC only)', () => {
      const otherSchemaWrite =
        'await this.dataSource.query(`UPDATE ${env.DB_PRMS}.result SET x = 1`);';
      expect(WRITE_PATTERN.test(otherSchemaWrite)).toBe(false);
    });
  });
});
