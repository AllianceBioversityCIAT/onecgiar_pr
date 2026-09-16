#!/usr/bin/env node
/**
 * Runs the component-test suite in sequential batches, one Cypress process per batch.
 *
 * Why: the Angular/webpack dev-server that backs component testing keeps the compiled module
 * graph of every spec it has served alive for the lifetime of the process. With ~60 specs that
 * graph only ever grows, so a single `cypress run --component` ends the run holding several GB
 * — enough to push a 16 GB machine into swap. Restarting the process every N specs hands all of
 * that back to the OS.
 *
 * It also refuses to start when the machine is already out of memory, and shrinks the batch
 * when memory is merely tight — the failure mode this protects against is not a red suite, it
 * is a frozen laptop.
 *
 * Usage:
 *   npm run test:ct                       # every component spec, batched
 *   CT_BATCH_SIZE=4 npm run test:ct       # smaller batches = lower peak, more startup cost
 *   npm run test:ct -- 'src/app/custom-fields/pr-input/**'   # only matching specs
 *   RAM_GUARD=off npm run test:ct         # run anyway on a red machine
 */
const { spawnSync, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const ram = require('./ram-guard');

const ROOT = path.resolve(__dirname, '..');
const filter = process.argv[2];

/** Cap the heap of both halves of a run: Cypress' Electron browser and the Node dev-server. */
const HEAP_MB = Number(process.env.CT_HEAP_MB || 2048);

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

let specs;
if (filter === '--changed') {
  // Only the specs whose import graph reaches something you touched — see ct-affected.js.
  specs = execFileSync(process.execPath, [path.join(__dirname, 'ct-affected.js')], {
    cwd: ROOT,
    encoding: 'utf8'
  })
    .split('\n')
    .filter(Boolean);
  console.log(`> picking specs affected by your changes (node scripts/ct-affected.js --explain to see why)`);
} else {
  specs = collectSpecs(path.join(ROOT, 'src')).sort();
  if (filter) {
    const needle = filter.replace(/\*/g, '');
    specs = specs.filter(spec => spec.includes(needle));
  }
}

if (specs.length === 0) {
  console.error(`No component specs matched${filter ? ` "${filter}"` : ''}.`);
  process.exit(1);
}

// Measure before spending 10 minutes of the machine's life on a run that will only stall it.
const state = ram.gate({ what: 'the component-test suite' });
const tight = ram.level(state) !== 'green';

// An explicit CT_BATCH_SIZE always wins; otherwise tight memory halves the default.
const BATCH_SIZE = Number(process.env.CT_BATCH_SIZE || (tight ? 4 : 8));

const batches = [];
for (let i = 0; i < specs.length; i += BATCH_SIZE) batches.push(specs.slice(i, i + BATCH_SIZE));

console.log(`> ${specs.length} component specs in ${batches.length} batches of up to ${BATCH_SIZE}`);
console.log(`  ${ram.format(state)}\n`);

// Lets the batching be checked without paying for a run — useful on a machine already in the red.
if (process.env.CT_DRY_RUN === '1') {
  batches.forEach((batch, index) => {
    console.log(`-- batch ${index + 1}/${batches.length} -- ${batch.length} specs`);
    batch.forEach(spec => console.log(`     ${spec}`));
  });
  process.exit(0);
}

const failed = [];
batches.forEach((batch, index) => {
  console.log(`\n-- batch ${index + 1}/${batches.length} -- ${batch.length} specs`);
  const result = spawnSync('npx', ['cypress', 'run', '--component', '--spec', batch.join(',')], {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_EXTRA_LAUNCH_ARGS:
        process.env.ELECTRON_EXTRA_LAUNCH_ARGS || `--js-flags=--max-old-space-size=${HEAP_MB}`,
      // The webpack dev-server runs in Cypress' own Node process, which the Electron flag above
      // never reaches. Without this cap it is the half that grows without bound.
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--max-old-space-size=${HEAP_MB}`].filter(Boolean).join(' ')
    }
  });
  if (result.status !== 0) failed.push(...batch);

  // Stop early rather than take the machine down with us.
  if (index < batches.length - 1 && ram.level() === 'red') {
    console.error(
      `\nStopping after batch ${index + 1}: the machine ran out of memory mid-run.\n` +
        `${ram.format()}\n` +
        `Re-run the rest with a smaller batch once something is closed: CT_BATCH_SIZE=2 npm run test:ct\n`
    );
    process.exit(1);
  }
});

if (failed.length) {
  console.error(`\nx ${failed.length} spec(s) failed:\n${failed.map(s => `  - ${s}`).join('\n')}`);
  process.exit(1);
}
console.log('\nv all component specs passed');
