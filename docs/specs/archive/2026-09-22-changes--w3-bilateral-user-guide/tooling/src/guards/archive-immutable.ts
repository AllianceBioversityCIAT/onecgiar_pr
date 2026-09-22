/**
 * archive-immutable.ts — build-step guard against mutating the archived W1/W2 spec (BG-T-1).
 *
 * // @akili-spec changes/w3-bilateral-user-guide
 *
 * Implements `BG-R-10` / `BG-AC-10` / `BG-DD-10`: the archived spec folder
 * `docs/specs/archive/2026-09-16-changes--user-guide-pdf/` MUST be
 * byte-identical before and after this spec's work. `BG-DD-1` copied that
 * folder's tooling into this spec's own `tooling/` rather than editing it in
 * place or promoting it to shared tooling specifically so the archive never
 * has to change; this guard is what makes that promise checkable at build
 * time instead of trusted on convention (`BG-DD-10`: "trust the copy" is the
 * rejected alternative — undetectable until someone diffs the archive).
 *
 * Two assertions, in this order:
 *
 *   1. **Non-empty path.** The archive path is resolved from the repo root
 *      (via `git rev-parse --show-toplevel`, not a relative guess) and the
 *      file count under it is asserted non-zero BEFORE anything else runs.
 *      This closes the "passes for the wrong reason" hole named in this
 *      task's falsifier: a `git diff --quiet` against a path that does not
 *      exist, or that a relative path missed entirely, exits 0 and looks
 *      like a clean guard while asserting nothing. A guard that greenlights
 *      a path that does not exist is not a guard.
 *   2. **Clean + fully tracked.** `git diff --name-only HEAD -- <archive path>`
 *      reports no modification to any tracked file under the archive, AND
 *      `git ls-files --others --exclude-standard -- <archive path>` reports
 *      no untracked file under it either (a new/leftover file under the
 *      archive is also a mutation of "byte-identical", even though a diff
 *      alone would not see it). Comparing against `HEAD` — not the index —
 *      is deliberate: `git diff` with no ref only compares the working tree
 *      to the index, so a `git add`-ed (staged) mutation of an archive file
 *      would report clean and this guard would exit 0 on an archive that is
 *      no longer byte-identical. This spec's own work gets `git add`-ed by
 *      the Leader on this same branch, so a stray staged archive edit is a
 *      real path, not a hypothetical one.
 *
 * Exits 0 only when both hold. Exits non-zero naming the offending file(s)
 * otherwise (relative paths only). Never prints file contents.
 *
 * Usage: `ts-node src/guards/archive-immutable.ts` (wired as the
 * `guard:archive` script in `package.json`, and as the first step of
 * `build-guide` so no assembly/render can run without this check passing
 * first). Runs from anywhere inside the repo: the repo root is resolved via
 * git, not assumed from the process's cwd.
 */

import { execFileSync } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

const ARCHIVE_REL_PATH = path.join(
  'docs',
  'specs',
  'archive',
  '2026-09-16-changes--user-guide-pdf',
);

function fail(message: string): never {
  // eslint-disable-next-line no-console
  console.error(`[guard:archive] FAIL — ${message}`);
  process.exit(1);
}

function resolveRepoRoot(): string {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: __dirname,
      encoding: 'utf-8',
    }).trim();
  } catch {
    fail(
      'could not resolve the repo root via `git rev-parse --show-toplevel` — ' +
        'this guard must run inside a git working tree.',
    );
  }
}

async function countFiles(dir: string): Promise<number> {
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let count = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countFiles(full);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

function gitDiffNameOnly(repoRoot: string, archivePath: string): string[] {
  // Compare against HEAD, not the (implicit) index: a plain `git diff`
  // reports working-tree-vs-index, so a STAGED (`git add`-ed) mutation of an
  // archive file would be invisible to it and this guard would exit 0 on an
  // archive that is no longer byte-identical. `HEAD` catches staged and
  // unstaged modifications alike.
  const out = execFileSync(
    'git',
    ['diff', '--name-only', 'HEAD', '--', archivePath],
    { cwd: repoRoot, encoding: 'utf-8' },
  ).trim();
  return out.length ? out.split('\n') : [];
}

function gitUntracked(repoRoot: string, archivePath: string): string[] {
  const out = execFileSync(
    'git',
    ['ls-files', '--others', '--exclude-standard', '--', archivePath],
    { cwd: repoRoot, encoding: 'utf-8' },
  ).trim();
  return out.length ? out.split('\n') : [];
}

async function main(): Promise<void> {
  const repoRoot = resolveRepoRoot();
  const archivePath = path.resolve(repoRoot, ARCHIVE_REL_PATH);

  // 1. Non-empty path assertion — first, before any git call.
  const fileCount = await countFiles(archivePath);
  if (fileCount === 0) {
    fail(
      `the archive path resolved to zero files: ${archivePath} ` +
        '(relative to repo root, this is ' +
        `${ARCHIVE_REL_PATH}). A guard that greenlights an empty/missing ` +
        'path is not a guard — refusing to proceed to the diff check.',
    );
  }

  // 2. Clean + fully tracked assertion.
  const modified = gitDiffNameOnly(repoRoot, archivePath);
  const untracked = gitUntracked(repoRoot, archivePath);

  if (modified.length > 0 || untracked.length > 0) {
    const lines: string[] = [];
    if (modified.length > 0) {
      lines.push('modified/deleted tracked file(s):', ...modified.map((f) => `  - ${f}`));
    }
    if (untracked.length > 0) {
      lines.push('untracked file(s):', ...untracked.map((f) => `  - ${f}`));
    }
    fail(
      `the archived spec folder (${ARCHIVE_REL_PATH}) is no longer byte-identical:\n` +
        lines.join('\n'),
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `[guard:archive] OK — ${fileCount} file(s) under ${ARCHIVE_REL_PATH}, clean and fully tracked.`,
  );
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
