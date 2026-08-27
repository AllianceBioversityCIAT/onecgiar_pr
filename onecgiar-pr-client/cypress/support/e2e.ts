// ***********************************************************
// Loaded automatically before every E2E spec.
// Global configuration and behaviour that modifies Cypress.
//
// https://on.cypress.io/configuration
// ***********************************************************

import './commands';

/**
 * The PRMS shell fires a fan-out of catalog requests on boot (roles, phases, global parameters,
 * Pusher, telemetry). Any of them rejecting — a flaky catalog, a socket that cannot connect, a
 * 401/500 from the shared test backend — surfaces in Cypress as an uncaught exception and fails
 * whatever test happens to be running, even though the flow under test is fine.
 *
 * That noise is what the swallow was written for. It used to be `() => false`, i.e. EVERY
 * application error was hidden — including the ones thrown while saving, which is precisely where
 * this suite is supposed to have teeth. A section that blows up in its save handler must fail its
 * test, not go green because the exception was eaten.
 *
 * So the swallow is now bounded twice over:
 *   1. by TIME — only during the boot window that follows each page load, and
 *   2. by SOURCE — a short allow-list of known-noisy subsystems, which applies at any time
 *      because those keep firing on a timer long after boot.
 *
 * Anything else — a TypeError in a component, a failed save — reaches Cypress and fails the test.
 * A spec that needs a different budget can set `Cypress.env('bootGraceMs')`.
 */
const DEFAULT_BOOT_GRACE_MS = 10000;

/** Subsystems that are noisy by nature and never part of what a spec asserts. */
const ALWAYS_IGNORED = [
  /pusher/i,
  /websocket/i,
  /socket/i,
  /ResizeObserver loop/i,
  /Loading chunk \d+ failed/i,
  /NG0100/i // ExpressionChangedAfterItHasBeenChecked — dev-mode only, never a save failure
];

/** Reset on every page load (initial visit AND `cy.reload()`), so each boot gets its own window. */
let lastPageLoadAt = Date.now();

const bootGraceMs = (): number => Number(Cypress.env('bootGraceMs') ?? DEFAULT_BOOT_GRACE_MS);
const withinBootWindow = (): boolean => Date.now() - lastPageLoadAt < bootGraceMs();
const isKnownNoise = (text: string): boolean => ALWAYS_IGNORED.some(pattern => pattern.test(text));

/** `false` swallows the error; `true` (or nothing) lets Cypress fail the test with it. */
Cypress.on('uncaught:exception', (err: Error) => {
  const text = `${err?.message ?? ''}\n${err?.stack ?? ''}`;

  if (isKnownNoise(text)) return false;
  if (withinBootWindow()) return false;

  return true;
});

Cypress.on('window:before:load', win => {
  lastPageLoadAt = Date.now();

  /**
   * Same rationale for unhandled promise rejections from RxJS/HttpClient — and the same two
   * bounds. Not calling `preventDefault()` lets the rejection reach Cypress, which routes it
   * through `uncaught:exception` above and fails the test.
   */
  win.addEventListener('unhandledrejection', event => {
    const reason: any = event.reason;
    const text = `${reason?.message ?? reason ?? ''}\n${reason?.stack ?? ''}`;

    if (isKnownNoise(text) || withinBootWindow()) event.preventDefault();
  });
});
