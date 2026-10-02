/// <reference types="cypress" />

/**
 * ICM-T-1 — reusable stacking-probe geometry helpers.
 *
 * Extracted from `cypress/e2e/ipsr/ipsr-modal-stacking.cy.ts` (REWORK attempt 3,
 * `docs/specs/bugfix/ipsr-complementary-innovation-modal-overlap/execution-reviews/icm-t1-a2.md`
 * "Required unauthenticated self-check" clause) so the SAME probe/centering/viewport-guard code
 * can drive both the real IPSR spec and any ad hoc synthetic-harness check against the same
 * markup, without duplicating the probe logic. This module is a kept deliverable, not scratch.
 *
 * Nothing here is IPSR-route-specific: no login, no result code, no step URLs. Those stay in the
 * real spec.
 */

export const SIDEBAR = 'hlm-sidebar';
export const SIDEBAR_CONTAINER = '[data-slot="sidebar-container"]'; // painted fixed box (hlm-sidebar.ts:47,81)
export const HEADER = '.app-shell-header';
export const DIALOG_CLOSE = '.pr-dialog__close';
export const DIALOG_HEADER = '.pr-dialog__header'; // probe (b)'s "top row" when the panel renders one
export const DIALOG_MASK = '.pr-dialog-mask';
export const SECTION_CONTAINER = '.section_container'; // design §13 — retained-fade stacking-context trap

export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Point {
  x: number;
  y: number;
}

export function toRect(domRect: DOMRect): Rect {
  return { left: domRect.left, right: domRect.right, top: domRect.top, bottom: domRect.bottom };
}

/** Center point of the intersection of two rects, or `null` when they do not overlap. */
export function intersectionCenter(a: Rect, b: Rect): Point | null {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  if (left >= right || top >= bottom) return null;
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

export function pointInsideRect(p: Point, r: Rect): boolean {
  return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
}

/**
 * Reliability guard (design §13, `execution-reviews/icm-t1-a1.md` advisory): `.section_container`
 * keeps animating for a while after it mounts, and the stacking-context trap this suite probes for
 * still applies while it runs. Probing mid-animation can go red for the wrong reason, so wait for
 * every `.section_container` currently in the DOM to report its animations finished (an empty list
 * counts as finished) before reading any rect. Cypress `.should(fn)` retries the callback until it
 * stops throwing or the command times out, which is the wait.
 */
export function waitForSectionContainerAnimations(): void {
  // Precondition guard (advisory, `execution-reviews/icm-t1-a2.md`): a bare `cy.get(SECTION_CONTAINER)`
  // with zero matches would retry for the full timeout and fail with Cypress's generic "never found
  // it" message. Fail fast with an explicit precondition message instead, so this is never confused
  // with a stacking-probe red.
  cy.get('body').then($body => {
    if ($body.find(SECTION_CONTAINER).length === 0) {
      throw new Error(`PRECONDITION: no ${SECTION_CONTAINER} found in the DOM — cannot wait for its fade animation to finish`);
    }
  });

  cy.get(SECTION_CONTAINER).should($els => {
    $els.toArray().forEach(el => {
      const animations = el.getAnimations();
      const allFinished = animations.length === 0 || animations.every(a => a.playState === 'finished');
      expect(allFinished, `${SECTION_CONTAINER} animations must be finished before probing`).to.equal(true);
    });
  });
}

/**
 * Precondition (required fix, `execution-reviews/icm-t1-a2.md` item 1 remediation #2): assert the
 * viewport `cy.viewport()` requested actually took effect, BEFORE any geometry read. Same pattern as
 * `src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.cy.ts:412`. The Leader
 * confirmed by running Cypress that `Cypress.config('viewportWidth'|'viewportHeight')` stays pinned
 * to the configured default (1280×720, `cypress.config.js`) after `cy.viewport()` — only
 * `window.innerWidth`/`innerHeight` reflect the requested size. A mismatch here fails loudly as a
 * named precondition instead of silently invalidating every geometry assertion downstream.
 */
export function assertViewport(width: number, height: number): void {
  cy.window({ log: false }).should(win => {
    expect(win.innerWidth, `PRECONDITION cy.viewport(${width}, ${height}): window.innerWidth`).to.eq(width);
    expect(win.innerHeight, `PRECONDITION cy.viewport(${width}, ${height}): window.innerHeight`).to.eq(height);
  });
}

export interface ProbeDialogStackingOptions {
  expectClose: boolean;
}

/**
 * Runs the ICM-R-1/R-3 topmost-element probes + centering check against an already-open dialog
 * panel. Generic over ANY `.pr-dialog` panel so the same function drives Step 2.1, the Step 4
 * sibling (`ICM-AC-6`), and any ad hoc synthetic-harness check against the same markup.
 *
 * Preconditions, both asserted before any probe runs:
 *   - the panel itself must be `be.visible` — its center (x ≈ 550–720) is never under the sidebar
 *     or header at any viewport/state this suite exercises, so this cannot time out for the reason
 *     the bug causes.
 *   - the `×` (when `expectClose`) is checked for existence + layout
 *     (`getClientRects().length > 0`), NOT `be.visible`. Cypress's `be.visible` on a
 *     `position: fixed` descendant (`.pr-dialog-mask` → `.pr-dialog`) fails when something else is
 *     painted on top of it at its own coordinates — and the R-2 defect under test IS the sidebar or
 *     header covering the `×`. A `be.visible` precondition on the `×` would retry for the full
 *     timeout and fail there on exactly the bug state this suite exists to catch. Probe (c) below —
 *     not this precondition — is the assertion that is allowed to fail on a covered `×`.
 *
 * `expectClose: false` skips probe (c) when the panel has no `.pr-dialog__close` at all
 * (`[showHeader]="false"`, every Step 4 "Add ..." modal in the real spec).
 *
 * Geometry is not guaranteed to overlap at every viewport/sidebar-state combination, so probes (a)
 * and (b) treat an empty intersection as `n/a` — logged, never asserted pass or fail
 * (`execution-reviews/icm-t1-a1.md` item 1). To guard against a case going green resting on probe
 * (d) and centering alone, the function tracks whether ANY of (a), (b), (c) was actually evaluated
 * and fails the case as INCONCLUSIVE if none was.
 */
export function probeDialogStacking(panelSelector: string, opts: ProbeDialogStackingOptions): void {
  cy.get(panelSelector).should('be.visible');
  if (opts.expectClose) {
    cy.get(`${panelSelector} ${DIALOG_CLOSE}`).should($c => {
      expect($c.length, 'PRECONDITION: × rendered').to.eq(1);
      expect($c[0].getClientRects().length, 'PRECONDITION: × laid out').to.be.gt(0);
    });
  }

  waitForSectionContainerAnimations();

  const evaluated = { a: false, b: false, c: false };

  cy.get(SIDEBAR).then($sidebar => {
    const sidebarHost = $sidebar[0];
    // Painted fixed box (hlm-sidebar.ts:47,81), not the in-flow host — the two rects only match
    // while the page is unscrolled. Fall back to the host when the slot is absent.
    const sidebarContainerEl = sidebarHost.querySelector(SIDEBAR_CONTAINER) as HTMLElement | null;
    const sidebarRect = toRect((sidebarContainerEl ?? sidebarHost).getBoundingClientRect());

    cy.get(HEADER).then($header => {
      const headerRect = toRect($header[0].getBoundingClientRect());

      cy.get(panelSelector).then($panel => {
        const panel = $panel[0];
        const panelRect = toRect(panel.getBoundingClientRect());

        cy.document().then(doc => {
          // Probe (a): a panel point that also lies inside the sidebar's rect. Empty intersection
          // is n/a.
          const pointA = intersectionCenter(panelRect, sidebarRect);
          if (!pointA) {
            cy.log('probe (a): n/a — no overlap');
          } else {
            evaluated.a = true;
            const elA = doc.elementFromPoint(pointA.x, pointA.y);
            expect(!!elA && panel.contains(elA), 'probe (a): topmost element at panel∩sidebar must be inside the panel').to.equal(true);
          }

          // Probe (b): the panel's top row, where the × lives, inside the header's rect. The "top
          // row" is the `.pr-dialog__header` rect when the panel renders one; otherwise fall back
          // to the whole panel rect (panel∩header) — no hard-coded pixel height.
          const headerRowEl = panel.querySelector(DIALOG_HEADER) as HTMLElement | null;
          const panelTopRow: Rect = headerRowEl ? toRect(headerRowEl.getBoundingClientRect()) : panelRect;
          const pointB = intersectionCenter(panelTopRow, headerRect);
          if (!pointB) {
            cy.log('probe (b): n/a — no overlap');
          } else {
            evaluated.b = true;
            const elB = doc.elementFromPoint(pointB.x, pointB.y);
            expect(!!elB && panel.contains(elB), 'probe (b): topmost element at panel-top-row∩header must be inside the panel').to.equal(true);
          }

          // Probe (d): a sidebar point OUTSIDE the panel must resolve to the mask — proves the mask
          // dims the chrome (ICM-R-1 "mask dims the sidebar and the header too").
          const outsidePoint: Point = { x: sidebarRect.left + 4, y: sidebarRect.top + 4 };
          if (pointInsideRect(outsidePoint, panelRect)) {
            cy.log('probe (d): n/a — the panel fully covers this sidebar corner at this viewport/state, no outside point exists');
          } else {
            const elD = doc.elementFromPoint(outsidePoint.x, outsidePoint.y);
            expect(!!elD && !!elD.closest(DIALOG_MASK), 'probe (d): a sidebar point outside the panel must resolve to the mask').to.equal(true);
          }
        });
      });
    });
  });

  // Probe (c): the × center must be the topmost element there.
  if (opts.expectClose) {
    cy.get(`${panelSelector} ${DIALOG_CLOSE}`).then($close => {
      const closeEl = $close[0];
      const r = closeEl.getBoundingClientRect();
      const point: Point = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      cy.document().then(doc => {
        evaluated.c = true;
        const el = doc.elementFromPoint(point.x, point.y);
        expect(!!el && (el === closeEl || closeEl.contains(el)), 'probe (c): topmost element at the × center must be the × or its icon').to.equal(
          true
        );
      });
    });
  } else {
    cy.log('probe (c): n/a for this panel — [showHeader]="false", no .pr-dialog__close in the DOM');
  }

  // ICM-R-3 / AC-3: centered within 2 CSS px. Asserted AFTER probes (a)-(d) (required fix,
  // `execution-reviews/icm-t1-a2.md` item 1 remediation #3) so a red on today's code is always
  // attributed to a stacking probe, never to centering. Measured against the `.pr-dialog-mask` rect
  // — what the mask's flex actually centers the panel in — rather than `Cypress.config('viewportWidth')`,
  // which is the configured default (1280) and does NOT track `cy.viewport()` (remediation #1); this
  // is also safe if a scrollbar gutter narrows the mask versus `window.innerWidth`.
  cy.get(DIALOG_MASK).then($mask => {
    const maskRect = toRect($mask[0].getBoundingClientRect());
    cy.get(panelSelector).then($panel => {
      const panelRect = toRect($panel[0].getBoundingClientRect());
      const leftGap = panelRect.left - maskRect.left;
      const rightGap = maskRect.right - panelRect.right;
      expect(Math.abs(leftGap - rightGap), 'panel centering: |left gap - right gap| must be <= 2px').to.be.lte(2);
    });
  });

  // Guard: a case cannot go green resting on probe (d) and centering alone — if none of (a), (b),
  // (c) was evaluated, the case is INCONCLUSIVE (execution-reviews/icm-t1-a1.md item 2).
  cy.then(() => {
    if (!evaluated.a && !evaluated.b && !evaluated.c) {
      throw new Error('INCONCLUSIVE: no stacking probe evaluated');
    }
  });
}
