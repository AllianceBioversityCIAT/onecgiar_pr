import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-pr-yes-or-not> before the signals refactor.
 * Captures: Yes/No clicks set the boolean value, emit the event, and highlight the choice.
 */
describe('PrYesOrNotComponent (CT)', () => {
  const TEMPLATE = `
    <app-pr-yes-or-not
      label="Confirm?"
      [editable]="true"
      (selectOptionEvent)="onSelect($event)"
      [(ngModel)]="model">
    </app-pr-yes-or-not>`;

  const mount = (model: boolean | null) => {
    const onSelect = cy.stub().as('select');
    return mountCF(TEMPLATE, { componentProperties: { model, onSelect } });
  };

  it('renders both choices', () => {
    mount(null);
    cy.contains('.choice', 'Yes').should('exist');
    cy.contains('.choice', 'No').should('exist');
  });

  it('clicking Yes sets the value to true and emits true', () => {
    mount(null).then(w => {
      cy.contains('.choice', 'Yes').click();
      cy.get('@select').should('have.been.calledWith', true);
      cy.contains('.choice', 'Yes').should('have.class', 'yes');
      cy.wrap(null).then(() => expect((w.component as any).model).to.equal(true));
    });
  });

  it('clicking No sets the value to false and emits false', () => {
    mount(true).then(w => {
      cy.contains('.choice', 'No').click();
      cy.get('@select').should('have.been.calledWith', false);
      cy.contains('.choice', 'No').should('have.class', 'no');
      cy.wrap(null).then(() => expect((w.component as any).model).to.equal(false));
    });
  });
});
