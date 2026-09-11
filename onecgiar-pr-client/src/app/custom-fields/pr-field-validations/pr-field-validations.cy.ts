import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-pr-field-validations> before the signals refactor.
 * Currently an empty placeholder component — just verify it mounts without error.
 */
describe('PrFieldValidationsComponent (CT)', () => {
  it('mounts', () => {
    mountCF(`<app-pr-field-validations></app-pr-field-validations>`);
    cy.get('app-pr-field-validations').should('exist');
  });
});
