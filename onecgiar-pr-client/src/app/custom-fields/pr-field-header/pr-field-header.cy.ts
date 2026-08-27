import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-pr-field-header> before the signals refactor.
 * Captures: label (with/without colon), required styling, and description rendering.
 */
describe('PrFieldHeaderComponent (CT)', () => {
  it('renders the label with a trailing colon by default and the required style', () => {
    mountCF(`<app-pr-field-header label="Title" [required]="true"></app-pr-field-header>`);
    cy.get('.pr_label').should('contain.text', 'Title:').and('have.class', 'required');
  });

  it('omits the colon when useColon is false', () => {
    mountCF(`<app-pr-field-header label="Title" [useColon]="false"></app-pr-field-header>`);
    cy.get('.pr_label').should('have.text', 'Title');
  });

  it('renders the description', () => {
    mountCF(`<app-pr-field-header description="Some help text"></app-pr-field-header>`);
    cy.get('.pr_description').should('contain.text', 'Some help text');
  });
});
