import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-pr-checkbox> before the signals refactor.
 * Captures: label renders, checkbox toggles the bound model and emits selectOptionEvent.
 */
describe('PrCheckboxComponent (CT)', () => {
  const TEMPLATE = `
    <app-pr-checkbox
      label="I agree"
      [isStatic]="true"
      (selectOptionEvent)="onSelect()"
      [(ngModel)]="model">
    </app-pr-checkbox>`;

  const mount = (model: boolean) => {
    const onSelect = cy.stub().as('select');
    return mountCF(TEMPLATE, { componentProperties: { model, onSelect } });
  };

  it('renders the label', () => {
    mount(false);
    cy.get('.label').should('contain.text', 'I agree');
  });

  it('checking it sets the model to true and emits', () => {
    mount(false).then(w => {
      cy.get('p-checkbox input').check({ force: true });
      cy.get('@select').should('have.been.called');
      cy.wrap(null).then(() => expect((w.component as any).model).to.equal(true));
    });
  });

  it('reflects a pre-checked bound value', () => {
    mount(true);
    cy.get('p-checkbox input').should('be.checked');
  });
});
