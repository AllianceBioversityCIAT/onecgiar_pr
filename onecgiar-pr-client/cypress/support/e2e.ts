// ***********************************************************
// Loaded automatically before every E2E spec.
// Global configuration and behaviour that modifies Cypress.
//
// https://on.cypress.io/configuration
// ***********************************************************

import './commands';

/**
 * The PRMS shell fires a fan-out of catalog requests on boot (roles, phases, global
 * parameters, Pusher, telemetry). Any of them rejecting — a flaky catalog, a socket that
 * cannot connect, a 401/500 from the shared test backend — surfaces in Cypress as an
 * uncaught exception and fails whatever test happens to be running, even though the flow
 * under test is fine.
 *
 * We therefore swallow application-level errors GLOBALLY and let the specs assert on the
 * DOM/network instead. Errors thrown by the test code itself still fail the test, because
 * Cypress only routes AUT errors through this hook.
 */
Cypress.on('uncaught:exception', () => false);

/** Same rationale for unhandled promise rejections from RxJS/HttpClient. */
Cypress.on('window:before:load', win => {
  win.addEventListener('unhandledrejection', event => event.preventDefault());
});
