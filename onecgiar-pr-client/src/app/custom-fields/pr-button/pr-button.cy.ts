import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-pr-button> before the signals refactor.
 * Captures: renders text/icon, emits clickEvent on click, and does not emit while disabled.
 */
describe('PrButtonComponent (CT)', () => {
  const TEMPLATE = `
    <app-pr-button
      [text]="text"
      icon="save"
      [disabled]="disabled"
      (clickEvent)="onClick()">
    </app-pr-button>`;

  const mount = (disabled = false) => {
    const onClick = cy.stub().as('click');
    return mountCF(TEMPLATE, { componentProperties: { text: 'Save', disabled, onClick } });
  };

  it('renders the text and icon', () => {
    mount();
    cy.get('.pr_button .text').should('contain.text', 'Save');
    cy.get('.pr_button i').should('contain.text', 'save');
  });

  it('emits clickEvent when clicked', () => {
    mount();
    cy.get('.pr_button').click();
    cy.get('@click').should('have.been.called');
  });

  it('does not emit when disabled', () => {
    mount(true);
    cy.get('.pr_button').should('have.class', 'b-disabled').click();
    cy.get('@click').should('not.have.been.called');
  });
});
