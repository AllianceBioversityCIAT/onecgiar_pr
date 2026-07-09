import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-pr-range-level> before the signals refactor.
 * Captures: renders one circle per option, clicking selects (value + emit + active class),
 * and disabled blocks selection.
 */
describe('PrRangeLevelComponent (CT)', () => {
  const OPTIONS = [
    { level: 0, name: 'None' },
    { level: 1, name: 'Low' },
    { level: 2, name: 'Mid' },
    { level: 3, name: 'High' }
  ];

  const TEMPLATE = `
    <app-pr-range-level
      [options]="options"
      optionValue="level"
      optionLabel="name"
      [disabled]="disabled"
      (selectOptionEvent)="onSelect($event)">
    </app-pr-range-level>`;

  const mount = (disabled = false) => {
    const onSelect = cy.stub().as('select');
    return mountCF(TEMPLATE, { editable: true, componentProperties: { options: OPTIONS, disabled, onSelect } });
  };

  it('renders one circle per option', () => {
    mount();
    cy.get('.circle').should('have.length', OPTIONS.length);
  });

  it('clicking a level selects it and emits its value', () => {
    mount();
    cy.get('.circle').eq(2).click().should('have.class', 'active');
    cy.get('@select').should('have.been.calledWith', 2);
  });

  it('does not select when disabled', () => {
    mount(true);
    cy.get('.circle').eq(1).click();
    cy.get('@select').should('not.have.been.called');
  });
});
