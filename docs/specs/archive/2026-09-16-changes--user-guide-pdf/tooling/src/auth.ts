/**
 * auth.ts — localStorage token+user session injection (UG-T-4).
 *
 * Reuses the reporting tool's own documented automation pattern instead of driving a
 * real login form (see design.md `UG-DD-4` and `onecgiar-pr-client/CLAUDE.md` §9,
 * "Automating this app needs TWO localStorage keys, not one"): `RolesService` resolves
 * identity from `localStorage.getItem('user').id`, so injecting only `token` produces a
 * silently half-built, logged-out-looking session (`isAdmin: false`, `readOnly: true`,
 * `myInitiativesList: []`). Both `token` and `user` must be written together, then the
 * page reloaded so `RolesService`/`AuthService` pick the session up.
 *
 * The token itself must be a real, previously-issued JWT (obtained via an actual login) —
 * this module never fabricates one, and never logs the token value or any substring of it.
 */

import type { Page } from '@playwright/test';

/** Shape RolesService/AuthService expect at `localStorage['user']`. */
export interface InjectedUser {
  id: number | string;
  email: string;
  first_name: string;
  last_name: string;
}

/**
 * Decodes the payload (middle) segment of a JWT — base64url, no external JWT library
 * needed. Throws if the token is not a 3-segment JWT or the payload isn't valid JSON.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(
      'injectAuth: TEST_TOKEN does not look like a JWT (expected 3 dot-separated segments)',
    );
  }

  const payloadSegment = parts[1];
  // base64url -> base64: swap the two divergent characters, then restore padding.
  const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(paddingNeeded);

  let json: string;
  try {
    json = Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    throw new Error('injectAuth: failed to base64url-decode the JWT payload segment');
  }

  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error('injectAuth: JWT payload segment did not decode to valid JSON');
  }
}

/**
 * Rebuilds the `{id, email, first_name, last_name}` user object RolesService needs from
 * a decoded JWT payload (per `UG-DD-4`). Throws loudly if a required claim is missing
 * rather than silently defaulting to an empty/half-built session.
 */
export function buildUserFromPayload(payload: Record<string, unknown>): InjectedUser {
  const id = payload['id'] ?? payload['sub'] ?? payload['user_id'];
  const email = payload['email'];
  const firstName = payload['first_name'] ?? payload['firstName'] ?? payload['given_name'];
  const lastName = payload['last_name'] ?? payload['lastName'] ?? payload['family_name'];

  if (id === undefined || id === null || id === '') {
    throw new Error(
      'injectAuth: JWT payload has no "id" (or "sub"/"user_id") claim — cannot rebuild the injected user object',
    );
  }
  if (!email) {
    throw new Error('injectAuth: JWT payload has no "email" claim — cannot rebuild the injected user object');
  }

  return {
    id: id as number | string,
    email: email as string,
    first_name: (firstName as string | undefined) ?? '',
    last_name: (lastName as string | undefined) ?? '',
  };
}

/**
 * Logs a Playwright browser context into the reporting tool by writing both `token` and
 * `user` to `localStorage`, then reloading so the app's session/role state picks it up.
 *
 * @param page Playwright `Page` to inject the session into.
 * @param baseUrl Base URL of the running client (e.g. `https://reporting.cgiar.org`).
 * @param token A real, previously-obtained JWT. Never hardcode this — pass it in from an
 *   env var (`TEST_TOKEN`) or another out-of-band source.
 */
export async function injectAuth(page: Page, baseUrl: string, token: string): Promise<void> {
  if (!token) {
    throw new Error('injectAuth: no token provided (expected a real JWT, e.g. via TEST_TOKEN)');
  }
  if (!baseUrl) {
    throw new Error('injectAuth: no baseUrl provided (expected e.g. CLIENT_BASE_URL)');
  }

  // Decode+validate before touching the page, so a bad token fails before any navigation.
  const payload = decodeJwtPayload(token);
  const user = buildUserFromPayload(payload);

  console.log('[auth] navigating to base URL…');
  await page.goto(baseUrl);

  console.log('[auth] injecting session (token + user) into localStorage…');
  await page.evaluate(
    ({ injectedToken, injectedUser }) => {
      localStorage.setItem('token', injectedToken);
      localStorage.setItem('user', JSON.stringify(injectedUser));
    },
    { injectedToken: token, injectedUser: user },
  );

  console.log('[auth] reloading so RolesService/AuthService pick up the session…');
  await page.reload();

  console.log('[auth] auth injected');
}

// ---------------------------------------------------------------------------------------
// Standalone verification runner (UG-T-4 DoD). Not part of the pipeline's programmatic
// API — capture.ts (UG-T-7) will import `injectAuth` directly instead of running this.
// Run with: npx ts-node src/auth.ts
// ---------------------------------------------------------------------------------------
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();

  (async () => {
    const baseUrl = process.env.CLIENT_BASE_URL;
    const token = process.env.TEST_TOKEN;

    if (!baseUrl) {
      throw new Error('Standalone auth.ts run: CLIENT_BASE_URL is not set (check tooling/.env)');
    }
    if (!token) {
      throw new Error('Standalone auth.ts run: TEST_TOKEN is not set (check tooling/.env)');
    }

    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();

      await injectAuth(page, baseUrl, token);

      // Post-injection checks — read-only, no console.log of the token/user/roles values.

      // Check 1: localStorage['user'] round-trips with the shape RolesService needs.
      const userRoundTrip = await page.evaluate(() => {
        const raw = localStorage.getItem('user');
        if (!raw) return { ok: false, reason: 'no user key in localStorage' };
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          return {
            ok: typeof parsed.id !== 'undefined' && typeof parsed.email === 'string',
            hasId: typeof parsed.id !== 'undefined',
            hasEmail: typeof parsed.email === 'string',
          };
        } catch {
          return { ok: false, reason: 'user value is not valid JSON' };
        }
      });
      const tokenPresent = await page.evaluate(() => Boolean(localStorage.getItem('token')));

      // Check 2: the authenticated app shell actually rendered (not stuck on /login).
      let shellRendered = false;
      try {
        await page.waitForSelector('app-reporting-nav-sidebar', { timeout: 15_000 });
        shellRendered = true;
      } catch {
        shellRendered = false;
      }
      const landedOnLogin = /\/login(\/|$|\?)/.test(new URL(page.url()).pathname);

      // Check 3 (the real role-gated check): RolesService only writes localStorage['roles']
      // after a SUCCESSFUL GET_allRolesByUser() call using our injected token as the `auth`
      // header — this is the app's own code confirming the token is a real, backend-accepted
      // session, not merely that we wrote what we intended to write. Give it a moment to land.
      await page.waitForTimeout(3_000);
      const rolesCheck = await page.evaluate(() => {
        const raw = localStorage.getItem('roles');
        if (!raw) return { ok: false, reason: 'no roles key in localStorage yet' };
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          return { ok: typeof parsed.application !== 'undefined', hasApplication: typeof parsed.application !== 'undefined' };
        } catch {
          return { ok: false, reason: 'roles value is not valid JSON' };
        }
      });

      console.log('[auth:verify] localStorage.user round-trip check:', JSON.stringify(userRoundTrip));
      console.log('[auth:verify] localStorage.token present:', tokenPresent);
      console.log('[auth:verify] authenticated shell rendered (app-reporting-nav-sidebar present):', shellRendered);
      console.log('[auth:verify] landed on /login instead of the target app:', landedOnLogin);
      console.log('[auth:verify] localStorage.roles populated by a real RolesService fetch:', JSON.stringify(rolesCheck));

      if (!userRoundTrip.ok || !tokenPresent) {
        throw new Error('Standalone verification FAILED: token/user did not persist as expected after reload');
      }
      if (landedOnLogin || !shellRendered) {
        throw new Error('Standalone verification FAILED: app redirected to /login or the authenticated shell never rendered');
      }
      if (!rolesCheck.ok) {
        throw new Error(
          'Standalone verification FAILED: RolesService never populated localStorage.roles — the token was not accepted as a real session by the backend',
        );
      }

      console.log('[auth:verify] PASS: authenticated session confirmed after reload (shell rendered, RolesService fetched real roles)');
    } finally {
      await browser.close();
    }
  })().catch((err) => {
    console.error('[auth:verify] FAILED:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
