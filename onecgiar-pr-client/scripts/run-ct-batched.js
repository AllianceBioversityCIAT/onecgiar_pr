#!/usr/bin/env node
/**
 * Runs the component-test suite in sequential batches, one Cypress process per batch.
 *
 * Why: the Angular/webpack dev-server that backs component testing keeps the compiled module
 * graph of every spec it has served alive for the lifetime of the process. With ~46 specs that
 * graph only ever grows, so a single `cypress run --component` ends the run holding several GB
 * — enough to push a 16 GB machine into swap. Restarting the process every N specs hands all of
 * that back to the OS.
 *
 * Usage:
 *   npm run test:ct:batch                 # default batch size
 *   CT_BATCH_SIZE=4 npm run test:ct:batch # smaller batches = lower peak, more startup cost
 *   npm run test:ct:batch -- 'src/app/custom-fields/pr-input/**'   # only matching specs
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BATCH_SIZE = Number(process.env.CT_BATCH_SIZE || 8);
const ROOT = path.resolve(__dirname, '..');
const filter = process.argv[2];

/** Collect `src/**‍/*.cy.ts` without pulling in a glob dependency. */
function collectSpecs(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') collectSpecs(full, found);
    } else if (entry.name.endsWith('.cy.ts')) {
      found.push(path.relative(ROOT, full));
    }
  }
  return found;
}

let specs = collectSpecs(path.join(ROOT, 'src')).sort();
if (filter) {
  const needle = filter.replace(/\*/g, '');
  specs = specs.filter(spec => spec.includes(needle));
}

if (specs.length === 0) {
  console.error(`No component specs matched${filter ? ` "${filter}"` : ''}.`);
  process.exit(1);
}

const batches = [];
for (let i = 0; i < specs.length; i += BATCH_SIZE) batches.push(specs.slice(i, i + BATCH_SIZE));

console.log(`▶ ${specs.length} component specs in ${batches.length} batches of up to ${BATCH_SIZE}\n`);

const failed = [];
batches.forEach((batch, index) => {
  console.log(`\n━━ batch ${index + 1}/${batches.length} ━━ ${batch.length} specs`);
  const result = spawnSync('npx', ['cypress', 'run', '--component', '--spec', batch.join(',')], {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_EXTRA_LAUNCH_ARGS: process.env.ELECTRON_EXTRA_LAUNCH_ARGS || '--js-flags=--max-old-space-size=2048'
    }
  });
  if (result.status !== 0) failed.push(...batch);
});

if (failed.length) {
  console.error(`\n✖ ${failed.length} spec(s) failed:\n${failed.map(s => `  - ${s}`).join('\n')}`);
  process.exit(1);
}
console.log('\n✔ all component specs passed');
