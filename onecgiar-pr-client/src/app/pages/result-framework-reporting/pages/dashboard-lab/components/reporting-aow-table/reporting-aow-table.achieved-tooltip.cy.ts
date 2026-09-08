import { ReportingAowTableComponent, ReportingAowGroup, ReportingIndicator } from './reporting-aow-table.component';

/**
 * TIP-T-5 — site 5 of the 5 flagged compound-click sites (`design.md` §10.1): the Achieved cell
 * button (`reporting-aow-table.component.html:889-901`, shared `#indicatorRow` template) carries
 * BOTH `[prTooltip]="achievedTooltip(row)"` and `(click)="emitAndStop(openAchieved, row, $event)"`
 * on the same `<button>`. `emitAndStop` (`reporting-aow-table.component.ts:1071`) is a PRE-EXISTING
 * workaround for a DIFFERENT bubbling problem: the enclosing row also has
 * `(click)="openRow.emit(row)"` (row-opens-drawer navigation), so every cell action inside it calls
 * `ev.stopPropagation()` before emitting its own output, to keep a click on Target/Achieved/etc.
 * from ALSO opening the row.
 *
 * MOUNT DECISION: `ReportingAowTableComponent` is `standalone: true`, injects no services (its own
 * docstring: "PRESENTATION ONLY... testable without the 287-LOC EntityAowService"), and is already
 * mounted directly elsewhere in this same folder (`reporting-aow-table.row-layout.cy.ts`) — real
 * component mount is the practical (and precedented) choice here, no harness needed.
 *
 * `achievedTooltip(row)` returns non-empty text exactly when `achievedIsEmpty(row)` is true (no
 * value reported yet) — unlike sites 1-3, this is NOT gated by the same predicate that guards the
 * click, so this is a genuine, always-reachable compound-click site: the Achieved button's click
 * ALWAYS fires `openAchieved` (stopping the row's own click), and CAN also carry tooltip content
 * that pins, at the same time.
 */
function indicator(over: Partial<ReportingIndicator>): ReportingIndicator {
  return {
    indicator_id: 1,
    indicator_description: 'Number of climate-resilient staple crop varieties released',
    target_value_sum: '25',
    actual_achieved_value_sum: undefined,
    progress_percentage: null as any,
    __hlo: 'HLO4.AOW1.IO1',
    __aowCode: 'AOW01',
    ...over
  };
}

const FIXTURE_GROUPS: ReportingAowGroup[] = [
  {
    aow: { id: 1, code: 'AOW01', name: 'Market Intelligence' },
    indicators: [indicator({ indicator_id: 42 })],
    count: 1,
    loading: false,
    kind: 'aow'
  }
];

describe('ReportingAowTableComponent — Achieved cell compound-click (TIP-T-5, site 5)', () => {
  it('openAchieved fires exactly once, the row-open click is stopped, and the tooltip pins (flat view)', () => {
    const openAchieved = cy.stub().as('openAchieved');
    const openRow = cy.stub().as('openRow');

    cy.mount(ReportingAowTableComponent, {
      componentProperties: { groups: FIXTURE_GROUPS, viewMode: 'flat' }
    }).then(({ component }) => {
      component.openAchieved.subscribe(openAchieved);
      component.openRow.subscribe(openRow);
    });

    cy.get('tr.pr-flat-body').should('exist');
    cy.get('tr.pr-flat-body button').contains('button', 'Achieved').closest('button').as('achievedBtn');

    // The row's underlying value is unreported, so achievedTooltip(row) returns non-empty text —
    // the tooltip has real content to pin.
    cy.get('@achievedBtn').click();

    cy.get('@openAchieved').should('have.been.calledOnce');
    // The row itself owns (click)="openRow.emit(row)" — emitAndStop's ev.stopPropagation() must
    // keep that from ALSO firing. This is the pre-existing, unrelated bubbling fix this test
    // regresses per design.md §10.1 item 5.
    cy.get('@openRow').should('not.have.been.called');

    cy.get('.pr-tooltip').should('exist').and('have.class', 'pr-tooltip--pinned');
    cy.get('@achievedBtn').should('have.attr', 'aria-expanded', 'true');
  });

  it('a reported (non-empty) row still stops propagation and fires exactly once, with no tooltip to pin', () => {
    const openAchieved = cy.stub().as('openAchieved');
    const openRow = cy.stub().as('openRow');
    const reportedGroups: ReportingAowGroup[] = [
      {
        aow: { id: 1, code: 'AOW01', name: 'Market Intelligence' },
        indicators: [indicator({ indicator_id: 43, actual_achieved_value_sum: 10 })],
        count: 1,
        loading: false,
        kind: 'aow'
      }
    ];

    cy.mount(ReportingAowTableComponent, {
      componentProperties: { groups: reportedGroups, viewMode: 'flat' }
    }).then(({ component }) => {
      component.openAchieved.subscribe(openAchieved);
      component.openRow.subscribe(openRow);
    });

    cy.get('tr.pr-flat-body button').contains('button', 'Achieved').closest('button').as('achievedBtn');
    cy.get('@achievedBtn').click();

    cy.get('@openAchieved').should('have.been.calledOnce');
    cy.get('@openRow').should('not.have.been.called');
    // achievedIsEmpty(row) is false here (value = 10) -> achievedTooltip(row) is '' -> no pin.
    cy.get('.pr-tooltip').should('not.exist');
  });
});
