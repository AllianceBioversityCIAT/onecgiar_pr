import { PrTooltipDirectiveModule } from '../../../../shared/directives/pr-tooltip-directive.module';

/**
 * TIP-T-5 — site 4 of the 5 flagged compound-click sites (`design.md` §10.1): the user-status
 * toggle button (`user-management.component.html:221-228`) — `(click)="onToggleUserStatus(user)"`
 * and `[prTooltip]="user.isActive ? 'Deactivate user' : 'Activate user'"` on the SAME element.
 *
 * MOUNT DECISION: `UserManagementComponent` (`export default class ... implements OnInit`) injects
 * `ApiService`, `ResultsApiService`, `InitiativesService`, `DynamicPanelServiceService` and
 * `ExportTablesService`, wires five `@ViewChild` refs, and its `ngOnInit` kicks off the user list
 * fetch plus several filter-catalog loads. None of that is needed to exercise one toggle button's
 * click/tooltip coexistence, so a harness reproducing the exact button markup is used instead.
 *
 * TEMPLATE-DRIFT LOCK (rework attempt 2, review issue 1): the `before()` below reads the REAL
 * `user-management.component.html` off disk and asserts the exact `(click)`/`[prTooltip]` binding
 * strings this harness stands in for are still present verbatim.
 *
 * This is the CLEANEST of the 5 sites for `TIP-DD-1`: unlike the Approve button and the phase-table
 * edit action, the tooltip text here is NEVER empty and the click is NEVER guarded off — every
 * click unconditionally both flips the status and pins the tooltip. This is exactly the collision
 * `TIP-DD-1` accepted as a deliberate trade-off, live and unconditional at this real site.
 */
describe('User-management status toggle — unconditional compound click (TIP-T-5, site 4)', () => {
  const REAL_TEMPLATE_PATH = 'src/app/pages/admin-section/pages/user-management/user-management.component.html';

  before(() => {
    cy.readFile(REAL_TEMPLATE_PATH).then((html: string) => {
      expect(html, 'real click binding').to.include('(click)="onToggleUserStatus(user)"');
      expect(html, 'real tooltip binding').to.include(`[prTooltip]="user.isActive ? 'Deactivate user' : 'Activate user'"`);
    });
  });

  function mountToggle() {
    return cy.mount(
      `<button
         type="button"
         class="action-btn action-btn-toggle"
         (click)="onToggleUserStatus()"
         [prTooltip]="isActive ? 'Deactivate user' : 'Activate user'"
         prTooltipPosition="top">
         <i class="material-icons-round">{{ isActive ? 'person_off' : 'person' }}</i>
       </button>`,
      {
        imports: [PrTooltipDirectiveModule],
        componentProperties: {
          isActive: true,
          // MINOR FIX (rework attempt 2): this is a synthetic stand-in, not the real handler's
          // behaviour. The real `onToggleUserStatus(user)` (`user-management.component.ts`) does
          // NOT flip `user.isActive` synchronously — it opens a confirmation modal / a
          // confirm-gated alert. This local handler is used purely as a spy-equivalent that also
          // proves "the handler ran" via a visible DOM state change (icon swap), the same evidence
          // a `cy.stub()` spy would give, not a claim that it reproduces the real confirm-gated
          // flow. The real confirm-gated flip is recorded as `TIP-T-6`'s manual sweep item, not
          // this test's.
          onToggleUserStatus(this: { isActive: boolean }) {
            this.isActive = !this.isActive;
          }
        }
      }
    );
  }

  it('a single click flips the active state exactly once AND pins the tooltip, every time — no double-fire', () => {
    mountToggle();

    // The host is a native <button>, so PrTooltipDirective's role/tabindex/aria-expanded upgrade
    // (`syncHostAffordance`, gated on `!hostIsNativelyInteractive`) never applies — no
    // aria-expanded is present before the first pin. That is directive-correct behaviour (a
    // natively-interactive host is left untouched, per `design.md` §2.3/DD-3), not a gap in this
    // test: the toggletip attributes only ever appear on `pin()`, asserted below.
    cy.get('.action-btn-toggle i').should('have.text', 'person_off');
    cy.get('.action-btn-toggle').should('not.have.attr', 'aria-expanded');

    cy.get('.action-btn-toggle').click();

    // State assertion: the toggle really flipped (icon swaps person_off -> person), exactly once.
    cy.get('.action-btn-toggle i').should('have.text', 'person');
    // The tooltip also pinned on the very same click, per TIP-DD-1 — action and pin coexist.
    cy.get('.pr-tooltip').should('exist').and('have.class', 'pr-tooltip--pinned');
    cy.get('.action-btn-toggle').should('have.attr', 'aria-expanded', 'true');

    // A second click (re-click while pinned) toggles the tooltip closed per the directive's own
    // click-toggles-pin rule, but the underlying action must still fire exactly once per click —
    // not swallowed by the tooltip's own click handling, not fired twice. {force:true}: the pinned
    // tooltip visually overlaps the small CT viewport's button (real pages have more surrounding
    // layout room) — irrelevant to what this assertion is checking.
    cy.get('.action-btn-toggle').click({ force: true });
    cy.get('.action-btn-toggle i').should('have.text', 'person_off');
  });
});
