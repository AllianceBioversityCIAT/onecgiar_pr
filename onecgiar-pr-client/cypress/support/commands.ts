/// <reference types="cypress" />
// ***********************************************
// Custom commands for the PRMS E2E suite.
//
// Two auth paths:
//   * cy.loginByToken()  — FAST, preferred. Seeds localStorage['token'] + ['user']
//                          inside a cy.session so it is cached across specs.
//   * cy.login('guest')  — SLOW, exercises the real login form. Kept because the
//                          login screen itself needs coverage.
// ***********************************************

// Define available user roles
export enum UserRole {
  GUEST = 'guest',
  ADMIN = 'admin' // For future use
}

/**
 * The landing route after a successful login is no longer fixed: the app redirects to the
 * user's first assigned science program (`/result-framework-reporting/planned-toc?sp=<id>`)
 * or, when they have none, to `/result/results-outlet/results-list`.
 */
export const LANDING_URL_PATTERN = /(result-framework-reporting|result\/results-outlet)/;

/** localStorage keys written by AuthService (src/app/shared/services/api/auth.service.ts). */
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/** Minimal LocalStorageUser rebuilt from the JWT payload (id / email / user_name). */
function userFromToken(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const claims = JSON.parse(json) as Record<string, unknown>;
    const firstName = (claims.first_name as string) || '';
    const lastName = (claims.last_name as string) || '';

    return {
      id: claims.id,
      email: claims.email,
      first_name: firstName,
      last_name: lastName,
      user_name: `${firstName} ${lastName}`.trim() || (claims.email as string)
    };
  } catch {
    return null;
  }
}

/**
 * Fast, session-cached auth. Seeds the two localStorage keys AuthService reads and
 * lands on `visitUrl` (default `/`). Logs a warning and just visits `/` when no token is
 * configured, so specs guarded by `Cypress.env('hasToken')` still pass on a secret-less machine.
 */
Cypress.Commands.add('loginByToken', (visitUrl = '/') => {
  const token: string = Cypress.env('userToken') || '';

  if (!token) {
    cy.log('⚠️ No userToken configured (cypress.env.js). Skipping token login.');
    cy.visit('/');
    return;
  }

  const user = userFromToken(token);

  cy.session(
    ['prms-token-session', token.slice(-12)],
    () => {
      // A same-origin visit is required before localStorage is writable, and the keys must be
      // in place BEFORE the Angular app boots — otherwise its first requests go out
      // unauthenticated and the backend answers 401.
      cy.visit('/login', {
        onBeforeLoad(win) {
          win.localStorage.setItem(TOKEN_KEY, token);
          if (user) win.localStorage.setItem(USER_KEY, JSON.stringify(user));
        }
      });
    },
    {
      cacheAcrossSpecs: true,
      validate() {
        cy.window({ log: false })
          .its('localStorage')
          .invoke('getItem', TOKEN_KEY)
          .should('be.a', 'string')
          .and('have.length.greaterThan', 20);
      }
    }
  );

  cy.visit(visitUrl);
});

/**
 * The ONE selector helper for everything outside `src/app/custom-fields/**`.
 *
 * Page-level markup is addressed by `data-testid` and nothing else: tag names
 * (`app-save-button`) and utility classes are refactor fodder — the suite silently rotted for two
 * days when P2-3435 renamed `app-save-button` to `app-section-bottom-bar`, because every spec was
 * anchored to a component name. A `data-testid` is a contract; a tag name is an implementation
 * detail.
 *
 * The custom-fields are the documented exception: their internals (`a.field`, `.options .option`,
 * `.pr-field.complete`, `input.pr-native-radio`) are the component's public behaviour and are
 * described in `cypress/support/result-detail.ts`.
 */
Cypress.Commands.add('testid', (id: string, options?: Partial<Cypress.Loggable & Cypress.Timeoutable & Cypress.Withinable & Cypress.Shadow>) =>
  cy.get(`[data-testid="${id}"]`, options)
);

// Custom command for login with role support (real UI flow)
Cypress.Commands.add('login', (role?: string, email?: string, password?: string) => {
  // Default to guest role if not specified
  const userRole = role || UserRole.GUEST;

  // Use provided credentials or get from environment based on role
  let testEmail: string;
  let testPassword: string;

  if (email && password) {
    testEmail = email;
    testPassword = password;
  } else if (userRole === UserRole.GUEST) {
    testEmail = Cypress.env('guestEmail') || '';
    testPassword = Cypress.env('guestPassword') || '';
  } else if (userRole === UserRole.ADMIN) {
    testEmail = Cypress.env('adminEmail') || ''; // For future use
    testPassword = Cypress.env('adminPassword') || ''; // For future use
  } else {
    throw new Error(`Unknown user role: ${userRole}`);
  }

  // Validate credentials before attempting login
  if (!testEmail || !testPassword) {
    cy.log(`⚠️ No credentials found for role: ${userRole}. Skipping login.`);
    cy.visit('/');
    return;
  }

  cy.log(`🔐 Logging in as ${userRole} user`);

  // Navigate to login if not already there
  cy.visit('/');

  // Click to show the external user login form
  cy.contains('Continue as an external user').click();

  // Fill in credentials. PrimeNG was removed: the password control is now a plain
  // `<input hlmInput id="password">`, no longer `p-password input`.
  cy.get('#email').should('be.visible').type(testEmail);
  cy.get('#password').should('be.visible').type(testPassword, { log: false });

  // Click login button
  cy.get('.signin-btn').should('be.visible').should('not.be.disabled').click();

  // The landing route depends on the user's science-program assignments, so only assert
  // that we left the login screen for one of the two possible destinations.
  cy.url({ timeout: 30000 }).should('match', LANDING_URL_PATTERN);

  cy.log(`✅ Successfully logged in as ${userRole} user`);
});

// Custom command to check if credentials are available
Cypress.Commands.add('hasCredentials', (role?: string) => {
  const userRole = role || UserRole.GUEST;

  if (userRole === UserRole.GUEST) {
    return Cypress.env('guestEmail') && Cypress.env('guestPassword');
  } else if (userRole === UserRole.ADMIN) {
    return Cypress.env('adminEmail') && Cypress.env('adminPassword');
  }

  return false;
});

// Type definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(role?: string, email?: string, password?: string): Chainable<void>;
      loginByToken(visitUrl?: string): Chainable<void>;
      hasCredentials(role?: string): boolean;
      /** `cy.get('[data-testid="<id>"]')` — the only page-level selector this suite is allowed to use. */
      testid(
        id: string,
        options?: Partial<Cypress.Loggable & Cypress.Timeoutable & Cypress.Withinable & Cypress.Shadow>
      ): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {}; // This makes the file a module
