import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { IndicatorDrawerComponent, DrawerTab } from './indicator-drawer.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';

/**
 * @akili-spec changes/indicator-reported-results — IRR-T-4, the REAL-LAYOUT gate for `IRR-AC-7`.
 *
 * Why this file exists at all: the sibling Jest suite proves what the `width()` signal HOLDS and
 * which template branch renders. jsdom lays nothing out and drops every `var()` from an inline
 * style, so it cannot answer the two questions the acceptance criterion actually asks — is the
 * aside 760 px WIDE on screen, and does the status pill resolve to the token pair. Chromium can.
 *
 * Everything measured here is read off the rendered DOM (`offsetWidth`, `getComputedStyle`), never
 * off the component's own state, and every width assertion asserts a CHANGE: a before and an after
 * that are equal would mean the harness measured nothing, which is the failure mode this gate is
 * most exposed to.
 *
 * Known harness noise, documented in `requirements.md` §9 and NOT evidence either way:
 *  - a primeicons font request that fails in this Chromium (no route to the CDN);
 *  - `TS2322` in `cypress/support/ct-utils.ts:54`, a file this spec does not use but which the CT
 *    tsconfig still type-checks.
 */

/** Contributions 3 / 2 / 1 so the default sort (contribution desc) fixes the row order. */
const CONTRIBUTORS = [
  {
    result_id: 9006,
    result_code: '9006',
    title: 'Barley EAF ICARDA TPP00143 gender-responsive trait profile published',
    status_name: 'Quality assessed',
    status_id: 2,
    contributing_indicator: 3,
    version_id: 11,
    result_type_name: 'Knowledge product'
  },
  {
    result_id: 8871,
    result_code: '8871',
    title: 'Partnership expansion brief — thematic collaboration with NARES',
    status_name: 'Submitted',
    status_id: 3,
    contributing_indicator: 2,
    version_id: 11,
    result_type_name: 'Knowledge product'
  },
  {
    // status_id 99 is in no token map — it must fall back to the not-started PAIR, whole.
    result_id: 8702,
    result_code: '8702',
    title: 'Dataset: crop-agnostic partner map v2',
    status_name: 'Something new',
    status_id: 99,
    contributing_indicator: 1,
    version_id: 11,
    result_type_name: 'Knowledge product'
  }
];

const INDICATOR = {
  toc_result_id: 'toc-1',
  related_node_id: 'IND-55',
  indicator_description: 'Number of knowledge products published and quality-assured',
  target_value_sum: 8,
  actual_achieved_value_sum: 3
};

/**
 * Every number this spec measured, written out at the end so the run leaves evidence behind.
 * Declared field-by-field rather than as a `Record`: the CT program runs with
 * `noPropertyAccessFromIndexSignature`, which rejects `MEASURED.sorting` on an index signature.
 */
interface Measurements {
  floorAndRestore?: unknown;
  alreadyWideEnough?: unknown;
  viewportClamp?: unknown;
  cardFallback?: unknown;
  pillApproved?: unknown;
  pillNotStarted?: unknown;
  sorting?: unknown;
}
const MEASURED: Measurements = {};

/**
 * Mounts the drawer for real.
 *
 * The "before" tab is always `info`, NEVER `report`: the report case renders the real
 * `lab-report-form`, whose `ResultLevelService` calls `ApiService.resultsSE.GET_TypeByResultLevel`
 * from its constructor and dies against this stub. `info` is a legitimate prior tab for the
 * IRR-R-8 scenario ("switching to Info restores 520") and exercises the same effect.
 */
function mountDrawer(initialTab: DrawerTab) {
  return cy.mount(IndicatorDrawerComponent, {
    componentProperties: { indicator: INDICATOR, initialTab, programCode: 'SP01', canReport: false },
    providers: [
      provideRouter([]),
      {
        provide: ApiService,
        useValue: { resultsSE: { GET_ExistingResultsContributors: () => of({ response: { contributors: CONTRIBUTORS } }) } }
      },
      { provide: PhasesService, useValue: { phases: { reporting: [{ id: 11, phase_name: 'Reporting 2026' }] } } }
    ]
  });
}

/**
 * The colour a token resolves to IN THIS ENGINE — measured, not hard-coded from `colors.scss`.
 * A probe painted with the same `var()` the pill uses is the only comparison that would still be
 * right if someone re-valued the token; a literal `rgb(4, 120, 87)` in this file would silently
 * become the assertion's own definition of correct.
 */
function resolveToken(doc: Document, token: string, prop: 'color' | 'backgroundColor'): string {
  const probe = doc.createElement('span');
  probe.style.color = 'transparent';
  probe.style.setProperty(prop === 'color' ? 'color' : 'background-color', `var(${token})`);
  doc.body.appendChild(probe);
  const value = getComputedStyle(probe)[prop];
  probe.remove();
  return value;
}

describe('IndicatorDrawerComponent — width floor and card fallback, real Chromium (IRR-AC-7, IRR-T-4)', () => {
  after(() => {
    cy.writeFile('cypress/results/irr-t4-ct-measurements.json', JSON.stringify(MEASURED, null, 2) + '\n');
  });

  it('raises a 520 px drawer to the 760 px floor on entering the tab, and gives 520 back on leaving', () => {
    cy.viewport(1440, 900);

    const emitted: number[] = [];
    let ctx!: { component: any; fixture: any };

    mountDrawer('info').then(wrapper => {
      const component: any = wrapper.fixture.componentInstance;
      component.widthChange.subscribe((w: number) => emitted.push(w));
      // The drag this stands in for is a user habit, not an API: narrow the panel, THEN open the tab.
      component.width.set(520);
      wrapper.fixture.detectChanges();
      ctx = { component, fixture: wrapper.fixture };
    });

    const widths: { beforeTab?: number; onTab?: number; afterLeaving?: number } = {};

    cy.get('aside.pr-drawer').then($aside => {
      widths.beforeTab = ($aside[0] as HTMLElement).offsetWidth;
    });

    cy.then(() => {
      ctx.component.setTab('results');
      ctx.fixture.detectChanges();
    });

    // The table has to actually be there — a floor that widens an empty panel proves nothing.
    cy.get('aside.pr-drawer table').should('exist');
    cy.get('aside.pr-drawer tr.irr-data-row').should('have.length', CONTRIBUTORS.length);
    cy.get('aside.pr-drawer').then($aside => {
      widths.onTab = ($aside[0] as HTMLElement).offsetWidth;
    });

    cy.then(() => {
      ctx.component.setTab('info');
      ctx.fixture.detectChanges();
    });

    cy.get('aside.pr-drawer').then($aside => {
      widths.afterLeaving = ($aside[0] as HTMLElement).offsetWidth;
    });

    cy.then(() => {
      MEASURED.floorAndRestore = { viewport: 1440, ...widths, widthChangeEmissions: [...emitted] };
      expect(widths.beforeTab, 'aside offsetWidth BEFORE the tab').to.equal(520);
      expect(widths.onTab, 'aside offsetWidth ON the tab').to.equal(760);
      // Guard against the measurement that measures nothing (the disqualifier in the task).
      expect(widths.onTab, 'entering the tab must CHANGE the rendered width').to.not.equal(widths.beforeTab);
      expect(widths.afterLeaving, 'aside offsetWidth after LEAVING the tab').to.equal(520);
      expect(emitted, 'widthChange emissions').to.deep.equal([760, 520]);
    });
  });

  it('leaves a drawer that is already wider than the floor alone, and emits nothing', () => {
    cy.viewport(1440, 900);

    const emitted: number[] = [];
    let ctx!: { component: any; fixture: any };

    mountDrawer('info').then(wrapper => {
      const component: any = wrapper.fixture.componentInstance;
      component.widthChange.subscribe((w: number) => emitted.push(w));
      component.width.set(900);
      wrapper.fixture.detectChanges();
      ctx = { component, fixture: wrapper.fixture };
    });

    cy.then(() => {
      ctx.component.setTab('results');
      ctx.fixture.detectChanges();
    });

    cy.get('aside.pr-drawer').then($aside => {
      const measured = ($aside[0] as HTMLElement).offsetWidth;
      MEASURED.alreadyWideEnough = { viewport: 1440, onTab: measured, widthChangeEmissions: [...emitted] };
      expect(measured, 'a 900 px drawer is a FLOOR case, not a set — it must not shrink to 760').to.equal(900);
      expect(emitted, 'nothing changed, so nothing may be emitted').to.deep.equal([]);
    });
  });

  it('never exceeds the viewport clamp: on a 1000 px window the floor lands at 680, not 760', () => {
    cy.viewport(1000, 800);

    let ctx!: { component: any; fixture: any };

    mountDrawer('info').then(wrapper => {
      const component: any = wrapper.fixture.componentInstance;
      component.width.set(520);
      wrapper.fixture.detectChanges();
      ctx = { component, fixture: wrapper.fixture };
    });

    cy.then(() => {
      ctx.component.setTab('results');
      ctx.fixture.detectChanges();
    });

    cy.get('aside.pr-drawer').then($aside => {
      const measured = ($aside[0] as HTMLElement).offsetWidth;
      // Derived from the viewport this engine actually reports, not from the number passed to
      // cy.viewport — an iframe can differ by a scrollbar and the clamp is a function of the former.
      const innerWidth = $aside[0].ownerDocument.defaultView!.innerWidth;
      const clamp = Math.min(1100, Math.max(innerWidth - 320, 340), innerWidth);
      const expected = Math.min(760, clamp);

      MEASURED.viewportClamp = { requestedViewport: 1000, innerWidth, clamp, expected, onTab: measured };
      expect(measured, 'the floor is clamped by the viewport').to.equal(expected);
      expect(measured, 'and must stay at or under 680 on a 1000 px window').to.be.at.most(680);
      expect(measured, 'it still had to rise from 520').to.be.greaterThan(520);
    });
  });

  it('renders the card stack instead of the table once the drawer is under 640 px (IRR-R-8.1)', () => {
    cy.viewport(1440, 900);

    let ctx!: { component: any; fixture: any };

    mountDrawer('results').then(wrapper => {
      ctx = { component: wrapper.fixture.componentInstance as any, fixture: wrapper.fixture };
    });

    cy.get('aside.pr-drawer table').should('exist');
    cy.get('.irr-card').should('not.exist');

    cy.then(() => {
      ctx.component.width.set(600);
      ctx.fixture.detectChanges();
    });

    cy.get('aside.pr-drawer table').should('not.exist');
    cy.get('.irr-card').should('have.length', CONTRIBUTORS.length);
    // The strip survives the switch — only the ROWS change shape.
    cy.get('[data-testid="irr-strip"]').should('exist');

    cy.get('aside.pr-drawer').then($aside => {
      const measured = ($aside[0] as HTMLElement).offsetWidth;
      MEASURED.cardFallback = { viewport: 1440, width: measured, cards: CONTRIBUTORS.length };
      expect(measured, 'the drawer really is at the narrow width while the cards render').to.equal(600);
    });
  });

  it('resolves the status pill token PAIRS to real colours — the gap jsdom left open in IRR-T-3', () => {
    cy.viewport(1440, 900);
    mountDrawer('results');

    cy.get('tr.irr-data-row').should('have.length', CONTRIBUTORS.length);

    // Row 0 is the contribution-3 row (status_id 2 → approved); row 2 is status_id 99 → not-started.
    cy.get('tr.irr-data-row').eq(0).find('td').eq(3).find('span').then($pill => {
      const doc = $pill[0].ownerDocument;
      const computed = getComputedStyle($pill[0]);
      const approved = {
        text: $pill.text().trim(),
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        expectedColor: resolveToken(doc, '--pr-status-approved-fg', 'color'),
        expectedBackground: resolveToken(doc, '--pr-status-approved-bg', 'backgroundColor')
      };
      MEASURED.pillApproved = approved;

      expect(approved.text, 'the approved row').to.equal('Quality assessed');
      expect(approved.color, 'pill foreground resolves --pr-status-approved-fg').to.equal(approved.expectedColor);
      expect(approved.backgroundColor, 'pill background resolves --pr-status-approved-bg').to.equal(approved.expectedBackground);
      // A dropped var() paints transparent with no error at all — the exact jsdom-shaped defect.
      expect(approved.backgroundColor, 'the pill must be painted, not transparent').to.not.equal('rgba(0, 0, 0, 0)');
    });

    cy.get('tr.irr-data-row').eq(2).find('td').eq(3).find('span').then($pill => {
      const doc = $pill[0].ownerDocument;
      const computed = getComputedStyle($pill[0]);
      const notStarted = {
        text: $pill.text().trim(),
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        expectedColor: resolveToken(doc, '--pr-status-not-started-fg', 'color'),
        expectedBackground: resolveToken(doc, '--pr-status-not-started-bg', 'backgroundColor')
      };
      MEASURED.pillNotStarted = notStarted;

      expect(notStarted.text, 'the unknown-status row').to.equal('Something new');
      expect(notStarted.color, 'unknown status falls back to --pr-status-not-started-fg').to.equal(notStarted.expectedColor);
      expect(notStarted.backgroundColor, 'and to its OWN background — never a recombined pair').to.equal(notStarted.expectedBackground);
    });
  });

  it('marks the table up as a table and reflects aria-sort after a header click (IRR-R-6, IRR-R-10)', () => {
    cy.viewport(1440, 900);
    mountDrawer('results');

    cy.get('aside.pr-drawer th[scope="col"]').should('have.length', 7);

    // Nothing is sorted until a header is clicked, so aria-sort must be absent first.
    // `should('not.have.attr')` yields the ATTRIBUTE, not the element, so the click gets its own
    // command rather than chaining off the assertion.
    cy.get('aside.pr-drawer th.irr-th').contains('Contribution').should('not.have.attr', 'aria-sort');
    cy.get('aside.pr-drawer th.irr-th').contains('Contribution').click();

    cy.get('aside.pr-drawer th.irr-th')
      .contains('Contribution')
      .then($th => {
        const ariaSort = $th.attr('aria-sort');
        const headers = Cypress.$('aside.pr-drawer th[scope="col"]').length;
        MEASURED.sorting = { scopeColHeaders: headers, ariaSortAfterClick: ariaSort ?? null };
        expect(ariaSort, 'aria-sort after the first click on Contribution').to.equal('ascending');
      });

    // Ascending by contribution puts the smallest first — the attribute is not just decoration.
    cy.get('tr.irr-data-row').eq(0).find('td').eq(0).should('have.text', '#8702');
  });
});
