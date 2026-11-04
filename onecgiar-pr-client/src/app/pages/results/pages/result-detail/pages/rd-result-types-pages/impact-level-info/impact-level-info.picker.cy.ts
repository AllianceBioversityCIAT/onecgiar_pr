// @akili-spec results/impact-results-reporting/impact-previous-results-dropdown (IPD-T-3, IPD-NFR-1/NFR-2/NFR-3, Sc 1.3)
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
import { PreviousResultsPickerComponent } from './components/previous-results-picker/previous-results-picker.component';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../../shared/services/global/roles.service';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { BeforeUnloadWarningDirective } from '../../../../../../../shared/directives/before-unload-warning.directive';

/**
 * IPD-T-3 — page + inline previous-results dropdown at 1280 and 900 px, driven with REAL key presses (cypress-real-events).
 * The API is stubbed; the picker and the page are the real components.
 */
const LONG_TITLE =
  'A deliberately very long previously reported result title that keeps going and going so that wrapping, not horizontal scrolling, is what the panel has to do at narrow widths';

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
    imports: [CommonModule, FormsModule, CustomFieldsModule, BeforeUnloadWarningDirective, HlmButton, PreviousResultsPickerComponent, HttpClientTestingModule, NoopAnimationsModule],
    providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
  }).then(wrapper => {
    wrapper.fixture.debugElement.injector.get(RolesService).readOnly = false;
    wrapper.fixture.detectChanges();
  });
  cy.get('[data-cy="impact-picker-field"]').should('exist');
}

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

const field = () => cy.get('[data-cy="impact-picker-field"]');
const panel = () => cy.get('[data-cy="impact-picker-panel"]');

/** Opens the panel with a real Enter on the focused field. */
const openWithEnter = () => {
  tabUntil('[data-cy="impact-picker-field"]', 24); // real Tab, not .focus()
  cy.realPress('Enter');
  panel().should('be.visible');
  cy.get('[data-cy="impact-picker-item"]').should('have.length', 3);
  field().should('have.attr', 'aria-expanded', 'true');
};

/** Describes every element whose right edge passes the viewport's clientWidth (the culprit list in a failure message). */
function overflowingElements(doc: Document): string[] {
  const limit = doc.documentElement.clientWidth;
  return Array.from(doc.body.querySelectorAll('*'))
    .map(el => ({ el, right: el.getBoundingClientRect().right }))
    .filter(({ right }) => right > limit + 0.5)
    .slice(0, 6)
    .map(({ el, right }) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} right=${Math.round(right)} (limit ${limit})`);
}

/**
 * IPD-NFR-3: no horizontal page scroll. Waits for the panel to settle (transitions, late fonts/icons), then checks every box that could
 * scroll sideways (html, scrollingElement, body, the CT root); a failure names the descendants that pass the viewport.
 */
const noHorizontalOverflow = (label: string) => {
  cy.wait(400);
  cy.document().then(doc => {
    const culprits = overflowingElements(doc).join(' | ');
    const boxes: Array<[string, Element | null]> = [
      ['documentElement', doc.documentElement],
      ['scrollingElement', doc.scrollingElement],
      ['body', doc.body],
      ['[data-cy-root]', doc.querySelector('[data-cy-root]')]
    ];
    boxes.forEach(([name, el]) => {
      expect(el, name).not.to.equal(null);
      expect(el!.scrollWidth, `${label}: ${name} scrollWidth <= clientWidth; overflowing: ${culprits || 'none'}`).to.be.at.most(el!.clientWidth);
    });
    expect(culprits, `${label}: no element past the viewport`).to.equal('');
  });
};

[1280, 900].forEach(width => {
  describe(`Impact previous-results dropdown at ${width}px (IPD-T-3)`, () => {
    beforeEach(() => cy.viewport(width, 800));

    it('KEYBOARD ONLY: Enter opens, Space toggles a chip, Space selects a row, Escape closes and focus returns to the field', () => {
      mountPage();
      noHorizontalOverflow('closed');
      openWithEnter();

      // Tab to a typology chip and press Space: aria-pressed flips and E5 is re-queried with that type.
      tabUntil('[data-cy="impact-picker-type"]');
      cy.focused().should('have.attr', 'aria-pressed', 'false');
      cy.realPress('Space');
      cy.focused().should('have.attr', 'aria-pressed', 'true');
      cy.wrap(null).should(() => expect(searchCalls[searchCalls.length - 1].typeIds).to.deep.equal([9]));
      cy.realPress('Space');
      cy.focused().should('have.attr', 'aria-pressed', 'false');

      // Tab to an unselected row checkbox and press Space: the row is selected (count 1 -> 2).
      cy.get('[data-cy="impact-picker-count"]').should('contain.text', '1 results selected');
      tabUntil('[data-cy="impact-picker-check"]:not(:checked)', 12);
      cy.realPress('Space');
      cy.get('[data-cy="impact-picker-count"]').should('contain.text', '2 results selected');

      // Panel stays open and nothing overflows while it is open.
      panel().should('be.visible');
      noHorizontalOverflow('open');
      panel().then($p => expect($p[0].scrollWidth, 'panel scrollWidth <= clientWidth').to.be.at.most($p[0].clientWidth));
      cy.get('[data-cy="impact-picker-results"]').then($l => expect($l[0].scrollWidth, 'results scrollWidth').to.be.at.most($l[0].clientWidth));

      // Escape closes the panel; focus is on the field, not <body>.
      cy.realPress('Escape');
      cy.get('[data-cy="impact-picker-panel"]').should('not.exist');
      cy.focused().should('have.attr', 'data-cy', 'impact-picker-field');
      cy.get('[data-cy="impact-selected-title"]').should('contain.text', 'Results selected (2)'); // Escape keeps the selection
      cy.document().then(doc => {
        expect(doc.activeElement, 'activeElement is not <body>').not.to.equal(doc.body);
        expect(doc.activeElement?.getAttribute('data-cy')).to.equal('impact-picker-field');
      });
      field().should('have.attr', 'aria-expanded', 'false');
      noHorizontalOverflow('after close');
    });

    it('Escape from the search box also closes the panel and returns focus to the field', () => {
      mountPage();
      openWithEnter();
      tabUntil('[data-cy="impact-picker-search"]');
      cy.realPress('Escape');
      cy.get('[data-cy="impact-picker-panel"]').should('not.exist');
      cy.focused().should('have.attr', 'data-cy', 'impact-picker-field');
    });

    it('has no horizontal overflow with the panel open and a very long title', () => {
      mountPage();
      openWithEnter();
      cy.contains('[data-cy="impact-picker-item"]', 'deliberately very long').should('be.visible');
      noHorizontalOverflow('open, long title');
      panel().then($p => expect($p[0].getBoundingClientRect().right, 'panel right edge inside the viewport').to.be.at.most(width));
    });

    if (width === 1280) {
      it('captures the open dropdown for the visual parity review', () => {
        // 1280x720 = the Electron window of `cypress run`: a taller viewport is scaled by Cypress, and the scaled capture shows a
        // phantom horizontal scrollbar even on a plain 100%-width page (proved with a throwaway spec). The real overflow is asserted below.
        cy.viewport(1280, 720);
        mountPage();
        openWithEnter();
        noHorizontalOverflow('screenshot state');
        cy.screenshot('ipd-impact-dropdown-1280', {
          capture: 'viewport',
          overwrite: true,
          // the state Cypress captures: re-assert right before the shot, with the numbers in the message
          onBeforeScreenshot: () => {
            const doc = Cypress.$('html')[0].ownerDocument;
            const root = doc.documentElement;
            expect(root.scrollWidth, `capture state: html scrollWidth <= clientWidth; overflowing: ${overflowingElements(doc).join(' | ') || 'none'}`).to.be.at.most(root.clientWidth);
          }
        });
        // whole panel (rows, Load more, footer) regardless of the fold
        panel().scrollIntoView();
        panel().screenshot('ipd-impact-dropdown-panel-1280', { overwrite: true });
      });
    }
  });
});
