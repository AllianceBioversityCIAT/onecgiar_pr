import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-edit-or-delete-item-button> before the signals refactor.
 * Purely presentational — just verify it renders its delete affordance.
 */
describe('EditOrDeleteItemButtonComponent (CT)', () => {
  it('renders the delete icon', () => {
    mountCF(`<app-edit-or-delete-item-button></app-edit-or-delete-item-button>`);
    cy.get('.eod_button').should('exist');
    cy.get('.eod_button i').should('contain.text', 'delete');
  });
});
