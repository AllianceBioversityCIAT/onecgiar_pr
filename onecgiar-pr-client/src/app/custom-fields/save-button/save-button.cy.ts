import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-save-button> before the signals refactor.
 * Captures: renders (when editable), emits clickSave on click, does not emit while disabled.
 */
describe('SaveButtonComponent (CT)', () => {
  const TEMPLATE = `
    <app-save-button [editable]="true" [text]="text" [disabled]="disabled" (clickSave)="onSave()"></app-save-button>`;

  const mount = (disabled = false) => {
    const onSave = cy.stub().as('save');
    return mountCF(TEMPLATE, { componentProperties: { text: 'Save', disabled, onSave } });
  };

  it('renders the save button with its text', () => {
    mount();
    cy.get('app-pr-button .text').should('contain.text', 'Save');
  });

  it('emits clickSave when clicked', () => {
    mount();
    cy.get('app-pr-button').click();
    cy.get('@save').should('have.been.called');
  });

  it('does not emit when disabled', () => {
    mount(true);
    // The inner pr-button gets `pointer-events: none` when disabled — click the wrapper div
    // that owns the save handler (same path a user would hit on the fixed bar).
    cy.get('app-save-button .fixed_button > div').last().click({ force: true });
    cy.get('@save').should('not.have.been.called');
  });
});
