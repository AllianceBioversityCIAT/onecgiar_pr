#!/usr/bin/env node
/**
 * Which component specs can your changes actually break?
 *
 * Jest answers this with `--changedSince` because it owns the module graph. Cypress does not, so
 * this builds the same answer the same way: start at each `*.cy.ts`, follow its imports as far as
 * they go, and keep the spec if anything it reaches was touched.
 *
 * 🛑 The naive version — "run the spec sitting next to the file you edited" — is wrong, and
 * wrong in the direction that hurts. Editing `pr-input.component.ts` reaches specs in bilateral,
 * programme-results and user-management, none of which share a folder or a name with it. A
 * name-based guess reports green while the thing it missed is broken.
 *
 * Usage:
 *   node scripts/ct-affected.js                    # spec paths, one per line
 *   node scripts/ct-affected.js --explain          # ...and why each one was picked
 *   CHANGED_SINCE=origin/master node scripts/ct-affected.js
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const BASE = process.env.CHANGED_SINCE || 'origin/performance-refactor';
const EXPLAIN = process.argv.includes('--explain');

/** Committed changes since the fork point, plus whatever is still uncommitted. */
function changedFiles() {
  const repo = execSync('git rev-parse --show-toplevel', { cwd: ROOT, encoding: 'utf8' }).trim();
  const run = cmd => {
    try {
      return execSync(cmd, { cwd: repo, encoding: 'utf8' }).split('\n').filter(Boolean);
    } catch {
      return [];
    }
  };
  const all = [
    ...run(`git diff --name-only ${BASE}...HEAD`),
    ...run('git diff --name-only HEAD'),
    ...run('git ls-files --others --exclude-standard')
  ];
  return new Set(all.map(f => path.resolve(repo, f)));
}

function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(full, found);
    } else {
      found.push(full);
    }
  }
  return found;
}

/**
 * Resolve one import specifier to a file on disk. Bare package names return null on purpose:
 * node_modules does not change between two commits of this repo.
 */
function resolve(spec, fromFile) {
  let base;
  if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else if (spec.startsWith('src/')) base = path.join(ROOT, spec);
  else if (spec.startsWith('@spartan/')) base = path.join(SRC, 'app/spartan', spec.slice('@spartan/'.length));
  else return null;

  for (const candidate of [base, `${base}.ts`, path.join(base, 'index.ts'), path.join(base, 'src/index.ts')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const IMPORT_RE = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g;

/**
 * Angular components reach their template and styles through `templateUrl` / `styleUrls`, which
 * are not imports. Editing a .html is the most common change in this repo, so missing them would
 * gut the whole idea.
 */
function siblingsOf(file) {
  if (!file.endsWith('.ts')) return [];
  const stem = file.slice(0, -3);
  return [`${stem}.html`, `${stem}.scss`].filter(fs.existsSync);
}

/** Every file a spec can reach, transitively. */
function reachableFrom(entry, cache) {
  if (cache.has(entry)) return cache.get(entry);
  const seen = new Set();
  const stack = [entry];
  cache.set(entry, seen);

  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const sibling of siblingsOf(file)) seen.add(sibling);

    let source;
    try {
      source = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const match of source.matchAll(IMPORT_RE)) {
      const target = resolve(match[1], file);
      if (target && !seen.has(target)) stack.push(target);
    }
  }
  return seen;
}

const changed = changedFiles();
const specs = walk(SRC).filter(f => f.endsWith('.cy.ts')).sort();
const cache = new Map();
const picked = [];

for (const spec of specs) {
  const reach = reachableFrom(spec, cache);
  const hit = [...reach].find(f => changed.has(f));
  if (hit) picked.push({ spec, hit });
}

if (EXPLAIN) {
  console.error(`# base: ${BASE} - ${changed.size} changed file(s) - ${picked.length}/${specs.length} specs affected`);
  for (const { spec, hit } of picked) {
    const rel = f => path.relative(ROOT, f);
    console.error(`  ${rel(spec)}\n      reaches ${rel(hit)}`);
  }
}

for (const { spec } of picked) console.log(path.relative(ROOT, spec));
