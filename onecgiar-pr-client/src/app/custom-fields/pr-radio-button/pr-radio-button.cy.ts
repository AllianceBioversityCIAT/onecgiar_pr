import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-pr-radio-button> before the signals refactor.
 * Captures: renders options, selecting updates model + emits, re-clicking deselects.
 */
describe('PrRadioButtonComponent (CT)', () => {
  const OPTIONS = [
    { id: 1, name: 'Option A' },
    { id: 2, name: 'Option B' },
    { id: 3, name: 'Option C' }
  ];

  const TEMPLATE = `
    <app-pr-radio-button
      label="Pick one"
      [options]="options"
      optionValue="id"
      optionLabel="name"
      [isStatic]="true"
      (selectOptionEvent)="onSelect()"
      [(ngModel)]="model">
    </app-pr-radio-button>`;

  const mount = (model: number | null) => {
    const onSelect = cy.stub().as('select');
    return mountCF(TEMPLATE, { componentProperties: { options: OPTIONS, model, onSelect } });
  };

  it('renders one radio per option', () => {
    mount(null);
    cy.get('p-radioButton').should('have.length', 3);
    cy.contains('.name', 'Option B').should('exist');
  });

  it('picking an option updates the bound model', () => {
    // PrimeNG radio: drive the native input (host click alone does not always sync ngModel in CT).
    mount(null).then(w => {
      cy.get('p-radioButton input').eq(1).check({ force: true });
      cy.wrap(null).then(() => expect((w.component as any).model).to.equal(2));
    });
  });

  it('emits selectOptionEvent when a radio is clicked', () => {
    // selectOptionEvent is wired to the p-radioButton (click) host.
    mount(null);
    cy.get('p-radioButton').eq(1).click();
    cy.get('@select').should('have.been.called');
  });

  it('re-clicking the selected option deselects it', () => {
    mount(1).then(w => {
      cy.get('p-radioButton').eq(0).click();
      cy.wrap(null).then(() => expect((w.component as any).model).to.equal(null));
    });
  });
});
