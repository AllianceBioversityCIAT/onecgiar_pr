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

/** Current memory + swap state, in GB and ratios. */
function read() {
  const vmStat = execSync('vm_stat', { encoding: 'utf8' });
  const pageSize = Number(/page size of (\d+) bytes/.exec(vmStat)?.[1] || 4096);
  const pages = name => Number(new RegExp(`${name}:\\s+(\\d+)`).exec(vmStat)?.[1] || 0);

  // "Available" the way macOS itself counts it: free plus the pages it can reclaim on demand.
  const availableBytes =
    (pages('Pages free') + pages('Pages inactive') + pages('Pages speculative')) * pageSize;
  const totalBytes = Number(execSync('sysctl -n hw.memsize', { encoding: 'utf8' }).trim());

  const swapLine = execSync('sysctl -n vm.swapusage', { encoding: 'utf8' });
  const swapNum = label => Number(new RegExp(`${label} = ([\\d.]+)M`).exec(swapLine)?.[1] || 0) / 1024;
  const swapTotal = swapNum('total');
  const swapUsed = swapNum('used');

  return {
    availableGB: availableBytes / GB,
    totalGB: totalBytes / GB,
    availableRatio: availableBytes / totalBytes,
    swapUsedGB: swapUsed,
    swapTotalGB: swapTotal,
    swapRatio: swapTotal > 0 ? swapUsed / swapTotal : 0
  };
}

/**
 * Traffic light. Thresholds match the house rule: under 15% available, or swap past 80%, the
 * machine is already hurting and nothing heavy should be started on top of it.
 */
function level(state = INACTIVE ? null : read()) {
  // No measurement (build agent, or a reading that threw) means no reason to hold anything back.
  if (!state) return 'green';
  if (state.availableRatio < 0.1 || state.swapRatio > 0.85) return 'red';
  if (state.availableRatio < 0.2 || state.swapRatio > 0.6) return 'amber';
  return 'green';
}

function format(state = INACTIVE ? null : read()) {
  if (!state) return 'memory not measured on this platform';
  return (
    `RAM available ${state.availableGB.toFixed(1)}/${state.totalGB.toFixed(0)} GB ` +
    `(${(state.availableRatio * 100).toFixed(0)}%) - swap ${state.swapUsedGB.toFixed(1)}/` +
    `${state.swapTotalGB.toFixed(1)} GB (${(state.swapRatio * 100).toFixed(0)}%)`
  );
}

/**
 * The processes most likely to be the reason, so the message is actionable and not just a number.
 *
 * Deliberately counted, not ranked by size: on a machine that is already swapping, RSS collapses
 * as the kernel pages those very processes out — four dev-servers holding 600 MB each report
 * 40 MB by the time the guard fires. Sorting by RSS would hide the offenders exactly when they
 * matter, so what is reported is how many of each kind are open.
 */
const KINDS = [
  { label: 'Angular dev-server ("ng serve")', pattern: /(^|\/|\s)ng serve\b/, note: '~600 MB each when warm' },
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
        `Close what you are not using (an idle "ng serve" costs ~600 MB each) and try again.\n` +
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
        '\n(an idle "ng serve" costs ~600 MB each), or override with RAM_GUARD=off.'
    );
  }
  process.exit(light === 'red' && process.env.RAM_GUARD !== 'off' ? 1 : 0);
}
