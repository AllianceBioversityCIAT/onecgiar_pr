import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-detail-section-title> before the signals refactor.
 * Captures: renders the section name (also sets document title / current section on init).
 */
describe('DetailSectionTitleComponent (CT)', () => {
  it('renders the section name', () => {
    mountCF(`<app-detail-section-title sectionName="General Information"></app-detail-section-title>`);
    cy.get('.section_detail_title').should('contain.text', 'General Information');
  });
});
