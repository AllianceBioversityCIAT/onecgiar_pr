#!/usr/bin/env node
/**
 * Jest for a developer laptop: the same suite, sized to the machine it is running on.
 *
 * Why this is separate from `npm test`: `maxWorkers` must not be pinned in `package.json`,
 * because that file travels to the build agent, where more workers are exactly what you want.
 * The limit belongs to the local invocation, so it lives here and `npm test` stays untouched.
 *
 * Each Jest worker is a full Node process with the Angular compiler loaded — roughly 400-600 MB.
 * The configured "50%" means 5 of them on a 10-core Mac, which is fine from a clean start and is
 * the difference between a slow suite and an unusable machine when a few dev-servers are up.
 *
 * Usage:
 *   npm run test:local                          # whole suite, workers sized to free memory
 *   npm run test:local -- --testPathPattern=foo # every jest flag passes straight through
 *   JEST_WORKERS=1 npm run test:local           # force it
 */
const { spawnSync } = require('node:child_process');
const ram = require('./ram-guard');

const state = ram.gate({ what: 'the unit-test suite' });
const light = ram.level(state);

/** Free memory, not core count, is the binding constraint here. */
function workersFor() {
  if (process.env.JEST_WORKERS) return process.env.JEST_WORKERS;
  if (!state) return null; // not measured (CI, or a reading that threw) — let Jest decide.
  if (light === 'red') return '1';
  if (light === 'amber') return '2';
  // Even on a green machine, one worker per ~1.5 GB free beats one per core on 16 GB.
  if (state.freeGB === null) return null;
  return String(Math.max(2, Math.min(6, Math.floor(state.freeGB / 1.5))));
}

const workers = workersFor();
const args = ['jest', '--no-coverage', ...(workers ? [`--maxWorkers=${workers}`] : []), ...process.argv.slice(2)];

if (workers) console.log(`> jest with ${workers} worker(s) - ${ram.format(state)}\n`);

const result = spawnSync('npx', args, { stdio: 'inherit', cwd: require('node:path').resolve(__dirname, '..') });
process.exit(result.status ?? 1);
