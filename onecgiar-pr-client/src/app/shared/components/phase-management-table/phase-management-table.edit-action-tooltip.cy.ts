import { PrTooltipDirectiveModule } from '../../directives/pr-tooltip-directive.module';

/**
 * TIP-T-5 — site 2 of the 5 flagged compound-click sites (`design.md` §10.1): the phase table's
 * edit action (`phase-management-table.component.html:148-151`) puts `[prTooltip]` on a CHILD `<i>`
 * while the parent `<div class="action_button edit">` owns the `(click)`.
 *
 * MOUNT DECISION: `PhaseManagementTableComponent` (standalone: false) injects `ApiService`,
 * `ResultsApiService`, `CustomizedAlertsFeService` and `PhasesService`, and its `ngOnInit` fires
 * four real HTTP-backed catalog loads plus `dataControlSE.getCurrentPhases()` unconditionally.
 * Reproducing that whole DI graph to exercise one click/tooltip interaction is disproportionate —
 * a harness reproducing the exact edit-action markup (verbatim from the template) is used instead;
 * it is everything the click-bubbles-through-a-tooltip-decorated-child contract actually needs.
 *
 * TEMPLATE-DRIFT LOCK (rework attempt 2, review issue 1): the `before()` below reads the REAL
 * `phase-management-table.component.html` off disk and asserts the exact `(click)`/`[prTooltip]`
 * binding strings this harness stands in for are still present verbatim — a harness with no such
 * check would stay green even if the real parent `(click)` guard or the child `[prTooltip]` were
 * edited or removed, leaving this real site with zero actual verification.
 *
 * NOTE on the real guard: `getFeedback()` gates BOTH the tooltip text and the click handler with
 * the SAME predicate (`[prTooltip]="getFeedback() ? this.disabledActionsText : null"` /
 * `(click)="getFeedback() ? null : (phase.editing = true)"`), so the real app never shows tooltip
 * content on a row whose edit click is enabled — the two tests below therefore cover the two real,
 * mutually-exclusive states rather than a single always-both-live combination, and each is a
 * genuine `<div>` click (no native `disabled` attribute involved), so unlike the Approve-button
 * site, both states dispatch real click events.
 *
 * ADVISORY (see also site 1, `result-review-drawer`): this site's `TIP-DD-1` collision is likewise
 * UNREACHABLE by construction — the same `getFeedback()` predicate gates both the tooltip text and
 * the click, so an enabled edit click never carries live tooltip content either. Recorded here so a
 * future reviewer doesn't read "5 riskiest sites" as "5 sites that actually collide live" — only
 * sites 3/4/5 do.
 */
describe('Phase table edit action — tooltip on a child <i>, click owned by the parent <div> (TIP-T-5, site 2)', () => {
  const REAL_TEMPLATE_PATH = 'src/app/shared/components/phase-management-table/phase-management-table.component.html';

  before(() => {
    cy.readFile(REAL_TEMPLATE_PATH).then((html: string) => {
      expect(html, 'real parent click-guard binding').to.include(
        '(click)="getFeedback() ? null : (phase.editing = true)"'
      );
      expect(html, 'real child tooltip binding').to.include('[prTooltip]="getFeedback() ? this.disabledActionsText : null"');
    });
  });

  function mount(feedback: string, onEdit: () => void) {
    return cy.mount(
      `<div class="action_button edit" (click)="getFeedback() ? null : onEdit()" [ngClass]="{ disabled: getFeedback() }">
         <i class="material-icons-round" [prTooltip]="getFeedback() ? disabledActionsText : null" prTooltipPosition="top">edit</i>
       </div>`,
      {
        imports: [PrTooltipDirectiveModule],
        componentProperties: {
          getFeedback: () => feedback,
          disabledActionsText: 'Finish editing the phase to be able to edit or delete this phase.',
          onEdit
        }
      }
    );
  }

  it('enabled row: clicking the tooltip-bearing <i> fires the parent edit action exactly once, no pin', () => {
    const onEdit = cy.stub().as('onEdit');
    mount('', onEdit);

    cy.get('i.material-icons-round').click();
    cy.get('@onEdit').should('have.been.calledOnce');
    // getFeedback() is falsy here → prTooltip resolves to null → nothing to pin. No swallowed
    // click, no double-fire: the click reached the parent's handler through the directive-bearing
    // child exactly once.
    cy.get('.pr-tooltip').should('not.exist');
  });

  it('disabled row (another phase mid-edit): the guard still blocks the action, AND the tooltip pins', () => {
    const onEdit = cy.stub().as('onEdit');
    mount('Finish editing the phase to be able to edit or delete this phase.', onEdit);

    cy.get('i.material-icons-round').click();
    // getFeedback() is truthy → the SAME predicate that supplies the tooltip text also guards the
    // click — onEdit correctly never fires. This is intentional app behaviour, not a bug the
    // directive introduced; the assertion here proves the directive's own unconditional click
    // handling (which layers on top per TIP-DD-1) does not defeat that pre-existing guard.
    cy.get('@onEdit').should('not.have.been.called');
    cy.get('.pr-tooltip').should('exist').and('have.class', 'pr-tooltip--pinned');
    cy.get('i.material-icons-round').should('have.attr', 'aria-expanded', 'true');
  });
});
