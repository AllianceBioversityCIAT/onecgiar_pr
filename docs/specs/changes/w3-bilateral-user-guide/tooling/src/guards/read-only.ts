/**
 * read-only.ts — default-deny request guard against non-idempotent writes (BG-T-3).
 *
 * // @akili-spec changes/w3-bilateral-user-guide
 *
 * Implements `design.md` §3.3 / `BG-DD-3` (`BG-R-7`, `BG-AC-7`): this is "the only thing
 * standing between a capture run and a really-submitted result" (`tasks.md` `BG-T-3`
 * review-depth note). Three rules, asserted in this exact priority order per request:
 *
 *   1. `GET` / `HEAD`, any origin                                          -> ALLOW
 *   2. any other method, origin on the INERT ALLOWLIST below               -> ALLOW
 *   3. any other method, any other origin                                  -> ABORT + FAIL THE RUN
 *
 * **Why default-deny by METHOD, not an origin allowlist.** The first draft matched "the
 * PRMS API origin" — but `environment.ts` configures roughly twenty distinct origins
 * (`apiBaseUrl`, `reviewApiUrl`, `modelBaseUrl`, `aiAssistant`, `fileManagerUrl`,
 * `textMiningUrl`, `elastic.baseUrl`, `webSocketUrl`/`pusher`, …). Enumerating "the PRMS
 * origins" correctly is exactly the kind of audit that reports green while the one origin
 * nobody enumerated goes straight through (`design.md` §11 `P-13`). Inverting the policy —
 * allow the safe VERB everywhere, deny everything else by default — means a new backend, a
 * re-pointed environment, or an origin nobody thought to list lands in rule 3 and stops the
 * run, instead of silently slipping past an incomplete allowlist. This is safe rather than
 * merely strict because the client names its verbs explicitly
 * (`HTTP_METHOD_descriptiveName`, `onecgiar-pr-client/CLAUDE.md`) and every bilateral READ
 * is a `GET_*`, with writes as `POST_createBilateralHeader`, `PATCH_generalInfo`,
 * `PATCH_tocMapping`, `POST_evidences` and peers (`design.md` §11 `P-5`).
 *
 * **Do NOT widen `INERT_ALLOWLIST_HOST_SUFFIXES` to make a run pass.** That is the specific
 * failure this guard exists to forbid (`tasks.md` `BG-T-3` Disqualifier). If a legitimate
 * page load needs a new entry, that is a Pivot Protocol conversation, not a one-line patch.
 *
 * **Install order matters (`design.md` §3.3 "Install order matters (`J-8`)").** The guard
 * MUST be installed on the browser context BEFORE `auth.ts`'s `injectAuth()` runs, not
 * merely before the per-route capture loop — `injectAuth()` performs its own `goto()` +
 * `reload()` to let `RolesService` pick the session up, and that bootstrap navigation
 * mounts the whole app shell, the broadest page load of the entire run. A comment saying
 * "install first" is not an assertion, so this module makes the ordering CHECKABLE:
 * `installReadOnlyGuard()` marks the `BrowserContext` it attached to in a module-private
 * `WeakSet`, and `assertReadOnlyGuardInstalled()` throws unless that same context is a
 * member. `capture.ts` calls the assertion immediately before its `injectAuth()` call, so a
 * future edit that moves (or deletes) the install call — leaving the assertion in place —
 * fails loudly at that exact line instead of silently shipping an unguarded bootstrap
 * navigation.
 *
 * **Fail-closed, not fail-open.** On a rule-3 request this module writes the denial to the
 * log, calls `route.abort()`, and then calls `process.exit(1)` directly from inside the
 * route handler — mirroring `guards/archive-immutable.ts`'s `fail()` convention. A route
 * handler is not on `main()`'s own await chain (Playwright drives it independently), so a
 * plain `throw` here would only reject a detached internal promise and could leave the run
 * looking like it hung rather than failed; `process.exit(1)` is the only mechanism that
 * reliably stops the WHOLE run, immediately, rather than skipping just the one request — a
 * capture taken after a blocked write would show a screen the reporter would never see.
 *
 * **Acknowledged gap — WebSocket.** Playwright's `page.route()` intercepts HTTP(S) fetch/
 * XHR/navigation traffic; it does NOT intercept WebSocket frames, so `pusher`/
 * `webSocketUrl` traffic is entirely outside this guard. Two things bound that risk rather
 * than close it: `pages/bilateral` never imports `PusherService` (verified, `design.md` §11
 * `P-13`), and the channel is a receive-only third-party hint feed, not a PRMS write path.
 * This is recorded here — and in every run's log header — as a known blind spot rather than
 * covered, because a silent gap is the expensive kind (`requirements.md` §8).
 *
 * **What is logged, and what never is.** Every decision (method, origin, pathname, the
 * route id active at that moment, allow/deny, and which rule fired) is appended to
 * `dist/capture-requests.log` — the artifact `BG-AC-7` is judged on. This module NEVER logs
 * request headers, request bodies, cookies, or any query-string value, because any of those
 * could carry a token or credential (`.cursorrules`). Only `URL#origin` and `URL#pathname`
 * are recorded — the query string is deliberately dropped before anything touches the log.
 */

import type { BrowserContext, Request, Route } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';

/** Where `capture.ts`'s per-route loop writes its current route id (see `routeIdRef` below). */
export interface RouteIdRef {
  current: string;
}

/** Sentinel `routeIdRef.current` value for the window between guard install and the first route. */
export const PRE_ROUTE_LOOP_ROUTE_ID = '(pre-capture: injectAuth bootstrap)';

const LOG_PATH = path.resolve(__dirname, '..', '..', 'dist', 'capture-requests.log');

/**
 * Inert allowlist (`design.md` §3.3 rule 2) — font CDNs (cannot write PRMS data; blocking
 * them breaks rendering) plus the analytics/support-chat vendors named in the design table.
 * Matched by exact hostname or hostname suffix (`foo.hotjar.com` matches `hotjar.com`), so a
 * vendor's various subdomains (e.g. `static.hotjar.com`, `script.hotjar.com`) all match
 * without enumerating each one — but nothing outside these six families ever matches.
 */
const INERT_ALLOWLIST_HOST_SUFFIXES: readonly string[] = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'hotjar.com',
  'clarity.ms',
  'google-analytics.com',
  'tawk.to',
];

/** Module-private: which `BrowserContext`s have had the guard installed on them. */
const installedContexts = new WeakSet<BrowserContext>();

/** Serializes log writes so concurrent in-flight requests never interleave partial lines. */
let writeChain: Promise<void> = Promise.resolve();

function fail(message: string): never {
  // eslint-disable-next-line no-console
  console.error(`[guard:read-only] FAIL — ${message}`);
  process.exit(1);
}

function isInertAllowlisted(hostname: string): boolean {
  return INERT_ALLOWLIST_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

async function ensureLogFile(): Promise<void> {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  const header =
    [
      `# read-only guard log — run started ${new Date().toISOString()}`,
      '# BG-T-3 / BG-DD-3 / BG-AC-7 — this file is the artifact BG-AC-7 is judged on.',
      '#',
      '# Policy (design.md §3.3, default-deny by METHOD, not an origin allowlist):',
      '#   rule 1: GET/HEAD, any origin                          -> allow',
      '#   rule 2: any other method, inert allowlist origin only -> allow',
      '#   rule 3: any other method, any other origin            -> ABORT the request AND FAIL THE WHOLE RUN',
      '#',
      '# ACKNOWLEDGED GAP: Playwright page.route() does not intercept WebSocket frames, so',
      '# pusher/webSocketUrl traffic is NOT covered by this guard. Bounded, not covered:',
      '# pages/bilateral never imports PusherService, and the channel is a receive-only',
      '# third-party hint feed, not a PRMS write path (design.md §3.3, §11 P-13).',
      '#',
      '# Columns: timestamp  decision  rule  method  origin  path  route',
      '# Never contains request headers, request bodies, cookies, or query-string values (.cursorrules).',
      '',
    ].join('\n') + '\n';
  writeChain = fs.writeFile(LOG_PATH, header, 'utf-8');
  await writeChain;
}

interface LogEntry {
  decision: 'ALLOW' | 'DENY';
  rule: 1 | 2 | 3;
  method: string;
  origin: string;
  pathName: string;
  routeId: string;
}

/**
 * Appends one decision line to the log. Logging is NEVER a precondition for enforcement
 * (rework, attempt 2 — both lens Reviewers, independently, on the same defect): this
 * function is written so it cannot reject, in two layers —
 *
 *   1. **De-poison the stored chain.** `writeChain = writeChain.then(write)` alone is a bug:
 *      `.then(onFulfilled)` on an already-rejected promise propagates the rejection WITHOUT
 *      invoking `onFulfilled`, so one transient failure (`ENOSPC`, `dist/` removed mid-run,
 *      `EACCES`) leaves `writeChain` permanently rejected — every later call both skips its
 *      own write AND throws, silently. Appending `.catch(...)` to what gets STORED back into
 *      `writeChain` means the next `.then()` chains onto an already-settled (fulfilled)
 *      promise, so the chain self-heals after exactly one failure instead of poisoning the
 *      rest of the process.
 *   2. **Never reject to the caller either**, belt-and-suspenders: `logWriteFailed` is
 *      caught and reported to stderr, never re-thrown, so `handleRequest()` can `await` this
 *      function unconditionally and it is guaranteed not to prevent `route.continue()` on an
 *      ALLOW or `route.abort()` + `fail()` on a DENY.
 *
 * The `await` at the call site is kept (the Leader-verified flush-before-exit ordering is
 * correct and is preserved) — only the *failure mode* of that await changes, from "poisons
 * everything after it" to "logs to stderr and moves on".
 */
async function logDecision(entry: LogEntry): Promise<void> {
  const line =
    `${new Date().toISOString()}\t${entry.decision}\trule=${entry.rule}\tmethod=${entry.method}\t` +
    `origin=${entry.origin}\tpath=${entry.pathName}\troute=${entry.routeId}\n`;
  writeChain = writeChain.then(() => fs.appendFile(LOG_PATH, line, 'utf-8')).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(
      `[guard:read-only] log write failed (continuing — logging is not load-bearing): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  });
  await writeChain;
}

async function handleRequest(route: Route, request: Request, routeIdRef: RouteIdRef): Promise<void> {
  const method = request.method().toUpperCase();
  const rawUrl = request.url();
  const routeId = routeIdRef.current;

  let origin: string;
  let pathName: string;
  try {
    const parsed = new URL(rawUrl);
    origin = parsed.origin;
    pathName = parsed.pathname;
  } catch {
    // An unparsable "URL" (should not happen for real network requests, but fail closed
    // rather than assume) is treated as deny unless the method itself is safe.
    origin = '(unparsable)';
    pathName = '(unparsable)';
  }

  // Rule 1: GET/HEAD, any origin. `logDecision()` cannot reject (see its own header comment),
  // but the try/catch is a deliberate second layer: a log failure must NEVER turn an allow
  // into a thrown handler either (rework, attempt 2, Reviewer instruction).
  if (method === 'GET' || method === 'HEAD') {
    try {
      await logDecision({ decision: 'ALLOW', rule: 1, method, origin, pathName, routeId });
    } catch {
      // unreachable in practice (logDecision self-heals) — defense in depth only.
    }
    await route.continue();
    return;
  }

  // Rule 2: any other method, inert allowlist origin only.
  let hostname = '';
  try {
    hostname = new URL(origin).hostname;
  } catch {
    hostname = '';
  }
  if (hostname && isInertAllowlisted(hostname)) {
    try {
      await logDecision({ decision: 'ALLOW', rule: 2, method, origin, pathName, routeId });
    } catch {
      // unreachable in practice (logDecision self-heals) — defense in depth only.
    }
    await route.continue();
    return;
  }

  // Rule 3: default-deny. Abort AND fail the whole run — never skip-and-continue.
  // The `try/finally` guarantees the terminal action fires even if the log write throws
  // (belt-and-suspenders on top of logDecision's own self-healing) AND even if
  // `route.abort()` itself throws (detached/closed page, request already handled) — either
  // way, `fail()` still runs and the run still exits non-zero rather than hanging.
  try {
    await logDecision({ decision: 'DENY', rule: 3, method, origin, pathName, routeId });
  } catch {
    // unreachable in practice (logDecision self-heals) — defense in depth only.
  }
  try {
    await route.abort('accessdenied');
  } finally {
    fail(
      `disallowed request — method=${method} origin=${origin} path=${pathName} route=${routeId}. ` +
        'Rule 3 (default-deny) fired: not GET/HEAD and not on the inert allowlist. The run is ' +
        'aborted, not skipped (fail-closed, design.md §3.3). Do NOT widen the allowlist to make ' +
        'this pass — that is the specific failure this guard exists to forbid; escalate via the ' +
        'Pivot Protocol instead (tasks.md BG-T-3 Disqualifier).',
    );
  }
}

/**
 * Installs the read-only guard on `context`. MUST be called — and its companion
 * `assertReadOnlyGuardInstalled()` MUST be checked — before `injectAuth()` is called on any
 * page belonging to this context (see the file header, "Install order matters").
 *
 * `routeIdRef` is a small mutable box `capture.ts` owns: set its `.current` field as the
 * per-route loop advances so a denial's log line and abort message name the route that was
 * active when the disallowed request fired. Before the loop starts (during `injectAuth()`'s
 * own goto+reload), leave it at `PRE_ROUTE_LOOP_ROUTE_ID`.
 */
export async function installReadOnlyGuard(context: BrowserContext, routeIdRef: RouteIdRef): Promise<void> {
  await ensureLogFile();
  await context.route('**/*', (route, request) => handleRequest(route, request, routeIdRef));
  installedContexts.add(context);
}

/**
 * Throws unless `installReadOnlyGuard(context, …)` has already been called for this exact
 * `BrowserContext`. `capture.ts` calls this immediately before `injectAuth()` — the
 * assertion that makes "install before injectAuth" a runtime-checked fact rather than a
 * comment. See "Install order matters" in the file header for why this specific call site
 * matters: `injectAuth()`'s own goto+reload is the broadest page load of the run.
 */
export function assertReadOnlyGuardInstalled(context: BrowserContext): void {
  if (!installedContexts.has(context)) {
    throw new Error(
      '[read-only-guard] assertReadOnlyGuardInstalled: guard is NOT installed on this browser ' +
        'context. capture.ts must call installReadOnlyGuard(page.context(), routeIdRef) BEFORE ' +
        "injectAuth() — injectAuth() performs its own goto()+reload() that mounts the whole app " +
        'shell (design.md §3.3 "Install order matters"), so reaching this assertion with the ' +
        'guard not yet installed is exactly the ordering bug it exists to catch. Refusing to ' +
        'proceed unguarded.',
    );
  }
}
