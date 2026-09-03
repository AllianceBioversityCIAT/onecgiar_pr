import { ReportingAowTableComponent, ReportingAowGroup, ReportingIndicator } from './reporting-aow-table.component';

/**
 * RTA-T-2 — Cypress COMPONENT regression test for row-action reachability at constrained widths.
 *
 * ⚠️ AMENDED 2026-09-02 for the RTA-DD-2 sticky pivot (see `tasks.md` → RTA-T-2 "REOPENED",
 * `design.md` §10 "AMENDED assertions", `requirements.md` RTA-R-1 tightened wording).
 *
 * WHY `be.visible` IS BANNED AS THE REACHABILITY GATE IN THIS FILE (the whole reason this
 * amendment exists): two diagnostic runs proved `cy.get(...).should('be.visible')` returns
 * **true** on an element that was ~76% clipped by an ancestor's `overflow`. Cypress's visibility
 * heuristic checks opacity / `display` / detachment / basic occlusion — it does NOT check
 * clip-region containment. The pre-pivot suite passed 10/10 while the popover was badly clipped.
 * So every reachability assertion below compares real `getBoundingClientRect()` geometry against
 * the scroller's visible x-bounds instead — geometry cannot lie about clip containment the way
 * `be.visible` can.
 *
 * Harness (amended 2026-09-01, unchanged by this pivot — see design.md §10 "Superseded"): Cypress
 * component testing, not E2E. `cypress.env.js` is absent by default in this repo, so an E2E spec
 * would skip rather than assert (`hasCredentials`/`hasToken` false) — a skip is not evidence. CT
 * mounts the component in a REAL browser with real CSS Grid track sizing, real `overflow` clipping,
 * real `position: sticky` and real scroll geometry, which jsdom (the Jest harness) cannot compute.
 *
 * What this proves now (design.md §10 AMENDED, requirements.md RTA-R-1 tightened / RTA-R-2 /
 * RTA-R-4 / RTA-AC-1 / RTA-AC-3 / RTA-AC-4):
 *   1. UNCHANGED — the HLO-level scroller (`.pr-collapse--rows > .pr-collapse-inner`) is live
 *      (`scrollWidth > clientWidth`) once the container narrows below the row's ~1048px min-width.
 *      The DATA COLUMNS still need somewhere to overflow to — only the actions stop travelling.
 *   2. INVERTED (the core change). At scroll offset 0, with NO scrolling performed, `[aria-label=
 *      "More actions"]`, the Report/Continue button, and the Copy-link icon must already be
 *      reachable — their `getBoundingClientRect()` must lie inside the scroller's visible x-bounds
 *      — and clickable. Then the data columns are scrolled right, and all three must STILL be
 *      reachable at the new offset. A test that scrolls first (the pre-pivot version) would no
 *      longer prove RTA-R-1's tightened wording ("continuously visible without any scrolling").
 *   3. UNCHANGED — the negative constraint (RTA-AC-3): at a wide container (>=1440px) there is no
 *      scrollbar — `scrollWidth === clientWidth`.
 *   4. STRENGTHENED — `.pr-hlo-head` and `.pr-reporting-row` share one scroll container (same
 *      `offsetParent`), AND their pinned cells hold a common right edge (`getBoundingClientRect()
 *      .right`) both before and after the data columns scroll — that shared offset is what sticky
 *      guarantees for RTA-R-2.
 *   5. NEW — the pinned cells (`.pr-pin-actions` / `.pr-pin-menu` / `.pr-hlo-pin-actions` /
 *      `.pr-hlo-pin-menu`) have a non-transparent computed `background-color` by default, and a
 *      declared non-transparent `background-color` in the row's `:hover` CSS rule (RTA-R-4). See
 *      `assertHoverRuleSetsOpaqueBackground`'s docstring for why the `:hover` half of this is
 *      CSSOM inspection, not a rendered computed style — it is explicitly WEAK evidence per
 *      `design.md` §10 gap 1b and does NOT prove visual opacity. The human-eye check stays owed.
 *
 * Explicitly NOT asserted (accepted gaps — design.md §10, requirements.md §7):
 *   - Pixel-perfect alignment between `.pr-hlo-head` and the scrolled rows — a human visual check
 *     substitutes. Only the pinned cells' shared right edge is asserted (assertion 4 above).
 *   - RTA-GAP-CT: this harness constrains the component's CONTAINER directly. It does not mount the
 *     real page shell or the ~280px reporting nav sidebar, so it does NOT prove that a 1350px
 *     browser VIEWPORT with the sidebar visible actually yields a sub-1048px container in
 *     production. That mapping remains an outstanding MANUAL visual check, not covered here.
 *   - RTA-R-4 gap 1b: see assertion 5 above — a declared CSS rule is not a rendered pixel.
 *   - The `.pr-row-menu` popover's UNCLIPPED rendering — see the `it.skip` at the bottom of this
 *     file. This suite may assert the menu EXISTS in the DOM after a click (the component's own,
 *     working behaviour) but must never assert it is unclipped.
 *   - The card-collapse (AoW open/close) animation — this spec mounts with `expandAll: true`, so
 *     the 280ms transition never plays. Reserved for a human at a browser; not built here.
 *
 * Cypress here is local-only (no GitHub Actions workflow — onecgiar-pr-client/CLAUDE.md §9): this
 * spec is real evidence for a developer/reviewer running it locally, not a CI gate.
 *
 * ⚠️ Container-width mapping (verified empirically while writing the ORIGINAL version of this spec,
 * confirms RTA-GAP-CT): the CT harness has no page shell and no ~280px reporting nav sidebar, so
 * setting the wrapping div's width to the LITERAL viewport number (e.g. 1350px) does NOT reproduce
 * the bug — at a bare 1350px container the row's ~1048px min-width fits with room to spare
 * (measured: clientWidth 1348px, no overflow at all). That is exactly what design.md §10 / RTA-GAP-CT
 * already say: "the 1350px figure was a symptom of one user's sidebar+viewport combination, not a
 * value to hardcode ... CT tests the real trigger [a container below ~1048px] rather than the
 * incidental symptom." So the three widths below are chosen BELOW the 1048px threshold and labelled
 * by which viewport tier they stand in for — they are not literal viewport pixel values, and this
 * spec does not (and per RTA-GAP-CT cannot) prove what container width a real 1350/1024/768px
 * viewport with the sidebar actually yields. That mapping stays an outstanding manual visual check.
 */
const CONTAINER_WIDTHS: ReadonlyArray<{ label: string; container: number }> = [
  { label: '~1350px viewport', container: 1000 },
  { label: '~1024px viewport', container: 820 },
  { label: '~768px viewport (tablet floor)', container: 620 }
];
describe('ReportingAowTableComponent — row-action reachability at constrained widths (CT)', () => {
  // Same fixture shape as `reporting-aow-table.component.spec.ts`'s `row()` / `group()` helpers —
  // reused deliberately, not reinvented.
  const row = (over: Partial<ReportingIndicator> = {}): ReportingIndicator => ({
    indicator_id: 1,
    indicator_description: 'Number of knowledge products published and quality-assured',
    target_value_sum: '3',
    actual_achieved_value_sum: 1,
    progress_percentage: 33,
    unit_messurament: 'Number',
    result_type_name: 'Knowledge product',
    __hlo: 'HLO4.AOW1.IO1 Foster motivations',
    __tier: 'output',
    __aowCode: 'AOW01',
    ...over
  });

  // One AoW group with a single HLO sub-group holding one row — the smallest fixture that exposes
  // the `.pr-collapse--rows` scroller, `.pr-hlo-head`, and one `.pr-reporting-row`. Target 3 /
  // achieved 1 puts the row in `in-progress`, so BOTH the Report/Continue button ("Continue") and
  // the Copy-link icon render for this fixture (AOW01 is not in the copy-link-unsupported set) —
  // exercising all three pinned controls this suite asserts on.
  const fixtureGroups = (): ReportingAowGroup[] => [
    {
      aow: { id: 1, code: 'AOW01', name: 'Market Intelligence', progress: 38 },
      indicators: [row()],
      count: 1,
      loading: false
    }
  ];

  // Wrapping div is the "container" under test — its pixel width stands in for the available width
  // a real reporting-nav-sidebar + viewport combination would leave the card (RTA-GAP-CT: this is
  // the component's CONTAINER, not the browser's VIEWPORT — see the file-level note above).
  const TEMPLATE = `
    <div [style.width.px]="containerWidth">
      <app-reporting-aow-table [groups]="groups" [expandAll]="true" [canReport]="true"></app-reporting-aow-table>
    </div>
  `;

  const SEL_HLO_COLLAPSE = '.pr-collapse--rows';
  const SEL_SCROLLER = `${SEL_HLO_COLLAPSE} > .pr-collapse-inner`;
  const SEL_HLO_HEAD = '.pr-hlo-head';
  const SEL_ROW = '.pr-reporting-row';
  const SEL_MORE_ACTIONS = `${SEL_ROW} [aria-label="More actions"]`;
  const SEL_REPORT_BUTTON = `${SEL_ROW} .pr-pin-actions .pr-row-action`;
  const SEL_COPY_LINK = `${SEL_ROW} [aria-label="Copy link to this KPI"]`;
  const SEL_PIN_ACTIONS = `${SEL_ROW} .pr-pin-actions`;
  const SEL_PIN_MENU = `${SEL_ROW} .pr-pin-menu`;
  const SEL_HLO_PIN_ACTIONS = `${SEL_HLO_HEAD} .pr-hlo-pin-actions`;
  const SEL_HLO_PIN_MENU = `${SEL_HLO_HEAD} .pr-hlo-pin-menu`;

  const mountAt = (containerWidth: number) =>
    cy.mount(TEMPLATE, {
      imports: [ReportingAowTableComponent],
      componentProperties: { containerWidth, groups: fixtureGroups() }
    });

  /**
   * No-pass clause (tasks.md RTA-T-2): a measurement taken while the 280ms grid-template-rows
   * collapse animation is still resolving is indistinguishable from "the control has a zero
   * bounding box" — both would read as "not reachable" for the wrong reason. `expandAll` is set at
   * MOUNT time here (not toggled afterwards), so no transition should actually play, but this wait
   * is an explicit assertion on settled STATE (`.is-open` + `aria-hidden="false"` + a real rendered
   * height on the inner), not an arbitrary `cy.wait(ms)` — Cypress retries it until it's true.
   */
  const waitForSettledOpen = () => {
    cy.get(SEL_HLO_COLLAPSE)
      .should('have.class', 'is-open')
      .should('have.attr', 'aria-hidden', 'false')
      .should($collapse => {
        const inner = $collapse[0].querySelector('.pr-collapse-inner') as HTMLElement | null;
        expect(inner, 'HLO collapse-inner must be present').to.not.be.null;
        expect(inner!.clientHeight, 'HLO collapse must have a settled, non-zero rendered height before scroll geometry is measured').to.be.greaterThan(0);
      });
  };

  /**
   * The core reachability gate for this whole suite. Deliberately NOT `should('be.visible')` — see
   * the file-level docstring for the diagnostic finding that made that heuristic untrustworthy here.
   * Instead: real rendered size (not a zero-size/off-canvas box) AND both edges of the element's
   * `getBoundingClientRect()` inside the scroller's own visible x-bounds (its own bounding rect,
   * which corresponds to its visible/clipped viewport, not its scrollable content).
   */
  const assertPinnedReachable = (selector: string, label: string) => {
    cy.get(SEL_SCROLLER).then($scroller => {
      const scrollerRect = $scroller[0].getBoundingClientRect();
      cy.get(selector).should($el => {
        const rect = $el[0].getBoundingClientRect();
        expect(rect.width, `${label}: must have a real rendered width (not zero-size / off-canvas)`).to.be.greaterThan(0);
        expect(rect.height, `${label}: must have a real rendered height (not zero-size / off-canvas)`).to.be.greaterThan(0);
        expect(rect.left, `${label}: left edge must lie within the scroller's visible x-bounds`).to.be.at.least(scrollerRect.left - 1);
        expect(rect.right, `${label}: right edge must lie within the scroller's visible x-bounds`).to.be.at.most(scrollerRect.right + 1);
      });
    });
  };

  /** RTA-R-2 under sticky: the header's pinned cell and the row's pinned cell must share a right edge. */
  const assertPinnedRightEdgesAligned = () => {
    cy.get(SEL_HLO_PIN_MENU).then($hloMenu => {
      cy.get(SEL_PIN_MENU).then($rowMenu => {
        const hloRight = $hloMenu[0].getBoundingClientRect().right;
        const rowRight = $rowMenu[0].getBoundingClientRect().right;
        expect(Math.abs(hloRight - rowRight), 'header "···" pinned cell and row "···" pinned cell must share a right edge').to.be.lessThan(1.5);
      });
    });
    cy.get(SEL_HLO_PIN_ACTIONS).then($hloActions => {
      cy.get(SEL_PIN_ACTIONS).then($rowActions => {
        const hloRight = $hloActions[0].getBoundingClientRect().right;
        const rowRight = $rowActions[0].getBoundingClientRect().right;
        expect(Math.abs(hloRight - rowRight), 'header action pinned cell and row action pinned cell must share a right edge').to.be.lessThan(1.5);
      });
    });
  };

  /** RTA-R-4 default state — a genuine computed style, real evidence (not the `:hover` half). */
  const assertOpaqueBackground = (selector: string, label: string) => {
    cy.get(selector).should($el => {
      const bg = getComputedStyle($el[0]).backgroundColor;
      expect(bg, `${label}: computed background-color must be set`).to.not.be.empty;
      expect(bg, `${label}: computed background-color must be non-transparent`).to.not.equal('transparent');
      expect(bg, `${label}: computed background-color must be non-transparent`).to.not.match(/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/);
    });
  };

  /**
   * ⚠️ WEAK, per design.md §10 gap 1b — and weaker still than a plain computed-style check. Cypress
   * core has no way to move the OS-level pointer without the `cypress-real-events` plugin (not
   * installed in this repo, and this task may only touch this `.cy.ts` file) — a JS-dispatched
   * `mouseover`/`mouseenter` event does NOT set the browser's internal `:hover` pointer-tracking
   * state, so `getComputedStyle()` on a `.trigger('mouseover')`'d element never actually reflects a
   * `:hover` rule. So this does NOT trigger a real hover at all — it inspects the loaded CSSOM
   * directly, finds the actual `.pr-reporting-row:hover ...`-shaped rule for the given selector
   * fragment, and asserts its DECLARED `background-color` is non-transparent. That proves the rule
   * exists and declares *some* opaque color. It proves nothing about what renders on screen: not a
   * z-index mistake, not a gap between the two pinned cells, not whether the color is actually
   * opaque in a real paint. The human-eye check of a scrolled, hovered row stays owed regardless of
   * this assertion passing.
   */
  const findHoverBackground = (rules: CSSRuleList, selectorFragment: string): string | null => {
    for (const rule of Array.from(rules)) {
      // Grouping rules (@media, @supports, …) nest their own cssRules — recurse into them, since
      // Angular's build can wrap emitted component styles in a `@media` layer.
      const grouping = rule as unknown as { cssRules?: CSSRuleList };
      if (grouping.cssRules) {
        const nested = findHoverBackground(grouping.cssRules, selectorFragment);
        if (nested) return nested;
      }
      const styleRule = rule as CSSStyleRule;
      const declaredBackground = styleRule.style?.backgroundColor || styleRule.style?.background;
      if (styleRule.selectorText && styleRule.selectorText.includes(selectorFragment) && styleRule.selectorText.includes(':hover') && declaredBackground) {
        return declaredBackground;
      }
    }
    return null;
  };

  const assertHoverRuleSetsOpaqueBackground = (selectorFragment: string, label: string) => {
    cy.document().should(doc => {
      let found: string | null = null;

      // Angular's newer style strategy can adopt component/global stylesheets directly via
      // `document.adoptedStyleSheets` (Constructable Stylesheets) instead of appending `<style>`
      // elements — those are invisible to `document.styleSheets`, so both are checked here.
      const adopted = (doc as Document & { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets ?? [];
      for (const sheet of adopted) {
        found = findHoverBackground(sheet.cssRules, selectorFragment);
        if (found) break;
      }

      if (!found) {
        for (const sheet of Array.from(doc.styleSheets)) {
          let rules: CSSRuleList | undefined;
          try {
            rules = sheet.cssRules;
          } catch {
            continue; // cross-origin stylesheet — not reachable, not relevant here
          }
          if (!rules) continue;
          found = findHoverBackground(rules, selectorFragment);
          if (found) break;
        }
      }

      expect(found, `${label}: a ':hover' CSS rule targeting "${selectorFragment}" with a declared background-color must exist`).to.not.be.null;
      expect(found, `${label}: its declared background-color must be non-transparent`).to.not.equal('transparent');
      expect(found, `${label}: its declared background-color must be non-transparent`).to.not.match(/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/);
    });
  };

  beforeEach(() => {
    // Neutral viewport, wider than every container width used below — the AUT's own viewport must
    // never be the thing constraining layout here, only the wrapping div's explicit pixel width.
    cy.viewport(1600, 900);
  });

  // ── 1. Scroller is live below the row's ~1048px min-width (RTA-R-1) — UNCHANGED by the pivot ──
  CONTAINER_WIDTHS.forEach(({ label, container }) => {
    it(`HLO scroller has real overflow at a container standing in for ${label} (${container}px)`, () => {
      mountAt(container);
      waitForSettledOpen();
      cy.get(SEL_SCROLLER).should($el => {
        const el = $el[0];
        expect(el.scrollWidth, 'scrollWidth').to.be.greaterThan(el.clientWidth);
      });
    });
  });

  // ── 2. INVERTED by the pivot: reachable at offset 0 WITHOUT scrolling, and still reachable ────
  //    after the data columns scroll (RTA-R-1 tightened, RTA-AC-1). Geometry, never `be.visible`.
  CONTAINER_WIDTHS.forEach(({ label, container }) => {
    it(`"More actions", Report/Continue and Copy-link are reachable at scroll offset 0 (no scrolling), and stay reachable after scrolling, at a container standing in for ${label} (${container}px)`, () => {
      mountAt(container);
      waitForSettledOpen();

      // Offset 0, NO scrolling performed yet — this is the core inversion. Pre-fix (no sticky) this
      // is exactly where the suite goes RED: the pinned controls sit at their natural (off-canvas)
      // grid position and their rect falls outside the scroller's visible x-bounds.
      cy.get(SEL_SCROLLER).should($el => expect($el[0].scrollLeft, 'scroller must start at offset 0').to.equal(0));

      assertPinnedReachable(SEL_MORE_ACTIONS, '"More actions" button (offset 0)');
      assertPinnedReachable(SEL_REPORT_BUTTON, 'Report/Continue button (offset 0)');
      assertPinnedReachable(SEL_COPY_LINK, 'Copy-link icon (offset 0)');

      // Now scroll the DATA columns — sticky must keep all three reachable at the new offset too.
      cy.get(SEL_SCROLLER).scrollTo('right');
      cy.get(SEL_SCROLLER).should($el => expect($el[0].scrollLeft, 'scroller must have actually scrolled').to.be.greaterThan(0));

      assertPinnedReachable(SEL_MORE_ACTIONS, '"More actions" button (scrolled)');
      assertPinnedReachable(SEL_REPORT_BUTTON, 'Report/Continue button (scrolled)');
      assertPinnedReachable(SEL_COPY_LINK, 'Copy-link icon (scrolled)');

      // Clickability — a real interaction, not the `be.visible` heuristic banned above.
      cy.get(SEL_COPY_LINK).click();
      cy.get(SEL_REPORT_BUTTON).click();
      cy.get(SEL_MORE_ACTIONS).click();

      // The row menu popover EXISTING in the DOM is this component's own, working behaviour —
      // assert only that. Its UNCLIPPED rendering is a separate, pre-existing production defect
      // (see the `it.skip` at the bottom of this file) and must never be asserted here.
      cy.get('[role="menu"]').should('exist');
    });
  });

  // ── 3. Negative constraint: no scrollbar at a wide container (RTA-AC-3) — UNCHANGED ──────────
  it('shows no scrollbar at a wide (>=1440px) container', () => {
    mountAt(1500);
    waitForSettledOpen();
    cy.get(SEL_SCROLLER).should($el => {
      const el = $el[0];
      expect(el.scrollWidth, 'scrollWidth must equal clientWidth — no overflow above the breakpoint').to.equal(el.clientWidth);
    });
  });

  // ── 4. STRENGTHENED: header/row share one scroll container AND their pinned cells hold a ─────
  //    common right edge, before and after scrolling (RTA-R-2 under sticky).
  CONTAINER_WIDTHS.forEach(({ label, container }) => {
    it(`.pr-hlo-head and .pr-reporting-row share one scroll container and hold a common pinned offset at a container standing in for ${label} (${container}px)`, () => {
      mountAt(container);
      waitForSettledOpen();

      cy.get(SEL_HLO_HEAD).then($head => {
        cy.get(SEL_ROW).then($row => {
          expect($row[0].offsetParent, 'row and header must share the same offsetParent').to.equal($head[0].offsetParent);
        });
      });

      assertPinnedRightEdgesAligned(); // at offset 0

      cy.get(SEL_SCROLLER).scrollTo('right');

      assertPinnedRightEdgesAligned(); // still aligned after scroll — this is what sticky guarantees
    });
  });

  // ── 5. NEW: pinned cells are opaque by default, and declare an opaque `:hover` rule (RTA-R-4) ──
  //    Weak evidence per design.md §10 gap 1b — see the helpers' docstrings above.
  CONTAINER_WIDTHS.forEach(({ label, container }) => {
    it(`pinned cells have a non-transparent background by default, and a declared non-transparent :hover rule, at a container standing in for ${label} (${container}px)`, () => {
      mountAt(container);
      waitForSettledOpen();
      cy.get(SEL_SCROLLER).scrollTo('right');

      assertOpaqueBackground(SEL_PIN_ACTIONS, 'row action cell (default)');
      assertOpaqueBackground(SEL_PIN_MENU, 'row menu cell (default)');
      assertOpaqueBackground(SEL_HLO_PIN_ACTIONS, 'header action cell (default)');
      assertOpaqueBackground(SEL_HLO_PIN_MENU, 'header menu cell (default)');

      assertHoverRuleSetsOpaqueBackground('.pr-pin-actions', 'row action cell (:hover)');
      assertHoverRuleSetsOpaqueBackground('.pr-pin-menu', 'row menu cell (:hover)');
    });
  });

  // ── SKIPPED — pre-existing production defect, NOT introduced or fixed by this spec ────────────
  // `.pr-row-menu` is `position: absolute` inside `.pr-collapse--rows > .pr-collapse-inner`, whose
  // load-bearing `overflow-y: hidden` (RTA-DD-1, kept for the card-collapse animation) clips it —
  // measured at ~120px of overflow BOTH with and without the RTA-DD-2 sticky change, so this is
  // not caused by this spec and sticky does not fix it. A real fix needs a CDK Overlay/portal so
  // the menu escapes this ancestor's clip entirely. Tracked as a follow-up in
  // `docs/specs/bugfix/reporting-table-actions-clipped/execution.md` → "FOLLOW-UP DEFECT" — NOT
  // fixed here. Left skipped rather than deleted, so the known bug stays VISIBLE in the suite
  // instead of silently absent. Do NOT convert this to a passing test, and do NOT assert the menu
  // is unclipped anywhere else in this file (test #2 above deliberately asserts only
  // `.should('exist')` on `[role="menu"]`, never its geometry).
  it.skip('the row overflow menu renders unclipped when opened', () => {
    // Intentionally not implemented — see the comment above. If this is ever un-skipped, it must
    // assert real geometry (the menu's rect fully inside an ancestor that does NOT clip it), and
    // must not use `be.visible` as that proof, per the file-level docstring.
  });
});
