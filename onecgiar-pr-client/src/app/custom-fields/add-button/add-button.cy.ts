import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-add-button> before the signals refactor.
 * Captures: renders the name, emits on click, does not emit while disabled.
 */
describe('AddButtonComponent (CT)', () => {
  const TEMPLATE = `
    <app-add-button [name]="name" [disabled]="disabled" (clickEvent)="onClick()"></app-add-button>`;

  const mount = (disabled = false) => {
    const onClick = cy.stub().as('click');
    return mountCF(TEMPLATE, { componentProperties: { name: 'Add partner', disabled, onClick } });
  };

  it('renders the name', () => {
    mount();
    cy.get('.name').should('contain.text', 'Add partner');
  });

  it('emits clickEvent when clicked', () => {
    mount();
    cy.get('.add_button_content').click();
    cy.get('@click').should('have.been.called');
  });

  it('does not emit when disabled', () => {
    mount(true);
    // `.disabled` sets pointer-events:none, so force the click past the actionability check.
    cy.get('.add_button_content').should('have.class', 'disabled').click({ force: true });
    cy.get('@click').should('not.have.been.called');
  });
});
