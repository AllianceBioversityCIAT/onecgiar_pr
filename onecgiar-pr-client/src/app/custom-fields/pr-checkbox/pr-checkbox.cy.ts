import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behaviour lock for <app-pr-checkbox>.
 * Captures: label renders, checkbox toggles the bound model and emits selectOptionEvent.
 *
 * NOTE (performance-refactor): the original selectors targeted `p-checkbox input`, the PrimeNG
 * widget this branch removed. The component now renders a NATIVE `<input type="checkbox"
 * class="pr-native-check">`. Only the selectors were updated — the assertions are unchanged and
 * match `master` (the component `.ts` is byte-identical between the two branches).
 */
describe('PrCheckboxComponent (CT)', () => {
  /** The interactive control after the Spartan migration (was `p-checkbox input`). */
  const CHECK = 'input.pr-native-check';

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
      cy.get(CHECK).check({ force: true });
      cy.get('@select').should('have.been.called');
      cy.wrap(null).then(() => expect((w.component as any).model).to.equal(true));
    });
  });

  it('reflects a pre-checked bound value', () => {
    mount(true);
    cy.get(CHECK).should('be.checked');
  });
});
