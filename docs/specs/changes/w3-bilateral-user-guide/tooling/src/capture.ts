/**
 * capture.ts — pipeline orchestration (UG-T-7).
 *
 * // @akili-spec changes/w3-bilateral-user-guide
 *
 * Composes the primitives built by `UG-T-3` through `UG-T-6` into the full
 * capture pass described in `design.md` §2.2:
 *
 *   launch Chromium
 *     -> auth.ts: injectAuth()               (UG-T-4)
 *     -> tokens.ts: extractTokens() + writeTokensJson()   (UG-T-5)
 *     -> for each route in routes.config.json (UG-T-3):
 *          goto -> steps (BG-T-4) -> wait readySelector -> skeleton gate -> annotate.ts (UG-T-6) -> screenshot -> remove overlay
 *
 * Read-only is ENFORCED BY THE GUARD, NOT BY THE ABSENCE OF CLICKS (`BG-R-7`, §7 Security,
 * corrected by `BG-T-4` — this paragraph used to describe the pre-`BG-T-4` copy, where it was
 * still true; it stopped being true the moment `steps` could `click`/`fill`, so treat this
 * paragraph, not the old one, as authoritative). This module DOES perform `.click()`, `.fill()`,
 * and `.press()` — via the declarative `steps` a route config may carry (`BG-T-4`, `design.md`
 * §5) — and none of that is a violation of read-only, because the safety property does not
 * live here. It lives in `guards/read-only.ts`: a default-deny request guard installed on the
 * BROWSER CONTEXT before `injectAuth()` runs (see the `BG-T-3` note below), which inspects every
 * outgoing request regardless of what triggered it — a real user click, a `steps` click, or
 * anything else — and aborts the whole run on any non-GET/HEAD request outside the inert
 * allowlist. That guard is the backstop this pipeline's read-only guarantee actually rests on;
 * a `steps` sequence is trusted only as far as that guard lets its requests through. No `steps`
 * sequence may be authored to submit a result, trigger an assessment, or otherwise write — not
 * because this file refuses to call `.click()`/`.fill()` (it will), but because doing so would
 * fire a non-GET request that `guards/read-only.ts` aborts, failing the whole run.
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
 * BG-T-4 addition (declarative pre-capture `steps`, `design.md` §5 / §3.2, `BG-R-14`,
 * `BG-R-6`, `BG-AC-6`, `BG-AC-14`, `BG-DD-2`): a route may carry an optional `steps: Step[]` —
 * a CLOSED four-variant union (`click`, `waitFor`, `press`, `fill`) run after `goto` and BEFORE
 * `readySelector` is awaited below, so the readiness gate describes the state the steps
 * produced, not the landing page. Every selector-bearing step (`click`, `fill`, and `waitFor`
 * when given a `selector`) is guarded exactly like the existing callout guard above: the RAW
 * `locator.count()` is read (never `.first()`, `.nth(0)`, or a `:nth-of-type` selector — any of
 * those would silently turn a 2-match into a false "1 match" and defeat the guard), and 0 or
 * 2+ matches fails the whole run naming the step's array index, its variant, and the route id.
 * `click`/`fill` do NOT themselves wait for their selector to appear — that is `waitFor`'s job
 * (bounded timeout, its own explicit step), so a config that needs the UI to settle after a
 * `click` inserts a `waitFor` step rather than relying on a hidden implicit wait baked into
 * every action (`BG-DD-2`'s declarative, reviewable-timing rationale). A route whose `steps`
 * fail is a failed route — never a silently different screenshot (`design.md` §5, `BG-AC-14`).
 * `bounds` is also declared on `RouteConfig` by `BG-T-4` (type only); `BG-T-5` below is what
 * actually asserts it.
 *
 * BG-T-5 addition (`guards/frame-bounds.ts`, `design.md` §5 / `BG-DD-6`, `BG-R-8`, `BG-AC-8`):
 * right after each route's screenshot is written, the per-route loop re-runs the EXISTING
 * `countVisibleSkeletons()` primitive once more (not a new skeleton check — the same one
 * `waitForNoVisibleSkeletons()` already uses to gate BEFORE the shot) and hands that count,
 * plus the written PNG's path and the route's optional `bounds`, to `assertFrameBounds()`.
 * That single call is the one place both BG-AC-8 conditions — dimensions in bounds, no visible
 * skeleton — are asserted together, and it reads the PNG's real pixel size FROM THE FILE, never
 * from `route.viewport` (see `guards/frame-bounds.ts`'s header for why trusting the requested
 * viewport is exactly the bug this guard exists to catch: `fullPage: true` is a no-op on an
 * inner-scroll container, so a request of `1280x1800` is what shipped a `1280x720` file in the
 * W1/W2 run). A violation throws and fails the whole run — the identical propagation path
 * every other per-route failure in this loop already uses (`readySelector` timeout, the
 * callout/`steps` unique-selector guard, `waitForNoVisibleSkeletons()` itself) — so a bad frame
 * is a hard failure, never a console warning that lets the run finish green.
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
import { assertFrameBounds } from './guards/frame-bounds';

interface RouteViewport {
  width: number;
  height: number;
}

/**
 * Declarative pre-capture interaction (`BG-T-4`, `design.md` §5). A CLOSED four-variant
 * union — deliberately not an imperative callback (`BG-DD-2`'s rejected alternative: unbounded,
 * unreviewable, invites arbitrary interaction including writes). Every selector-bearing variant
 * (`click`, `fill`, `waitFor` when given `selector`) is guarded to match EXACTLY ONE element at
 * runtime by `runSteps()` below — that guard is not expressible in the type system, only at
 * execution time.
 */
export type Step = ClickStep | WaitForStep | PressStep | FillStep;

/** `click` — selector must resolve to exactly one element; `label` is optional, for logging only. */
interface ClickStep {
  type: 'click';
  selector: string;
  label?: string;
}

/**
 * `waitFor` — EXACTLY ONE of `selector` or `ms` must be set (asserted at runtime by `runSteps()`;
 * TypeScript's structural typing cannot express "exactly one of" without splitting this into two
 * variants, which would defeat the "four-variant union" shape `design.md` §5 specifies). Given
 * `selector`, waits (bounded) for it to appear, then applies the same unique-match guard as
 * `click`/`fill`. Given `ms`, waits that many milliseconds — no selector, no guard.
 */
interface WaitForStep {
  type: 'waitFor';
  selector?: string;
  ms?: number;
}

/** `press` — a keyboard key (e.g. `'Enter'`, `'Escape'`); no selector, so no unique-match guard. */
interface PressStep {
  type: 'press';
  key: string;
}

/**
 * `fill` — selector must resolve to exactly one element. `value` is literal content authored in
 * the route config — NEVER a credential (`design.md` §5, `.cursorrules`).
 */
interface FillStep {
  type: 'fill';
  selector: string;
  value: string;
}

/**
 * Frame-dimension sanity bounds (`BG-DD-6`). Declared here by `BG-T-4` on `RouteConfig`; the
 * assertion that reads a produced PNG's real pixel dimensions and checks them against this shape
 * is `BG-T-5`'s (`guards/frame-bounds.ts`) — this file declares the type and the optional field
 * only, and does not consume it.
 */
interface RouteBounds {
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
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
  /**
   * Declarative pre-capture interactions (`BG-T-4`, `design.md` §5). Runs after `goto` and
   * BEFORE `readySelector` is awaited (`main()`'s loop below, `design.md` §3.2), so the
   * readiness gate describes the state these steps produced rather than the landing page.
   * Optional — omit for routes reachable, and fully rendered, by URL alone.
   */
  steps?: Step[];
  /**
   * Frame-dimension sanity bounds (`BG-DD-6`). Declared by `BG-T-4`; consumed by `BG-T-5`
   * (`guards/frame-bounds.ts`), not by this file.
   */
  bounds?: RouteBounds;
}

const READY_SELECTOR_TIMEOUT_MS = 25_000;
const RAW_DIR = path.resolve(__dirname, '..', 'raw');

const DEFAULT_VIEWPORT: RouteViewport = { width: 1280, height: 720 };
const DEFAULT_FULL_PAGE = true;

/**
 * Matches this app's real loading-placeholder conventions (confirmed by reading the live
 * component source, not guessed): the shared `.pr-skeleton` class (`pr-viz-chart`,
 * `skeleton-notification-item`), the `data-testid="…-skeleton"` naming convention used by ad
 * hoc per-component skeleton blocks (e.g. `program-overview`'s `aow-rows-skeleton`), and — added
 * by `BG-T-9` round 2, per the Reviewer/Leader — the `app-form-skeleton` component element
 * itself. `app-form-skeleton` (`onecgiar-pr-client/src/app/pages/bilateral/components/
 * form-skeleton/form-skeleton.component.ts`) renders its OWN bespoke class set (`.fsk-row`,
 * `.fsk-label`, `.fsk-bar`, `.fsk-pill`, `.fsk-extra`, `.fsk-link`) with zero overlap with either
 * existing convention, so every one of its five usages in the bilateral tree — `section-evidence`
 * (`section-evidence.component.html:16`), `section-general-info` (`:90`), `bilateral-accordion`
 * (`:28`), `section-toc` (`:36`), and `bilateral-result-creator`'s own whole-editor
 * `isLoadingResult()` placeholder (`bilateral-result-creator.component.html:290`, wrapped by an
 * `aria-busy="true"` div with no `data-testid` at all) — was invisible to this guard until now.
 * Matching the ELEMENT (`app-form-skeleton`) rather than enumerating its `.fsk-*` classes is
 * deliberate: a future rename of those classes would silently reopen this exact gap, where the
 * component tag is Angular's own stable public contract for the component.
 * This app does NOT use PrimeNG's `p-skeleton` or a literal `"skeleton"` substring in most of its
 * other loading markup (most of it is bare Tailwind `animate-pulse`, which is too generic/noisy
 * to gate on safely) — this selector targets the conventions that are actually load-bearing for
 * defects found in attempt 1 (the `overview` AoW rows and the `pr-viz-chart` "undefined" axis
 * both render via one of the first two, per
 * `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.component.html`
 * and `src/app/shared/components/pr-viz-chart/pr-viz-chart.component.html`) and for `BG-T-9`'s
 * live `editor-evidence` skeleton-visible capture (caught only by a human viewing the PNG,
 * because this guard did not, until this fix).
 */
const SKELETON_SELECTOR = '.pr-skeleton, [data-testid$="-skeleton"], app-form-skeleton';
const SKELETON_GATE_TIMEOUT_MS = 10_000;
const SKELETON_GATE_POLL_MS = 200;

/** Bounded wait for a `waitFor` step given `selector` (`BG-T-4`). Named the step + route on timeout. */
const STEP_WAIT_FOR_TIMEOUT_MS = 15_000;

/** Thrown (with the route id + selector always named) when a route fails to load or annotate. */
export class RouteCaptureError extends Error {
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

/**
 * Fail-loud unique-selector guard shared by every selector-bearing `Step` variant (`BG-T-4`,
 * `design.md` §5, `BG-R-6`, `BG-AC-6`, `BG-AC-14`). Reads the RAW `locator.count()` — never
 * `.first()`, `.nth(0)`, or a `:nth-of-type` selector anywhere in this resolution path, because
 * any of those would silently turn a 2-match into a false "1 match" and make the guard inert
 * (unable to be reddened by a genuine 2-match — exactly the falsifier `BG-T-4`'s brief calls out).
 * Fails the whole run, naming `label` (which already carries the step's array index and variant,
 * see `runSteps()`), the route id, the selector, and the actual count found.
 */
async function assertUniqueSelector(
  page: Page,
  selector: string,
  routeId: string,
  label: string,
): Promise<void> {
  const count = await page.locator(selector).count();
  if (count !== 1) {
    throw new RouteCaptureError(
      routeId,
      `${label}: selector "${selector}" resolved to ${count} element(s) (expected exactly 1)`,
    );
  }
}

/**
 * Executes a route's declarative `steps` (`BG-T-4`, `design.md` §5 / §3.2, `BG-R-14`, `BG-R-6`,
 * `BG-AC-6`, `BG-AC-14`, `BG-DD-2`). Called by `main()`'s per-route loop strictly AFTER `goto` and
 * BEFORE `readySelector` is awaited — the readiness gate must describe the state these steps
 * produced, not the landing page (`design.md` §3.2).
 *
 * `click` and `fill` do NOT wait for their selector to appear before reading its count — that is
 * deliberate: waiting is `waitFor`'s job, as its own explicit, reviewable step. A route that needs
 * the UI to settle after a `click` (e.g. a drawer animating open, a field revealing itself) must
 * author an explicit `waitFor` step for it; `click`/`fill` silently retrying/waiting on the
 * caller's behalf would reintroduce exactly the hidden-magic-wait behavior `BG-DD-2` rejected in
 * favor of a declarative, diffable sequence.
 *
 * A route whose steps fail is a failed route — never a silently different screenshot: every
 * branch below throws `RouteCaptureError`, which propagates out of `main()`'s per-route iteration
 * exactly like every other capture failure (readySelector timeout, callout guard, skeleton gate).
 */
export async function runSteps(page: Page, routeId: string, steps: Step[]): Promise<void> {
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const label = `step[${index}] (${step.type})`;

    switch (step.type) {
      case 'click': {
        await assertUniqueSelector(page, step.selector, routeId, label);
        await page.locator(step.selector).click();
        break;
      }

      case 'fill': {
        await assertUniqueSelector(page, step.selector, routeId, label);
        await page.locator(step.selector).fill(step.value);
        break;
      }

      case 'press': {
        await page.keyboard.press(step.key);
        break;
      }

      case 'waitFor': {
        const hasSelector = typeof step.selector === 'string' && step.selector.length > 0;
        const hasMs = typeof step.ms === 'number';
        if (hasSelector === hasMs) {
          // Neither given, or both given — "selector or ms" (design.md §5) means exactly one.
          throw new RouteCaptureError(
            routeId,
            `${label}: waitFor must specify exactly one of "selector" or "ms" (got ` +
              `selector=${JSON.stringify(step.selector)}, ms=${JSON.stringify(step.ms)})`,
          );
        }
        if (hasMs) {
          await page.waitForTimeout(step.ms as number);
          break;
        }
        const selector = step.selector as string;
        try {
          await page.waitForSelector(selector, { timeout: STEP_WAIT_FOR_TIMEOUT_MS });
        } catch {
          throw new RouteCaptureError(
            routeId,
            `${label}: selector "${selector}" did not appear within ${STEP_WAIT_FOR_TIMEOUT_MS}ms`,
          );
        }
        // The selector appeared — now apply the same exactly-one-match guard as click/fill,
        // since a `waitFor` step "given a selector" is selector-bearing per BG-T-4's brief.
        await assertUniqueSelector(page, selector, routeId, label);
        break;
      }

      default: {
        // Exhaustiveness check: if a fifth Step variant is ever added without updating this
        // switch, this line fails to compile — `BG-T-4`'s brief is explicit that Step is a
        // CLOSED four-variant union, so a compile-time trip wire here is in scope, not scope
        // creep.
        const exhaustive: never = step;
        throw new RouteCaptureError(routeId, `${label}: unknown step variant ${JSON.stringify(exhaustive)}`);
      }
    }
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

      // BG-T-4: declarative pre-capture steps run AFTER goto and BEFORE readySelector is
      // awaited — design.md §3.2 is explicit that the readiness gate must describe the state
      // the steps produced, not the landing page. A failed step fails the whole route (the
      // RouteCaptureError it throws propagates out of this loop exactly like every other
      // per-route failure below).
      if (route.steps !== undefined) {
        // BG-R-14's fail-loud contract, per Reviewer note: a malformed `"steps"` value (e.g.
        // `{}` from a JSON authoring mistake) must fail the run naming the route, NOT be
        // silently treated as "no steps" — the previous `route.steps && route.steps.length > 0`
        // check did exactly that, because `{}.length` is `undefined`, so `undefined > 0` is
        // `false` and the whole pre-capture-interaction stage was skipped without a word.
        if (!Array.isArray(route.steps) || route.steps.length === 0) {
          throw new RouteCaptureError(
            route.id,
            `route.steps is present but is not a non-empty array (got ${JSON.stringify(route.steps)}) — ` +
              'a malformed "steps" value must fail loudly, not be silently treated as "no steps". ' +
              'Omit "steps" entirely for a route with no pre-capture interactions.',
          );
        }
        console.log(`[capture] ${route.id}: running ${route.steps.length} pre-capture step(s)…`);
        await runSteps(page, route.id, route.steps);
      }

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
      const pngPath = path.join(RAW_DIR, `${route.id}.png`);
      let skeletonCountAtCapture = 0;
      try {
        await annotateCallouts(
          page,
          callouts,
          { ring: orange, chipBg: tokens['--pr-color-secondary-400'] },
          { fullPage },
        );
        await page.screenshot({
          path: pngPath,
          fullPage,
        });
        // BG-T-5: re-run the EXISTING skeleton primitive (not a new check) right at the
        // moment the file was written, closing the gap between waitForNoVisibleSkeletons()'s
        // pre-shot pass above and the screenshot call. Same `!fullPage` clip semantics as
        // that gate (see countVisibleSkeletons()'s own header for why the clip must match).
        skeletonCountAtCapture = await countVisibleSkeletons(page, !fullPage);
      } catch (err) {
        throw new RouteCaptureError(
          route.id,
          `annotate/screenshot failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        await removeAnnotation(page);
      }

      // BG-T-5 (guards/frame-bounds.ts, BG-DD-6, BG-AC-8): the single post-capture checkpoint
      // for BOTH "dimensions in bounds" and "no visible skeleton" — dimensions are read from
      // the WRITTEN PNG on disk, never from `route.viewport` or any pre-flush value. A
      // violation throws and is wrapped in RouteCaptureError so it fails the run through the
      // exact same path as every other per-route failure above.
      try {
        await assertFrameBounds(route.id, pngPath, route.bounds, skeletonCountAtCapture);
      } catch (err) {
        throw new RouteCaptureError(route.id, err instanceof Error ? err.message : String(err));
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

if (require.main === module) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
