import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * TIP-T-4 (`docs/specs/changes/tooltip-keyboard-accessibility/`) — real-browser assertions that
 * jsdom cannot make (`design.md` §10, rows 3-4): focus order into a pinned tooltip's content
 * (`TIP-AC-5`), the vertical viewport clamp (`TIP-AC-7`), and reposition on scroll/resize
 * (`TIP-AC-8`). `pr-tooltip.directive.spec.ts` (Jest, `TIP-T-3`) already covers the open/close
 * state machine and the clamp FORMULA against a mocked `getBoundingClientRect` — this file proves
 * the same behavior under REAL layout and REAL keyboard input, which jsdom cannot provide.
 *
 * Focus-order note: Cypress core has no built-in Tab-key support, and a synthetic
 * `.trigger('keydown', { key: 'Tab' })` does not move focus at all — browsers only honor
 * Tab-driven focus movement from a genuine input event (confirmed by this codebase's own
 * `pr-field-header.contract.cy.ts` note on why an Escape assertion was dropped there for the same
 * reason). This file uses `cypress-real-events`'s `cy.realPress()` instead, which dispatches
 * through Chrome DevTools Protocol `Input.dispatchKeyEvent` — a real input event indistinguishable
 * from a person pressing the key, and the only way in this repo's Cypress setup to make a
 * falsifiable claim about Tab order.
 *
 * Test-bed choice: `app-pr-field-header`'s `button.sgi-dac-info` trigger (already Cypress-CT
 * covered, per `onecgiar-pr-client/CLAUDE.md` §9) for `TIP-AC-5` — the open/pin/focus-trap
 * mechanics under test are identical regardless of host element type. The vertical-clamp and
 * reposition tests (`TIP-AC-7`/`TIP-AC-8`) use a synthetic bare-`<button>` fixture instead:
 * `design.md` §10 explicitly disqualifies a tooltip fixture that already fits on screen, and
 * `pr-field-header`'s own tooltip renders inside `.sgi-dac-tooltip`, which caps its height at
 * `max-height: 320px` (`custom-fields.scss`) — too short to ever be genuinely "taller than the
 * available space" against a real viewport. The synthetic fixture below deliberately omits that
 * style class so its height is driven by real content instead.
 */

describe('PrTooltipDirective — keyboard focus order, vertical clamp, scroll/resize reposition (TIP-T-4)', () => {
  // The directive appends `.pr-tooltip` directly to `document.body` (by design — never clipped by
  // an ancestor's `overflow: hidden`), OUTSIDE the Angular component tree Cypress remounts between
  // tests. Left uncleaned, a pinned tooltip from one test survives into the next test's DOM and
  // corrupts `.pr-tooltip` queries there (found empirically: a stray tooltip from the TIP-AC-5
  // fixture was still present, floating, during the TIP-AC-7/TIP-AC-8 tests below, and even
  // covered the trigger under test). Mirrors the Jest spec's own `afterEach(() => document.body
  // .innerHTML = '')`, but only removes `.pr-tooltip` nodes — wiping all of `document.body` would
  // also delete Cypress' own `[data-cy-root]` mount point.
  afterEach(() => {
    cy.window().then(win => {
      win.document.querySelectorAll('.pr-tooltip').forEach(el => el.remove());
    });
  });

  describe('TIP-AC-5 — focus order into a pinned tooltip containing links', () => {
    const withTwoLinks = `<app-pr-field-header label="Result title" tooltip='See the <a href="#glossary" id="tipLink1">glossary</a> and the <a href="#scoring" id="tipLink2">scoring guide</a>.'></app-pr-field-header>`;

    it('pins on click, moves focus onto the FIRST tooltip link (not just "some element"), advances to the second on Tab, is Enter-activatable, and stays trapped inside on a further Tab', () => {
      mountCF(withTwoLinks);

      cy.get('button.sgi-dac-info').as('trigger').focus().click();
      cy.get('@trigger').should('have.attr', 'aria-expanded', 'true');

      // pin() calls FocusTrap.focusFirstTabbableElement() synchronously on open — the exact
      // sequence TIP-AC-5 requires is trigger -> first tooltip element, asserted by id, never by
      // "some element got focus" (design.md §10's named no-pass condition for this defect class).
      cy.focused().should('have.id', 'tipLink1');

      cy.realPress('Tab');
      cy.focused().should('have.id', 'tipLink2');

      // Enter-activatable (TIP-AC-5): prove the browser genuinely fires a click on the focused
      // link from the Enter keypress — a stub, not just "nothing threw" — while preventing the CT
      // iframe from actually navigating away.
      const onLinkClick = cy.stub().as('linkClicked');
      cy.get('#tipLink2').then($link => {
        $link.get(0).addEventListener('click', (event: Event) => {
          event.preventDefault();
          onLinkClick();
        });
      });
      cy.realPress('Enter');
      cy.get('@linkClicked').should('have.been.calledOnce');

      // A further Tab stays trapped inside the tooltip (CDK FocusTrap, TIP-DD-2's toggletip
      // pattern) rather than escaping to the page body — proves containment, not just "moved once".
      cy.realPress('Tab');
      cy.focused().should('have.id', 'tipLink1');
    });

    it('leaves focus on the trigger when the tooltip has no tabbable content (no dead focus trap on a plain-text tooltip)', () => {
      mountCF(`<app-pr-field-header label="Result title" tooltip="Plain guidance, no links."></app-pr-field-header>`);
      cy.get('button.sgi-dac-info').as('trigger').focus().click();
      // pin() only creates a FocusTrap when `hasTabbableContent` is true (pr-tooltip.directive.ts)
      // — with none, focus must never leave the trigger.
      cy.focused().should('have.class', 'sgi-dac-info');
    });
  });

  describe('TIP-AC-7 — vertical clamp with a tooltip taller than the available space', () => {
    // Deliberately no `prTooltipStyleClass` — the sgi-dac-tooltip modifier caps height at 320px
    // (custom-fields.scss), which could never fail this assertion regardless of the clamp's
    // correctness. 30 real paragraphs comfortably exceed any on-screen gap this test constructs.
    const tallTooltipHtml = Array.from(
      { length: 30 },
      (_, i) => `<p>Guidance paragraph ${i + 1} — enough real text to add genuine height to this fixture.</p>`
    ).join('');

    it('keeps the tooltip fully inside the vertical viewport when opened a few px from the top, with a tooltip far taller than the remaining space above it', () => {
      mountCF(
        `<div style="height: 900px"></div>
         <button id="tallTrigger" type="button" [prTooltip]="tip" prTooltipPosition="top">Trigger</button>
         <div style="height: 900px"></div>`,
        { componentProperties: { tip: tallTooltipHtml } }
      );

      // Leaves ~20px of space above the trigger — the fixture's tooltip needs far more than that,
      // which is exactly the scenario TIP-AC-7 / design.md §10 requires for a valid test (a
      // fixture that already fits cannot exercise the clamp and is named there as a no-pass case).
      cy.scrollTo(0, 880);
      cy.get('#tallTrigger').click();

      cy.get('.pr-tooltip')
        .should('be.visible')
        .then($tip => {
          const rect = $tip[0].getBoundingClientRect();
          expect(rect.top, 'tooltip top must not go negative / off-screen above y=0').to.be.at.least(0);
          cy.window().then(win => {
            expect(rect.top, 'tooltip top must stay within the vertical viewport').to.be.at.most(win.innerHeight);
          });
        });
    });
  });

  describe('TIP-AC-8 — reposition on scroll and resize while pinned', () => {
    it('recomputes position on scroll of an ANCESTOR overflow:auto container, staying anchored to the trigger', () => {
      // Rework attempt 2 fix (`TIP-T-4`, discovered issue): a plain WINDOW scroll cannot
      // discriminate "the scroll listener re-ran position()" from "no listener exists at all".
      // `pr-tooltip.directive.ts` pins the tooltip in DOCUMENT coordinates
      // (`top = viewportTop + window.scrollY`) on an absolutely-positioned node — under a window
      // scroll, the trigger's own viewport position shifts by exactly `-scrollDelta` too, so
      // `rect.top` reads identically to `trigger.bottom + gap` whether or not `position()` ever
      // re-ran. The only fixture that can tell the two apart is one where the TRIGGER moves
      // independently of `window.scrollY` — an ancestor `overflow: auto` container scrolled
      // directly — which is also the exact case the directive's own `pin()` comment names as the
      // reason its scroll listener is registered on the CAPTURE phase ("capturing... so scrolling
      // inside a table/drawer ancestor is caught"). The window itself is never scrolled here.
      mountCF(
        `<div id="scrollBox" style="height: 200px; overflow: auto; position: relative;">
           <div style="height: 400px"></div>
           <button id="scrollTrigger" type="button" [prTooltip]="'Anchored guidance text.'" prTooltipPosition="bottom">Trigger</button>
           <div style="height: 400px"></div>
         </div>`
      );

      // Bring the trigger into view inside the box BEFORE pinning, comfortably clear of the box's
      // own top edge (scrollTop 300 puts the trigger ~100px down inside the 200px window) so
      // neither capture below is anywhere near the directive's OWN vertical clamp (TIP-AC-7) —
      // this test is about the reposition wiring, not the clamp.
      cy.get('#scrollBox').scrollTo(0, 300);
      cy.get('#scrollTrigger').click();

      cy.get('.pr-tooltip').then($tip => {
        const before = $tip[0].getBoundingClientRect().top;

        // Scroll the ANCESTOR box by a modest amount (still leaves the trigger on-screen, clear of
        // the clamp) — this is what a plain `cy.scrollTo` on the window cannot exercise (see
        // comment above).
        cy.get('#scrollBox').scrollTo(0, 350);

        cy.get('#scrollTrigger').then($trigger => {
          const triggerRectAfterScroll = $trigger[0].getBoundingClientRect();
          cy.get('.pr-tooltip').should($tip2 => {
            const after = $tip2[0].getBoundingClientRect().top;
            expect(
              after,
              'position() must have re-run on the ancestor container scroll — the tooltip cannot stay at its pre-scroll spot'
            ).not.to.be.closeTo(before, 1);
            // "bottom" position formula (pr-tooltip.directive.ts): top = trigger.bottom + gap(8).
            // Matching this formula against the trigger's POST-scroll rect (not the stale
            // pre-scroll one) proves genuine re-anchoring, not just "some different number".
            expect(after, 'tooltip must stay anchored to the trigger, not merely move').to.be.closeTo(triggerRectAfterScroll.bottom + 8, 2);
          });
        });
      });
    });

    it('recomputes position on window resize, staying anchored to the trigger', () => {
      cy.viewport(1280, 720);
      mountCF(
        `<div style="display:flex; justify-content:flex-end; width:100%;">
           <button id="resizeTrigger" type="button" [prTooltip]="'Resize guidance text.'" prTooltipPosition="left">Trigger</button>
         </div>`
      );

      cy.get('#resizeTrigger').click();
      cy.viewport(700, 720); // narrows the flex row, shifting the flex-end trigger's own rect.left

      cy.get('#resizeTrigger').then($trigger => {
        const triggerRectAfterResize = $trigger[0].getBoundingClientRect();
        cy.get('.pr-tooltip').should($tip => {
          const rect = $tip[0].getBoundingClientRect();
          // "left" position formula: left = trigger.left - tip.width - gap(8). Matching it against
          // the trigger's POST-resize rect proves the tooltip followed, not a stale pre-resize spot.
          expect(rect.right, 'tooltip must have followed the trigger after resize').to.be.closeTo(triggerRectAfterResize.left - 8, 2);
        });
      });
    });
  });
});
