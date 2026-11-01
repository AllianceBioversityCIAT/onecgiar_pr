// @akili-spec results/impact-results-reporting/result-detail-impact (IRD-T-4, IRD-NFR-1/NFR-2)
/// <reference types="cypress-real-events" />
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HlmButton } from '@spartan/button';
import { ImpactLevelInfoComponent } from './impact-level-info.component';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../../shared/services/global/roles.service';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { BeforeUnloadWarningDirective } from '../../../../../../../shared/directives/before-unload-warning.directive';

/**
 * IRD-T-4 — page + previous-results picker (real `hlm-dialog` / CDK overlay) at 1280 and 900 px.
 * The API is stubbed; the picker, the page and the CDK dialog are the real components.
 */
const LONG_TITLE =
  'A deliberately very long previously reported result title that keeps going and going so that wrapping, not horizontal scrolling, is what the dialog has to do at narrow widths';

const prev = (id: number, title = `Result ${id}`) => ({
  result_id: id,
  result_code: id + 1000,
  title,
  result_type_name: 'Policy change',
  phase_name: 'Reporting 2025',
  portfolio_acronym: 'P25',
  status_name: 'Submitted'
});

const SEARCH_ITEMS = [prev(1), prev(2, LONG_TITLE), prev(3)];

/** Every E5 call the stub received, in order (reset on each mount). */
let searchCalls: any[] = [];

function mountPage() {
  searchCalls = [];
  const resultsSE = {
    currentResultId: 77,
    GET_impactStudyTypes: () => of({ response: [{ id: 1, name: 'Learning study', definition: 'Learning definition' }] }),
    GET_impactLevelInfo: () =>
      of({ response: { impact_study_type_id: 1, cgiar_contribution: 'Saved', previously_reported: true, previous_results: [prev(1)] } }),
    PATCH_impactLevelInfo: () => of({ response: {} }),
    GET_impactPreviousResultsSearch: (params: any) => {
      searchCalls.push({ ...params });
      return of({ response: { items: SEARCH_ITEMS, meta: { total: 3, page: 1, limit: 20, totalPages: 1 } } });
    },
    GET_versioning: () =>
      of({
        response: [
          { id: 5, phase_name: 'Reporting 2025', phase_name_status: 'Reporting 2025 - (Open)', obj_portfolio: { id: 3, acronym: 'P25' } },
          { id: 4, phase_name: 'Reporting 2024', phase_name_status: 'Reporting 2024 - (Closed)', obj_portfolio: { id: 2, acronym: 'P22' } }
        ]
      }),
    GET_resultTypes: () =>
      of({
        response: [
          { id: 9, name: 'Impact contribution' },
          { id: 2, name: 'Innovation use' }
        ]
      })
  };
  const api = {
    resultsSE,
    alertsFe: { show: () => {} },
    rolesSE: { readOnly: false },
    dataControlSE: { currentResultSectionName: signal(''), currentResultSignal: signal<any>({}) }
  };
  cy.mount(ImpactLevelInfoComponent, {
    imports: [CommonModule, FormsModule, CustomFieldsModule, BeforeUnloadWarningDirective, HlmButton, HttpClientTestingModule, NoopAnimationsModule],
    providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
  }).then(wrapper => {
    wrapper.fixture.debugElement.injector.get(RolesService).readOnly = false;
    wrapper.fixture.detectChanges();
  });
  cy.get('[data-cy="impact-add-results"]').should('exist');
}

const addButton = () => cy.get('[data-cy="impact-add-results"]');
const picker = () => cy.get('.cdk-dialog-container [data-cy="impact-picker"]');
const openPicker = () => {
  addButton().click();
  picker().should('be.visible');
  cy.get('[data-cy="impact-picker-item"]').should('have.length', 3);
  cy.wait(250); // past HlmDialogContent's own entry transition before any geometry read
};

/** Real Tab presses (CDP, not synthetic) until the focused element matches `selector`; fails after `max` presses. */
function tabUntil(selector: string, max = 8): void {
  // `document.activeElement` (not `cy.focused()`): the shared filter-select blurs to <body> after a pick, and
  // `cy.focused()` fails outright when nothing is focused.
  const step = (left: number): void => {
    cy.document().then(doc => {
      if (doc.activeElement && Cypress.$(doc.activeElement).is(selector)) return;
      expect(left, `Tab presses left before reaching ${selector}`).to.be.greaterThan(0);
      cy.realPress('Tab');
      step(left - 1);
    });
  };
  step(max);
}

[1280, 900].forEach(width => {
  describe(`Impact level info + previous-results picker at ${width}px (IRD-T-4)`, () => {
    beforeEach(() => cy.viewport(width, 800));

    it('shows no horizontal scroll on the page or in the dialog, even with a very long title', () => {
      mountPage();
      cy.document().then(doc => expect(doc.documentElement.scrollWidth, 'page scrollWidth').to.be.at.most(width));
      openPicker();
      cy.get('.cdk-dialog-container').then($container => {
        const el = $container[0];
        expect(el.scrollWidth, 'dialog scrollWidth <= clientWidth').to.be.at.most(el.clientWidth);
        expect(el.getBoundingClientRect().right, 'dialog right edge inside the viewport').to.be.at.most(width);
      });
      picker().then($root => expect($root[0].scrollWidth, 'picker scrollWidth <= clientWidth').to.be.at.most($root[0].clientWidth));
      cy.get('[data-cy="impact-picker-results"]').then($list => expect($list[0].scrollWidth, 'results scrollWidth').to.be.at.most($list[0].clientWidth));
      cy.document().then(doc => expect(doc.documentElement.scrollWidth, 'document scrollWidth with the dialog open').to.be.at.most(width));
    });

    it('is a named, modal dialog and marks the already selected result as Selected', () => {
      mountPage();
      openPicker();
      cy.get('.cdk-dialog-container[aria-labelledby]').then($c => {
        const target = document.getElementById($c.attr('aria-labelledby') as string);
        expect(target?.textContent).to.contain('Add previously reported results');
      });
      cy.get('[data-cy="impact-picker-item"]').first().find('button').should('contain.text', 'Selected').and('be.disabled');
      cy.get('[data-cy="impact-picker-item"]').eq(1).find('button').should('contain.text', 'Add').and('not.be.disabled');
    });

    it('Add + Done replaces the page list; Cancel discards; focus returns to "Add results"', () => {
      mountPage();
      cy.get('[data-cy="impact-previous-results"] li').should('have.length', 1);

      // Cancel keeps the list
      openPicker();
      cy.get('[data-cy="impact-picker-item"]').eq(2).find('[data-cy="impact-picker-add"]').click();
      cy.get('[data-cy="impact-picker-chip"]').should('have.length', 2);
      cy.get('[data-cy="impact-picker-cancel"]').click();
      cy.get('.cdk-dialog-container').should('not.exist');
      cy.get('[data-cy="impact-previous-results"] li').should('have.length', 1);
      cy.focused().should('have.attr', 'data-cy', 'impact-add-results');

      // Done commits
      openPicker();
      cy.get('[data-cy="impact-picker-item"]').eq(2).find('[data-cy="impact-picker-add"]').click();
      cy.get('[data-cy="impact-picker-done"]').click();
      cy.get('.cdk-dialog-container').should('not.exist');
      cy.get('[data-cy="impact-previous-results"] li').should('have.length', 2);
      cy.focused().should('have.attr', 'data-cy', 'impact-add-results');
    });

    it('both filters are labelled groups and the phase options carry the portfolio acronym', () => {
      mountPage();
      openPicker();
      cy.get('[data-cy="impact-picker-phase-filter"]').should('have.attr', 'role', 'group').and('have.attr', 'aria-labelledby', 'impact-picker-phase-label');
      cy.get('[data-cy="impact-picker-type-filter"]').should('have.attr', 'role', 'group').and('have.attr', 'aria-labelledby', 'impact-picker-type-label');
      cy.get('#impact-picker-phase-label').should('contain.text', 'Phase / portfolio');
      cy.get('#impact-picker-type-label').should('contain.text', 'Result type');
      cy.get('[data-cy="impact-picker-phase-filter"] .option').then($o => {
        const labels = Array.from($o).map(o => o.textContent?.trim());
        expect(labels).to.deep.equal(['All phases', 'P25 · Reporting 2025 - (Open)', 'P22 · Reporting 2024 - (Closed)']);
      });
    });

    it('KEYBOARD ONLY: search, phase, result type, Add and Done with real Tab/Enter/Space presses', () => {
      mountPage();
      openPicker();

      // 1. CDK autofocus lands on the search box; type a query (one debounced request).
      cy.focused().should('have.attr', 'data-cy', 'impact-picker-search');
      cy.realType('rice');
      cy.wrap(null).should(() => expect(searchCalls[searchCalls.length - 1].q).to.equal('rice'));

      // 2. Tab to the Phase trigger, Tab into its search box, narrow to ONE option, Enter picks it.
      cy.realPress('Tab');
      cy.focused().closest('[data-cy="impact-picker-phase-filter"]').should('exist');
      cy.realPress('Tab');
      cy.focused().should('match', 'input').closest('[data-cy="impact-picker-phase-filter"]').should('exist');
      cy.realType('2025');
      cy.realPress('Enter');
      cy.wrap(null).should(() => expect(searchCalls[searchCalls.length - 1].versionId).to.equal(5));
      cy.get('[data-cy="impact-picker-phase-filter"] .text').should('contain.text', 'P25 · Reporting 2025 - (Open)');

      // 3. Tab to the first Result-type checkbox (the picked phase option is not focusable, so Tab moves on) and press Space.
      tabUntil('[data-cy="impact-picker-type-filter"] input[type="checkbox"]');
      cy.realPress('Space');
      cy.wrap(null).should(() => {
        const last = searchCalls[searchCalls.length - 1];
        expect(last.typeIds).to.deep.equal([9]);
        expect(last.versionId).to.equal(5);
        expect(last.q).to.equal('rice');
        expect(last.page).to.equal(1);
        expect(last.excludeResultId).to.equal(77);
        expect(last.limit).to.equal(20);
      });
      cy.get('[data-cy="impact-picker-item"]').should('have.length', 3);

      // 4. Tab to an enabled Add button and press Enter.
      tabUntil('[data-cy="impact-picker-add"]');
      cy.realPress('Enter');
      cy.get('[data-cy="impact-picker-chip"]').should('have.length', 2);

      // 5. Tab to Done and press Enter: the dialog closes and the page list is replaced.
      tabUntil('[data-cy="impact-picker-done"]', 12);
      cy.realPress('Enter');
      cy.get('.cdk-dialog-container').should('not.exist');
      cy.get('[data-cy="impact-previous-results"] li').should('have.length', 2);
      cy.focused().should('have.attr', 'data-cy', 'impact-add-results');
    });

    it('Escape closes the dialog without keeping changes and focus returns to "Add results"', () => {
      mountPage();
      openPicker();
      cy.get('[data-cy="impact-picker-item"]').eq(1).find('[data-cy="impact-picker-add"]').click();
      cy.get('body').type('{esc}');
      cy.get('.cdk-dialog-container').should('not.exist');
      cy.get('[data-cy="impact-previous-results"] li').should('have.length', 1);
      cy.focused().should('have.attr', 'data-cy', 'impact-add-results');
    });
  });
});
