import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-no-data-text> before the signals refactor.
 * Purely presentational — renders the provided title.
 */
describe('NoDataTextComponent (CT)', () => {
  it('renders the title', () => {
    mountCF(`<app-no-data-text title="Nothing here yet"></app-no-data-text>`);
    cy.get('.no_data_text').should('contain.text', 'Nothing here yet');
  });
});
