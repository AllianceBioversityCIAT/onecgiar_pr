import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-alert-status> before the signals refactor.
 * Captures: status class, mapped icon, and description rendering.
 */
describe('AlertStatusComponent (CT)', () => {
  it('renders the info status with its icon by default', () => {
    mountCF(`<app-alert-status description="Heads up"></app-alert-status>`);
    cy.get('.pr_alert').should('have.class', 'info');
    cy.get('.alert_badge i').should('contain.text', 'info');
    cy.get('.alert_text').should('contain.text', 'Heads up');
  });

  it('maps the warning status to the warning icon', () => {
    mountCF(`<app-alert-status status="warning" description="Careful"></app-alert-status>`);
    cy.get('.pr_alert').should('have.class', 'warning');
    cy.get('.alert_badge i').should('contain.text', 'warning');
  });

  it('maps the success status to the check icon', () => {
    mountCF(`<app-alert-status status="success" description="Done"></app-alert-status>`);
    cy.get('.alert_badge i').should('contain.text', 'check');
  });
});
