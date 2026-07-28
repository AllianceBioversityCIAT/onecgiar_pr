import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behaviour lock for <app-pr-radio-button>.
 * Captures: renders options, selecting updates model + emits, re-clicking deselects.
 *
 * NOTE (performance-refactor): the original selectors targeted `p-radioButton`, the PrimeNG
 * widget this branch removed. The component now renders a NATIVE `<input type="radio"
 * class="pr-native-radio">`. Only the selectors were updated — every assertion is unchanged,
 * and all four behaviours are the ones `master` implements (`onSelect` is byte-identical
 * between branches, including the "click the selected option to clear it" branch).
 */
describe('PrRadioButtonComponent (CT)', () => {
  const OPTIONS = [
    { id: 1, name: 'Option A' },
    { id: 2, name: 'Option B' },
    { id: 3, name: 'Option C' }
  ];

  /** The interactive control after the Spartan migration (was `p-radioButton`). */
  const RADIO = 'input.pr-native-radio';

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
    cy.get(RADIO).should('have.length', 3);
    cy.contains('.name', 'Option B').should('exist');
  });

  it('picking an option updates the bound model', () => {
    mount(null).then(w => {
      cy.get(RADIO).eq(1).check({ force: true });
      cy.wrap(null).then(() => expect((w.component as any).model).to.equal(2));
    });
  });

  it('emits selectOptionEvent when a radio is clicked', () => {
    mount(null);
    cy.get(RADIO).eq(1).click({ force: true });
    cy.get('@select').should('have.been.called');
  });

  it('re-clicking the selected option deselects it', () => {
    mount(1).then(w => {
      cy.get(RADIO).eq(0).click({ force: true });
      cy.wrap(null).then(() => expect((w.component as any).model).to.equal(null));
    });
  });
});
