import { PrTooltipDirectiveModule } from '../../../../../../../../shared/directives/pr-tooltip-directive.module';

/**
 * TIP-T-5 (`docs/specs/changes/tooltip-keyboard-accessibility/`) — site 1 of the 5 flagged
 * compound-click sites named in `design.md` §10.1 / `TIP-DD-1`: the drawer's Approve button
 * (`result-review-drawer.component.html:432-444`) doubles as a `[prTooltip]` trigger.
 *
 * MOUNT DECISION (recorded per `tasks.md` `TIP-T-5`): mounting `ResultReviewDrawerComponent`
 * itself was judged IMPRACTICAL for Cypress CT and a harness reproducing the exact button markup
 * was used instead. Reasons:
 *   1. The component injects `ApiService` (a root aggregator over ~15 further real, HTTP-backed
 *      services), `RolesService`, `CentersService`, `InstitutionsService` and `Router` — resolving
 *      that whole DI graph in a browser test is the same order of effort as booting the app.
 *   2. Its constructor `effect()` fires `loadResultDetail()` (three chained HTTP calls) the moment
 *      both `resultToReview()` and `visible()` are set — unavoidable once the component exists.
 *   3. Its `imports` pull in `RdContributorsAndPartnersModule`, `KpContentComponent`,
 *      `InnoDevContentComponent`, `CapSharingContentComponent`, `PolicyChangeContentComponent`,
 *      `InnovationUseContentComponent` — each with its own further dependency graph.
 * The harness below reproduces the Approve button's exact bindings (`[disabled]`,
 * `(click)="canApprove ? onApprove() : null"`, `[prTooltip]="tooltipText"`) verbatim, which is
 * everything `PrTooltipDirective`'s coexistence with a pre-existing click handler actually
 * exercises — the surrounding drawer plumbing is irrelevant to that contract.
 *
 * TEMPLATE-DRIFT LOCK (rework attempt 2, review issue 1): a harness copies markup instead of
 * mounting the real component, so nothing else in this file would notice if the real template's
 * `(click)` guard, `[disabled]` gate, or `[prTooltip]` binding changed underneath it. The `before()`
 * below reads the REAL `result-review-drawer.component.html` off disk and asserts the exact three
 * binding strings this harness is standing in for are still present verbatim — if any of them is
 * edited or removed at the real site, this lock fails even though every test below still passes
 * against the (now-stale) harness.
 *
 * FINDING (not fixed here — out of scope, no component logic touched): the real
 * `getApproveButtonTooltip()` returns `''` exactly when `canApprove()` is `true`, and the button
 * carries a *native* `disabled` attribute exactly when `canApprove()` is `false` — the app never
 * produces a live "enabled click + non-empty tooltip" combination on this exact button. A real
 * mouse user hovering/clicking a native `disabled` button gets no browser gesture at all, so this
 * guidance text may be effectively unreachable by mouse in production; escalate as a finding for
 * `TIP-T-6`'s manual sweep, not just an inline test aside. Test 3 below demonstrates the actual
 * `TIP-DD-1` mechanism (click still fires exactly once even when a tooltip also has content and
 * pins) using a synthetic combination (enabled + non-empty tooltip) since the real button never
 * produces that combination live.
 *
 * ADVISORY (also true of site 2, `phase-management-table`): this site's `TIP-DD-1` "action fires
 * AND tooltip pins on one click" collision is UNREACHABLE by construction — `getApproveButtonTooltip()`
 * and the `[disabled]` gate share the same `canApprove()` predicate, so the app can never show live
 * tooltip content on an enabled, clickable Approve button. Good news (no live regression risk here),
 * but it means `tasks.md`'s "5 riskiest sites" selection over-counted this one; the genuine,
 * always-reachable collision surface is sites 3 (`results-list`), 4 (`user-management`) and
 * 5 (`reporting-aow-table`). Worth promoting into `design.md` §10.1 in a future pass.
 */
describe('Approve button — tooltip trigger doubles as a functional control (TIP-T-5, site 1)', () => {
  const REAL_TEMPLATE_PATH =
    'src/app/pages/result-framework-reporting/pages/bilateral-results/components/results-review-table/components/result-review-drawer/result-review-drawer.component.html';

  before(() => {
    cy.readFile(REAL_TEMPLATE_PATH).then((html: string) => {
      expect(html, 'real disabled-gate binding').to.include('[disabled]="!canApprove()"');
      expect(html, 'real click-guard binding').to.include('(click)="canApprove() ? onApprove() : null"');
      expect(html, 'real tooltip-text binding').to.include('[prTooltip]="getApproveButtonTooltip()"');
    });
  });

  it('fires onApprove exactly once when enabled, with no tooltip content (real production state)', () => {
    const onApprove = cy.stub().as('onApprove');
    cy.mount(
      `<button
         type="button"
         class="approve-button"
         [disabled]="!canApprove"
         (click)="canApprove ? onApprove() : null"
         [prTooltip]="tooltipText"
         prTooltipPosition="top">
         APPROVE
       </button>`,
      {
        imports: [PrTooltipDirectiveModule],
        componentProperties: { canApprove: true, tooltipText: '', onApprove }
      }
    );

    cy.get('.approve-button').click();
    cy.get('@onApprove').should('have.been.calledOnce');
    // Empty tooltip text: show() short-circuits, matching real getApproveButtonTooltip() output
    // when canApprove() is true — no pin, nothing swallowed either way.
    cy.get('.pr-tooltip').should('not.exist');
  });

  it('disabled state: the click guard still blocks onApprove even when the directive itself still pins', () => {
    // Empirically verified (not assumed): a Cypress `{force:true}` click issues its own low-level
    // event dispatch rather than a hardware gesture, so — unlike a real mouse click a user could
    // perform — it DOES still reach both the Angular `(click)` binding and the directive's own
    // `HostListener('click')` on a native `disabled` button. That makes this a meaningful edge-case
    // regression check even though it does not simulate a real end-user interaction: it proves the
    // ternary guard (`canApprove ? onApprove() : null`) keeps working correctly, and that the
    // directive's own unconditional click handling neither gets blocked by nor interferes with it.
    const onApprove = cy.stub().as('onApprove');
    cy.mount(
      `<button
         type="button"
         class="approve-button"
         [disabled]="!canApprove"
         (click)="canApprove ? onApprove() : null"
         [prTooltip]="tooltipText"
         prTooltipPosition="top">
         APPROVE
       </button>`,
      {
        imports: [PrTooltipDirectiveModule],
        componentProperties: {
          canApprove: false,
          tooltipText: 'Please complete and save the TOC data before approving the result',
          onApprove
        }
      }
    );

    cy.get('.approve-button').should('be.disabled');
    cy.get('.approve-button').click({ force: true });
    cy.get('@onApprove').should('not.have.been.called');
    cy.get('.pr-tooltip').should('exist').and('have.class', 'pr-tooltip--pinned');
  });

  it('TIP-DD-1 mechanism: action fires exactly once AND the tooltip pins, when both are live on one click', () => {
    // Synthetic combination (documented above): the real Approve button never has BOTH a
    // non-empty tooltip and an enabled click at once, so this proves the directive-level
    // guarantee generically rather than reproducing this exact site's own dead branch.
    // NOTE on the scroll-reposition half of this "worst case combination" (design.md §10.1 #1):
    // it was attempted here (drive a wrapping `overflow:auto` ancestor's `scrollTop` and assert
    // the pinned tooltip's `top` changes) and abandoned. The Cypress Angular CT harness stretches
    // the mounted template to its own fixed viewport height regardless of nesting, so the
    // scrollable ancestor's real `clientHeight` inside this harness never matched what the markup
    // declared, making the reposition assertion unfalsifiable in either direction here — a harness
    // artefact, not evidence about the directive. `TIP-T-4` already owns rigorous scroll/resize
    // reposition coverage against a real, correctly-laid-out fixture; duplicating it inside this
    // site-specific harness was not worth the added flakiness. This test's job — the compound
    // click/pin coexistence — is covered fully below.
    const onApprove = cy.stub().as('onApprove');
    cy.mount(
      `<button
         type="button"
         class="approve-button"
         (click)="onApprove()"
         [prTooltip]="tooltipText"
         prTooltipPosition="top">
         APPROVE
       </button>`,
      {
        imports: [PrTooltipDirectiveModule],
        componentProperties: { tooltipText: 'Please save your changes before approving', onApprove }
      }
    );

    cy.get('.approve-button').click();
    cy.get('@onApprove').should('have.been.calledOnce');
    cy.get('.pr-tooltip').should('exist').and('have.class', 'pr-tooltip--pinned');
    cy.get('.approve-button').should('have.attr', 'aria-expanded', 'true');

    // Re-click while pinned: the directive's own toggle-closed path must not swallow or
    // double-fire the host's click action either.
    cy.get('.approve-button').click({ force: true });
    cy.get('@onApprove').should('have.been.calledTwice');
    cy.get('.pr-tooltip').should('not.exist');
  });
});
