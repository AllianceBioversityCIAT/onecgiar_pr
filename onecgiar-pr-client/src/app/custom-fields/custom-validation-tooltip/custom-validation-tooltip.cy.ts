import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-custom-validation-tooltip> before the signals refactor.
 * Purely presentational — renders the invalid-URL hint.
 */
describe('CustomValidationTooltipComponent (CT)', () => {
  it('renders the validation message', () => {
    mountCF(`<app-custom-validation-tooltip></app-custom-validation-tooltip>`);
    cy.get('.custom_validation_tooltip .text').should('contain.text', 'Please enter a valid URL');
  });
});
