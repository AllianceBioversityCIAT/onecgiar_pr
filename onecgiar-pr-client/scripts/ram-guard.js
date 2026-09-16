#!/usr/bin/env node
/**
 * Memory pressure guard for the local test runners.
 *
 * Why: a component-test run costs a few GB on top of whatever the machine is already holding.
 * On a 16 GB Mac that is fine from a clean start and fatal when four Angular dev-servers are
 * already resident — the run does not fail, the whole machine stalls into swap and has to be
 * rebooted. Measuring first turns "the PC froze" into "the runner refused to start, here is why".
 *
 * Usage as a module:  const { read, gate } = require('./ram-guard');
 * Usage as a CLI:     npm run ram      # print the current state and who is holding memory
 */
const { execSync } = require('node:child_process');

const GB = 1073741824;

/**
 * The guard exists to protect one developer laptop, and it reads `vm_stat` / `sysctl` to do it.
 * On a build agent neither the problem nor those commands exist, so it must be a silent no-op
 * there — a guard that can fail a pipeline is worse than the freeze it prevents.
 */
const INACTIVE = process.platform !== 'darwin' || Boolean(process.env.CI);
const RED = '\x1b[31m';
const AMBER = '\x1b[33m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

/**
 * Current memory state.
 *
 * 🛑 The authority is the kernel's own pressure level, not a number derived from `vm_stat`, and
 * not swap. Two readings that looked obvious are both wrong:
 *
 *   - **Swap used is cumulative.** `vm.swapusage` reports what has been paged out since boot; it
 *     does not fall back when the pressure ends. Gating on it pins the guard at red forever after
 *     one bad afternoon — measured 15-sep-2026: swap 95% while the kernel reported normal.
 *   - **free + inactive + speculative understates badly**, because it ignores the compressor.
 *     4.3 GB sat compressed in that same reading — memory that exists, just squeezed. That
 *     formula said 23% available while macOS itself said 46%.
 *
 * `kern.memorystatus_vm_pressure_level` is the signal the OS acts on: 1 normal, 2 warning,
 * 4 critical. Swap and the raw numbers are kept for the report, never for the verdict.
 */
function read() {
  const sysctl = key => execSync(`sysctl -n ${key}`, { encoding: 'utf8' }).trim();

  const pressure = Number(sysctl('kern.memorystatus_vm_pressure_level')) || 1;
  const totalBytes = Number(sysctl('hw.memsize'));

  // What macOS reports in Activity Monitor, and the closest thing to "room left".
  let freePercent = null;
  try {
    const out = execSync('memory_pressure -Q', { encoding: 'utf8' });
    freePercent = Number(/free percentage:\s*(\d+)/.exec(out)?.[1]);
  } catch {
    freePercent = null;
  }

  const swapLine = sysctl('vm.swapusage');
  const swapNum = label => Number(new RegExp(`${label} = ([\\d.]+)M`).exec(swapLine)?.[1] || 0) / 1024;

  return {
    pressure,
    freePercent,
    totalGB: totalBytes / GB,
    freeGB: freePercent === null ? null : (totalBytes * freePercent) / 100 / GB,
    swapUsedGB: swapNum('used'),
    swapTotalGB: swapNum('total')
  };
}

/**
 * Traffic light, driven by the kernel. `freePercent` only ever *adds* caution — it never turns a
 * critical reading green.
 */
function level(state = INACTIVE ? null : read()) {
  // No measurement (build agent, or a reading that threw) means no reason to hold anything back.
  if (!state) return 'green';
  if (state.pressure >= 4) return 'red';
  if (state.pressure >= 2) return 'amber';
  if (state.freePercent !== null && state.freePercent < 10) return 'red';
  if (state.freePercent !== null && state.freePercent < 20) return 'amber';
  return 'green';
}

const PRESSURE_WORDS = { 1: 'normal', 2: 'warning', 4: 'critical' };

function format(state = INACTIVE ? null : read()) {
  if (!state) return 'memory not measured on this platform';
  const free =
    state.freePercent === null ? 'free n/a' : `${state.freePercent}% free (~${state.freeGB.toFixed(1)} GB)`;
  // Swap is shown because it explains a slow machine; it is never why the light is red.
  return (
    `kernel pressure: ${PRESSURE_WORDS[state.pressure] || state.pressure} - ${free} of ` +
    `${state.totalGB.toFixed(0)} GB - swap ${state.swapUsedGB.toFixed(1)} GB paged since boot (cumulative)`
  );
}

/**
 * The processes most likely to be the reason, so the message is actionable and not just a number.
 *
 * Deliberately counted, not ranked by size: on a machine that is already swapping, RSS collapses
 * as the kernel pages those very processes out — a dev-server holding 600 MB while it compiles reports
 * 40 MB by the time the guard fires. Sorting by RSS would hide the offenders exactly when they
 * matter, so what is reported is how many of each kind are open.
 */
const KINDS = [
  { label: 'Angular dev-server ("ng serve")', pattern: /(^|\/|\s)ng serve\b/, note: 'tens of MB asleep, ~600 MB while compiling' },
  { label: 'Cypress', pattern: /Cypress\.app|cypress\/resources|cypress run\b/ },
  { label: 'Playwright / headless Chromium', pattern: /ms-playwright|chrome-headless-shell|playwright.*chromium/i },
  { label: 'esbuild / webpack worker', pattern: /esbuild|webpack/i }
];

function offenders() {
  if (INACTIVE) return [];
  const lines = execSync('ps -axo rss=,command=', { encoding: 'utf8' }).split('\n');
  const processes = lines
    .map(line => {
      const match = /^\s*(\d+)\s+(.*)$/.exec(line);
      return match ? { mb: Number(match[1]) / 1024, command: match[2] } : null;
    })
    .filter(Boolean)
    // The shell wrappers and `npm exec` parents that launched them are not separate consumers.
    .filter(p => !/^\/bin\/(z|ba)?sh\b|npm exec /.test(p.command));

  return KINDS.flatMap(kind => {
    const found = processes.filter(p => kind.pattern.test(p.command));
    if (found.length === 0) return [];
    const resident = found.reduce((sum, p) => sum + p.mb, 0);
    const note = kind.note ? `, ${kind.note}` : '';
    return [`  ${String(found.length).padStart(2)} x ${kind.label} (${resident.toFixed(0)} MB resident now${note})`];
  });
}

/**
 * Refuse to start when the machine is already red. Returns the state so callers can also
 * shrink their workload on amber instead of bailing out.
 */
function gate({ what = 'this run', allowAmber = true } = {}) {
  if (INACTIVE) return null;

  // Fail open: if the measurement itself breaks, that is no reason to block a developer's run.
  let state;
  try {
    state = read();
  } catch {
    return null;
  }

  const light = level(state);
  if (light === 'green') return state;

  const lines = offenders();
  const detail = lines.length ? `\nHolding memory right now:\n${lines.join('\n')}` : '';

  if (light === 'red') {
    console.error(
      `\n${RED}Refusing to start ${what} - the machine is already out of memory.${RESET}\n` +
        `${format(state)}${detail}\n\n` +
        `Close what you are not using, then try again - "npm run ram" lists it.\n` +
        `Override at your own risk: RAM_GUARD=off\n`
    );
    if (process.env.RAM_GUARD !== 'off') process.exit(1);
    return state;
  }

  console.warn(`\n${AMBER}Memory is tight - ${what} will run in smaller steps.${RESET}\n${format(state)}${detail}\n`);
  if (!allowAmber && process.env.RAM_GUARD !== 'off') process.exit(1);
  return state;
}

/**
 * Headless browsers an agent or a crashed run left behind. Playwright and Cypress are supposed
 * to close their own, and mostly do — what survives is whatever died mid-run, and it keeps its
 * memory for as long as the machine is up. Listed with pid and age, never killed: deciding what
 * to close is the operator's call, and a real browser window is off-limits.
 */
function strayBrowsers(minMinutes = 20) {
  if (INACTIVE) return [];
  const raw = execSync('ps -axo pid=,etime=,command=', { encoding: 'utf8' });
  return raw
    .split('\n')
    .map(line => /^\s*(\d+)\s+(\S+)\s+(.*)$/.exec(line))
    .filter(Boolean)
    .filter(([, , , command]) => /ms-playwright|chrome-headless-shell/.test(command))
    // `--type=` marks a renderer/GPU child; killing the parent takes those with it.
    .filter(([, , , command]) => !/--type=/.test(command))
    .map(([, pid, etime, command]) => ({ pid, etime, minutes: etimeToMinutes(etime), command }))
    .filter(p => p.minutes >= minMinutes);
}

/** ps etime comes as [[dd-]hh:]mm:ss. */
function etimeToMinutes(etime) {
  const [days, rest] = etime.includes('-') ? etime.split('-') : ['0', etime];
  const parts = rest.split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return Number(days) * 1440 + parts[0] * 60 + parts[1];
}

module.exports = { read, level, format, offenders, strayBrowsers, gate };

if (require.main === module) {
  if (INACTIVE) {
    console.log('ram-guard: not a local macOS session, nothing to measure.');
    process.exit(0);
  }
  const state = read();
  const light = level(state);
  const colour = { green: GREEN, amber: AMBER, red: RED }[light];
  console.log(`${colour}${light.toUpperCase()}${RESET}  ${format(state)}`);
  const lines = offenders();
  if (lines.length) console.log(`\nDev-servers, browsers and bundlers holding memory:\n${lines.join('\n')}`);

  const strays = strayBrowsers();
  if (strays.length) {
    console.log(`\nHeadless browsers open for over 20 minutes (a finished run should have closed these):`);
    for (const s of strays) console.log(`  pid ${s.pid.padStart(6)}  up ${s.etime.padStart(9)}`);
    console.log(`  Close them with:  kill ${strays.map(s => s.pid).join(' ')}`);
    console.log(`  (headless only - this never lists a browser window you have open)`);
  }

  if (light === 'red') {
    console.log(
      '\nToo little memory left to start anything heavy. Close what you are not using' +
        '\nor override with RAM_GUARD=off.'
    );
  }
  process.exit(light === 'red' && process.env.RAM_GUARD !== 'off' ? 1 : 0);
}
