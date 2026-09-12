// @akili-spec changes/cognito-email-otp-login — OTP-T-8, design.md §5.3/§6.2/§6.3
// Implements: OTP-R-14 (responsive + a11y), OTP-AC-15.
//
// Cypress Component Test — mounts the REAL `LoginComponent` (real `CenterOtpPanelComponent`, real
// `CognitoService` state machine, real `mapOtpErrorKey` mapping) with `AuthService` stubbed at its
// HTTP boundary only (`GET_otpConfig`/`POST_otpStart`/`POST_otpVerify` — `auth.service.ts`).
// `ApiService`/`RolesService`/`Router`/`ActivatedRoute` are ALSO stubbed, not because this suite
// drives them, but to cut the transitive DI chain `CognitoService.api` -> real `ApiService` ->
// `ResultsApiService`/`BilateralApiService` -> `HttpClient`, and `CognitoService.rolesSE` -> real
// `RolesService` -> `DataControlService` -> `ResultsApiService` -> `HttpClient` (no `HttpClient`
// provider exists in this CT harness — `cypress/support/component.ts` — same reason
// `bilateral-review.cy.ts` stubs its whole `ApiService` aggregator rather than letting the real one
// construct). Neither chain is ever exercised on the mismatch path this suite drives (only
// `loginWithAzureAd`/`updateCacheService` touch them, and neither runs here).
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { LoginComponent } from './login.component';
import { AuthService } from '../../shared/services/api/auth.service';
import { ApiService } from '../../shared/services/api/api.service';
import { RolesService } from '../../shared/services/global/roles.service';

/** `GET_otpConfig` shape (`auth.service.ts:GET_otpConfig` — `{ response: { domains: string[] } }`),
 *  consumed by `login.component.ts:85-88` as `resp?.response?.domains`. Two allow-listed domains
 *  so the Center path (and its helper text) renders. */
const CENTER_DOMAINS = ['icrisat.org', 'cifor-icraf.org'];

/** `POST_otpStart` success shape per its own docstring (`auth.service.ts:POST_otpStart`) — read by
 *  `cognito.service.ts:startOtp` as `resp?.response?.session` / `resp?.response?.destination`. */
const OTP_START_RESPONSE = { response: { session: 'FAKE-SESSION', destination: 'a***@icrisat.org' } };

/** `POST_otpVerify` failure — the server error envelope `cognito.service.ts:mapOtpErrorKey` reads
 *  (`err?.error?.response?.code`) for `OTP_CODE_MISMATCH`, mapped to the panel's own `mismatch`
 *  copy (`center-otp-panel.component.ts:OTP_ERROR_COPY`) — NOT the `message` here, which
 *  `reportOtpError` only reads for the `unknown` key. Kept anyway for envelope fidelity. */
const OTP_VERIFY_MISMATCH_ERROR = {
  error: { response: { code: 'OTP_CODE_MISMATCH' }, message: 'Code incorrect. Try again.' },
  status: 401
};

function mountPage() {
  return cy.mount(LoginComponent, {
    providers: [
      {
        provide: AuthService,
        useValue: {
          inLogin: signal(false),
          localStorageUser: null,
          consumePendingRedirectUrl: () => null,
          GET_otpConfig: () => of({ response: { domains: CENTER_DOMAINS } }),
          POST_otpStart: () => of(OTP_START_RESPONSE),
          POST_otpVerify: () => throwError(() => OTP_VERIFY_MISMATCH_ERROR)
        }
      },
      { provide: ApiService, useValue: { resultsSE: { GET_loginWithAzureAd: () => of({ response: { authUrl: '' } }) } } },
      { provide: RolesService, useValue: {} },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true), navigateByUrl: () => Promise.resolve(true) } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } }
    ]
  });
}

// ── Shared helpers — same AC-14-style disqualifier guard `bilateral-review.cy.ts` uses: measure
// and assert on the MEASURED effective width, never the requested one. ────────────────────────
// `documentElement.clientWidth` (what `bilateral-review.cy.ts` / `kp-cgspace-browse.cy.ts` measure)
// excludes a native vertical scrollbar's own width. At 375x812 on the code step this suite drives
// to, the panel's content is taller than the viewport (measured: innerWidth=375, clientWidth=360,
// scrollHeight=823 > clientHeight=812 — an 11px vertical overflow), so a real vertical scrollbar
// appears in this Electron/CT desktop renderer and shaves ~15px off `clientWidth` — a rendering
// artifact of running a mobile-sized viewport in a desktop test runner (real mobile browsers use
// overlay scrollbars that don't consume layout width), not a layout regression. The exemplars avoid
// this by mounting at a much taller-than-content viewport height so no scrollbar ever appears; that
// isn't available here because 375x812 is itself the real device size OTP-R-14 targets. So the guard
// below allows exactly one scrollbar gutter and nothing else — it stays fallible on purpose:
//   1. root `zoom` must be '1' (the `--pr-font-scale` trap the exemplar documents);
//   2. `innerWidth - clientWidth` must be at most 17 px (one native scrollbar), so any other shave fails;
//   3. `clientWidth` must be within 4 px of `expected - gutter`.
// Do NOT "simplify" this to `innerWidth`: in Cypress `innerWidth` IS the requested viewport by
// construction, so an assertion on it can never fail (Reviewer round 1). `assertNoBodyHorizontalOverflow`'s
// `scrollWidth <= clientWidth` check is the real horizontal-overflow gate and is unaffected by a
// vertical scrollbar either way.
function assertEffectiveWidth(label: string, expected: number): void {
  cy.document().should(doc => {
    const clientWidth = doc.documentElement.clientWidth;
    const innerWidth = doc.defaultView!.innerWidth;
    const gutter = innerWidth - clientWidth;

    expect(getComputedStyle(doc.documentElement).zoom, `${label}: root zoom is unset (not scaled by --pr-font-scale)`).to.eq('1');
    expect(gutter, `${label}: scrollbar gutter (innerWidth=${innerWidth} - clientWidth=${clientWidth})`).to.be.at.most(17);
    expect(
      clientWidth,
      `${label}: requested viewport width ${expected} -> measured clientWidth ${clientWidth} (innerWidth=${innerWidth}, gutter=${gutter})`
    ).to.be.closeTo(expected - gutter, 4);
  });
}

function assertNoBodyHorizontalOverflow(label: string): void {
  cy.document().should(doc => {
    const de = doc.documentElement;
    expect(de.scrollWidth, `${label}: documentElement.scrollWidth(${de.scrollWidth}) <= clientWidth(${de.clientWidth})`).to.be.at.most(de.clientWidth);
  });
}

/** Drives the real state machine to the code step with a mismatch error surfaced:
 *  open the Center panel -> type an allow-listed email -> send -> type a code -> verify (errors). */
function driveToCodeStepWithError(): void {
  cy.get('[data-test="otp-center-button"]').click();
  cy.get('[data-test="otp-email"]').type('a.person@icrisat.org');
  cy.get('[data-test="otp-send"]').click();
  cy.get('[data-test="otp-code"]').should('exist').type('123456');
  cy.get('[data-test="otp-verify"]').click();
  cy.get('[data-test="otp-status"]').should('contain.text', 'Code incorrect. Try again.');
}

describe('LoginComponent — Center OTP panel — Cypress CT (OTP-T-8)', () => {
  ([
    [1536, 864, 'desktop'],
    [840, 900, 'tablet (below md)'],
    [375, 812, 'mobile']
  ] as const).forEach(([width, height, kind]) => {
    describe(`${width}x${height} — ${kind}`, () => {
      beforeEach(() => {
        cy.viewport(width, height);
        mountPage();
        driveToCodeStepWithError();
        assertEffectiveWidth(`${width}`, width);
      });

      it(`OTP-R-14: the document never scrolls horizontally at ${width}px`, () => {
        assertNoBodyHorizontalOverflow(`${width}`);
      });

      it('OTP-R-14: every Center-path control is >= 24px tall', () => {
        // Scoped per Leader decision on OTP-T-8 attempt 4: the >= 24px gate (OTP-AC-15, design.md
        // §6.3) applies to the surface this spec introduces — the Center path — not to the whole
        // `.login-card`, which also contains the pre-existing `.global-link` support-email anchor
        // (`login.component.html:195`, `login.component.scss:322`, 15px tall) that predates this
        // spec and is recorded by the Leader as an a11y follow-up outside this spec, not restyled
        // here. The control set is the union of: (a) any `[data-test^="otp-"]` element that is a
        // button/input/a (covers `otp-center-cancel`, which sits in `login.component.html` as a
        // sibling of `<app-center-otp-panel>`, not a descendant of it), and (b) every button/input/a
        // descendant of `<app-center-otp-panel>` (covers otp-code/otp-verify/otp-resend/otp-back —
        // otp-email/otp-send are NOT rendered at this code step, so they are intentionally absent
        // from this set). The membership assertions below make the gate non-vacuous: it cannot
        // pass by having filtered its way down to an empty or trivial set.
        cy.document().should(doc => {
          const fromDataTest = Array.from(doc.querySelectorAll<HTMLElement>('[data-test^="otp-"]')).filter(el =>
            ['BUTTON', 'INPUT', 'A'].includes(el.tagName)
          );
          const panel = doc.querySelector('app-center-otp-panel');
          const fromPanel = panel ? Array.from(panel.querySelectorAll<HTMLElement>('button, input, a')) : [];
          const merged = Array.from(new Set<HTMLElement>([...fromDataTest, ...fromPanel]));
          const controls = merged.filter(el => el.getClientRects().length > 0);

          const testIds = new Set(controls.map(el => el.getAttribute('data-test')).filter(Boolean));
          ['otp-center-cancel', 'otp-code', 'otp-verify', 'otp-resend', 'otp-back'].forEach(id => {
            expect(testIds.has(id), `Center-path control set includes "${id}"`).to.be.true;
          });

          expect(controls.length, 'at least one Center-path control is visible').to.be.greaterThan(0);
          controls.forEach(el => {
            const rect = el.getBoundingClientRect();
            const label = el.getAttribute('data-test') || el.getAttribute('href') || el.textContent?.trim().slice(0, 30) || el.tagName;
            expect(rect.height, `"${label}" height(${rect.height.toFixed(1)}) >= 24`).to.be.at.least(24);
          });
        });
      });

      it('OTP-AC-15: the aria-live status region contains the error text', () => {
        cy.get('[data-test="otp-status"]').should($el => {
          expect($el.attr('aria-live'), 'aria-live="polite"').to.eq('polite');
          expect($el.text(), 'status text contains the mismatch copy').to.contain('Code incorrect. Try again.');
        });
      });

      it('OTP-R-14 / design §6.3 / OTP-AC-15: the code input carries inputmode="numeric" and autocomplete="one-time-code"', () => {
        cy.get('[data-test="otp-code"]').should('have.attr', 'inputmode', 'numeric').and('have.attr', 'autocomplete', 'one-time-code');
      });
    });
  });
});
