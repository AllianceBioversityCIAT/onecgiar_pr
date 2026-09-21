/**
 * capture.ts — pipeline orchestration (UG-T-7).
 *
 * // @akili-spec changes/user-guide-pdf
 *
 * Composes the primitives built by `UG-T-3` through `UG-T-6` into the full
 * capture pass described in `design.md` §2.2:
 *
 *   launch Chromium
 *     -> auth.ts: injectAuth()               (UG-T-4)
 *     -> tokens.ts: extractTokens() + writeTokensJson()   (UG-T-5)
 *     -> for each route in routes.config.json (UG-T-3):
 *          goto -> wait readySelector -> skeleton gate -> annotate.ts (UG-T-6) -> screenshot -> remove overlay
 *
 * Strictly read-only (`UG-R-2`, §7 Security): only `page.goto()` and
 * read-oriented queries/screenshots are performed. No `.click()`, `.fill()`,
 * or any interaction with create/submit/delete controls.
 *
 * Fails loudly (`UG-R-2`'s "fail loudly" scenario, §9 Observability): a
 * `readySelector` that never appears, a `clickTarget` that does not resolve
 * to exactly one element, or a route still showing a visible loading
 * skeleton past the bounded wait, aborts the run with a non-zero exit and
 * names the offending route id + selector — never a silent skip.
 *
 * Credential handling (§7): `CLIENT_BASE_URL` and `TEST_TOKEN` come from
 * `.env` only (never hardcoded) and are never logged/printed.
 *
 * UG-T-17 addition (`UG-DD-7` / `UG-R-21`): a route may carry `annotations: CalloutSpec[]` — 2-5
 * labelled feature callouts instead of just the one silent click-target ring. When a route has no
 * `annotations`, this file synthesizes a single-entry fallback `[{ selector: clickTarget, role:
 * 'primary', label: '' }]` so unconfigured routes render EXACTLY as before (ring only, no chip —
 * `annotateCallouts` draws no chip for an empty `label`). Every selector in `annotations` — not
 * just `clickTarget` — is checked for `count() === 1` before annotating, and a route with 2+ or 0
 * matches for ANY entry fails loudly naming the route id, that entry's label, and its selector.
 *
 * BG-T-3 addition (`guards/read-only.ts`): a default-deny request guard is installed on the
 * browser context BEFORE `injectAuth()` is called below — not merely before the per-route
 * loop — because `injectAuth()`'s own goto+reload mounts the whole app shell, the broadest
 * page load of the run. `assertReadOnlyGuardInstalled()` makes that ordering a runtime check
 * rather than a comment: it throws if the guard was not installed on this exact context
 * first. See `guards/read-only.ts`'s header for the full policy (`design.md` §3.3).
 *
 * Attempt-2 rework (Reviewer FAIL on attempt 1, recorded in `execution.md`):
 * `overview`, `reporting-aows`, `results-list`, and `notifications-received`
 * all lay out their real content inside an inner-scrolling container, not
 * the document itself — `page.screenshot({ fullPage: true })` is a no-op on
 * an inner scroll (it only ever expands the DOCUMENT'S capture surface), so
 * those four routes were previously saved cropped/mid-scroll/skeleton-laden.
 * `routes.config.json` (`UG-T-3`) now carries a per-route `viewport`/
 * `fullPage` pair: the four inner-scroll routes get a tall FIXED viewport
 * (1280x1800 — tall enough that their `clickTarget` and the meaningful top
 * of the page both land inside the frame without ever scrolling) and
 * `fullPage: false` (capture exactly that viewport slice); `home` and
 * `ipsr-innovation-list`, whose content scrolls the DOCUMENT itself, keep
 * the `1280x720` default and `fullPage: true`. This also removes the need
 * for the old `target.scrollIntoViewIfNeeded()` step entirely (verified: at
 * these viewports, every route's `clickTarget` bounding box already falls
 * inside the captured frame with zero scrolling) — which matters because a
 * full-page scroll was what previously broke `notifications-received`'s
 * infinite-scroll list (scrolling fetched additional items, breaking its
 * `clickTarget`'s exactly-one-match guarantee).
 */

import 'dotenv/config';
import { chromium, type Page } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';
import { injectAuth } from './auth';
import { extractTokens, writeTokensJson } from './tokens';
import { annotateCallouts, removeAnnotation, OVERLAY_ATTR, type CalloutSpec } from './annotate';
import {
  installReadOnlyGuard,
  assertReadOnlyGuardInstalled,
  PRE_ROUTE_LOOP_ROUTE_ID,
  type RouteIdRef,
} from './guards/read-only';

interface RouteViewport {
  width: number;
  height: number;
}

interface RouteConfig {
  id: string;
  url: string;
  readySelector: string;
  clickTarget: string;
  captionKey: string;
  /** Defaults to `DEFAULT_VIEWPORT` (1280x720) when omitted. */
  viewport?: RouteViewport;
  /**
   * Defaults to `true` when omitted. Set `false` for routes whose real
   * content scrolls inside an INNER container rather than the document
   * itself — `page.screenshot({ fullPage: true })` never expands an inner
   * scroll, so those routes must be captured as a plain viewport-sized
   * screenshot against a `viewport` tall enough to hold their content.
   */
  fullPage?: boolean;
  /**
   * 2-5 labelled feature callouts (`UG-T-17`, `UG-DD-7`, `UG-R-21`). When omitted, `main()`
   * synthesizes a single `{ selector: clickTarget, role: 'primary', label: '' }` fallback entry
   * so the route renders exactly as it did before this field existed (ring only, no chip).
   */
  annotations?: CalloutSpec[];
}

const READY_SELECTOR_TIMEOUT_MS = 25_000;
const RAW_DIR = path.resolve(__dirname, '..', 'raw');

const DEFAULT_VIEWPORT: RouteViewport = { width: 1280, height: 720 };
const DEFAULT_FULL_PAGE = true;

/**
 * Matches this app's two real loading-placeholder conventions (confirmed by reading the
 * live component source, not guessed): the shared `.pr-skeleton` class (`pr-viz-chart`,
 * `skeleton-notification-item`) and the `data-testid="…-skeleton"` naming convention used
 * by ad hoc per-component skeleton blocks (e.g. `program-overview`'s `aow-rows-skeleton`).
 * This app does NOT use PrimeNG's `p-skeleton` or a literal `"skeleton"` substring in most
 * of its own loading markup (most of it is bare Tailwind `animate-pulse`, which is too
 * generic/noisy to gate on safely) — this selector targets the two conventions that are
 * actually load-bearing for the defects found in attempt 1 (the `overview` AoW rows and the
 * `pr-viz-chart` "undefined" axis both render via one of these two, per
 * `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.html`
 * and `src/app/shared/components/pr-viz-chart/pr-viz-chart.component.html`).
 */
const SKELETON_SELECTOR = '.pr-skeleton, [data-testid$="-skeleton"]';
const SKELETON_GATE_TIMEOUT_MS = 10_000;
const SKELETON_GATE_POLL_MS = 200;

/** Thrown (with the route id + selector always named) when a route fails to load or annotate. */
class RouteCaptureError extends Error {
  constructor(routeId: string, detail: string) {
    super(`[capture] ${routeId}: ${detail}`);
    this.name = 'RouteCaptureError';
  }
}

async function loadRoutes(): Promise<RouteConfig[]> {
  // Loaded at runtime (not a static top-level import) so a malformed
  // routes.config.json fails loudly inside main()'s try/catch, named like
  // every other per-route failure, instead of crashing before any logging.
  const raw = await fs.readFile(path.resolve(__dirname, '..', 'routes.config.json'), 'utf-8');
  return JSON.parse(raw) as RouteConfig[];
}

/**
 * Counts skeleton nodes matching `SKELETON_SELECTOR` that are actually VISIBLE in the frame
 * that will be saved, not merely present somewhere in the DOM.
 *
 * `clipToViewport` must match `!fullPage` for the route being checked:
 *   - `fullPage: true` routes capture the WHOLE document (`captureBeyondViewport`), so a
 *     skeleton anywhere in the document (regardless of current scroll position) will end up
 *     in the saved PNG — checked document-wide (no viewport clip).
 *   - `fullPage: false` routes capture only the current viewport rectangle, so a skeleton
 *     outside that rectangle will never appear in the saved PNG and must NOT block the gate.
 *     This distinction is load-bearing on `notifications-received`: confirmed live, that
 *     route permanently renders ~560 trailing `<app-skeleton-notification-item>` placeholders
 *     (an infinite-scroll prefetch buffer, ~3360 `.pr-skeleton` nodes) far below the fold that
 *     never resolve because this pipeline deliberately never scrolls that list (see the file
 *     header). A document-wide check would make this route's gate time out on every run.
 */
async function countVisibleSkeletons(page: Page, clipToViewport: boolean): Promise<number> {
  return page.evaluate(
    ({ selector, clipToViewport }) => {
      const nodes = Array.from(document.querySelectorAll(selector));
      return nodes.filter((node) => {
        const el = node as HTMLElement;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          return false;
        }
        if (!clipToViewport) {
          return true;
        }
        return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      }).length;
    },
    { selector: SKELETON_SELECTOR, clipToViewport },
  );
}

/**
 * The real readiness gate (`design.md` §9 / `requirements.md` §8's "fails loudly" clause):
 * polls until zero VISIBLE skeleton nodes remain in the frame that will be captured, or
 * throws a `RouteCaptureError` naming the route id and `SKELETON_SELECTOR` once
 * `SKELETON_GATE_TIMEOUT_MS` elapses. `readySelector` only proves ONE node rendered; sibling
 * widgets on the same page (charts, KPI cards, per-AoW rows) can still be mid-render at that
 * exact instant — this is the check that actually catches that, replacing the two hardcoded
 * sleeps attempt 1 relied on as its only guard.
 */
async function waitForNoVisibleSkeletons(page: Page, route: RouteConfig, clipToViewport: boolean): Promise<void> {
  const deadline = Date.now() + SKELETON_GATE_TIMEOUT_MS;
  let visible = await countVisibleSkeletons(page, clipToViewport);
  while (visible > 0) {
    if (Date.now() >= deadline) {
      throw new RouteCaptureError(
        route.id,
        `${visible} visible skeleton node(s) matching "${SKELETON_SELECTOR}" still present after ` +
          `${SKELETON_GATE_TIMEOUT_MS}ms (route would have saved a half-rendered frame)`,
      );
    }
    await page.waitForTimeout(SKELETON_GATE_POLL_MS);
    visible = await countVisibleSkeletons(page, clipToViewport);
  }
}

async function main(): Promise<void> {
  const baseUrl = process.env.CLIENT_BASE_URL;
  const token = process.env.TEST_TOKEN;
  const channel = process.env.PLAYWRIGHT_CHANNEL || undefined;

  if (!baseUrl) {
    throw new Error('[capture] CLIENT_BASE_URL is not set (check tooling/.env)');
  }
  if (!token) {
    throw new Error('[capture] TEST_TOKEN is not set (check tooling/.env)');
  }

  const routes = await loadRoutes();

  await fs.mkdir(RAW_DIR, { recursive: true });

  const browser = await chromium.launch({ channel });
  try {
    const page = await browser.newPage(); // per-route viewport is set inside the loop below

    // BG-T-3: install the read-only guard on the CONTEXT before injectAuth() — its own
    // goto+reload is the broadest page load of the run and must not be unguarded. The
    // assertion below is what makes that ordering checkable, not merely commented.
    const routeIdRef: RouteIdRef = { current: PRE_ROUTE_LOOP_ROUTE_ID };
    await installReadOnlyGuard(page.context(), routeIdRef);
    assertReadOnlyGuardInstalled(page.context());

    await injectAuth(page, baseUrl, token);

    console.log('[capture] extracting live design tokens…');
    const tokens = await extractTokens(page);
    const tokensPath = await writeTokensJson(tokens);
    console.log(`[capture] tokens written to ${tokensPath}`);

    const orange = tokens['--pr-color-orange-500'];

    for (const route of routes) {
      routeIdRef.current = route.id; // BG-T-3: guard log/abort messages name the active route

      const viewport = route.viewport ?? DEFAULT_VIEWPORT;
      const fullPage = route.fullPage ?? DEFAULT_FULL_PAGE;

      await page.setViewportSize(viewport);

      console.log(`[capture] ${route.id}: navigating… (viewport ${viewport.width}x${viewport.height}, fullPage=${fullPage})`);
      await page.goto(new URL(route.url, baseUrl).toString());

      try {
        await page.waitForSelector(route.readySelector, { timeout: READY_SELECTOR_TIMEOUT_MS });
      } catch {
        throw new RouteCaptureError(
          route.id,
          `readySelector "${route.readySelector}" did not appear within ${READY_SELECTOR_TIMEOUT_MS}ms ` +
            '(route may have landed on login/error/empty state instead of real data)',
        );
      }
      // `readySelector` proves real data has started rendering, but sibling
      // widgets on the same page (skeleton-loader cards, lazy async panels)
      // can still be mid-render at that exact instant. This short settle is
      // purely a capture-quality delay, NOT the readiness gate — the actual
      // gate is `waitForNoVisibleSkeletons` right below, which asserts and
      // fails loudly rather than just hoping 1.5s was enough.
      await page.waitForTimeout(1500);

      await waitForNoVisibleSkeletons(page, route, !fullPage);
      console.log(`[capture] ${route.id}: ready`);

      // UG-T-17 (UG-DD-7 / UG-R-21): a route with no `annotations[]` gets a single synthesized
      // primary entry with an EMPTY label, so `annotateCallouts` draws a ring only — identical
      // to this pipeline's pre-UG-T-17 output — never a fabricated fallback label.
      const specs: CalloutSpec[] =
        route.annotations && route.annotations.length > 0
          ? route.annotations
          : [{ selector: route.clickTarget, role: 'primary', label: '' }];

      const callouts: Array<{ locator: ReturnType<Page['locator']>; spec: CalloutSpec }> = [];
      for (const spec of specs) {
        const locator = page.locator(spec.selector);
        const count = await locator.count();
        if (count !== 1) {
          throw new RouteCaptureError(
            route.id,
            `callout "${spec.label || '(unlabeled)'}" selector "${spec.selector}" resolved to ` +
              `${count} element(s) (expected exactly 1)`,
          );
        }
        callouts.push({ locator, spec });
      }

      // No scrolling: each route's `viewport` (routes.config.json, UG-T-3) is chosen so every
      // callout target and the meaningful top of the page both fall inside the frame that will
      // actually be captured, verified per-route against the live app before this config was
      // written (see the file header). Scrolling was previously required to pull below-the-fold,
      // visibility-gated widgets into view for a `fullPage: true` capture — but a full-page
      // scroll is also what broke `notifications-received` (it fetches more items on scroll,
      // invalidating the exactly-one-match callout count above), so removing the scroll step
      // entirely, in favor of a viewport tall enough to make it unnecessary, fixes both.
      try {
        await annotateCallouts(
          page,
          callouts,
          { ring: orange, chipBg: tokens['--pr-color-secondary-400'] },
          { fullPage },
        );
        await page.screenshot({
          path: path.join(RAW_DIR, `${route.id}.png`),
          fullPage,
        });
      } catch (err) {
        throw new RouteCaptureError(
          route.id,
          `annotate/screenshot failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        await removeAnnotation(page);
      }

      const residual = await page.locator(`[${OVERLAY_ATTR}]`).count();
      if (residual !== 0) {
        throw new RouteCaptureError(
          route.id,
          `${residual} residual [${OVERLAY_ATTR}] node(s) remained after removeAnnotation()`,
        );
      }
      console.log(`[capture] ${route.id}: screenshot saved`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
