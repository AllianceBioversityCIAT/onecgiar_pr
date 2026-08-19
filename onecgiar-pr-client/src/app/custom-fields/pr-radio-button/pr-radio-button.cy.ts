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

  /**
   * P2-3342 regression, found while validating the Other Output flow (P2-3321).
   *
   * Several radio groups share one screen — the five Impact Area scores in General information.
   * The ids used to be `radio_<index>` on every instance, so `label[for]` resolved to the FIRST
   * matching input in the document, and clicking an option's TEXT in a later group selected that
   * option in the first group instead.
   */
  describe('multiple groups on the same screen (P2-3342)', () => {
    const TWO_GROUPS = `
      <app-pr-radio-button
        label="First group"
        [options]="options"
        optionValue="id"
        optionLabel="name"
        [isStatic]="true"
        [(ngModel)]="modelA">
      </app-pr-radio-button>
      <app-pr-radio-button
        label="Second group"
        [options]="options"
        optionValue="id"
        optionLabel="name"
        [isStatic]="true"
        [(ngModel)]="modelB">
      </app-pr-radio-button>`;

    const mountTwo = () =>
      mountCF(TWO_GROUPS, { componentProperties: { options: OPTIONS, modelA: null, modelB: null } });

    it('gives every radio a document-unique id', () => {
      mountTwo();
      cy.get(RADIO).should('have.length', 6);
      cy.get(RADIO).then($radios => {
        const ids = [...$radios].map(r => r.id);
        expect(ids.filter(Boolean), 'every radio has an id').to.have.length(6);
        expect(new Set(ids).size, `ids must be unique, got ${ids.join(', ')}`).to.equal(6);
      });
    });

    it('each label points at a radio inside its own group', () => {
      mountTwo();
      cy.get('app-pr-radio-button').each($group => {
        cy.wrap($group).within(() => {
          cy.get('label').each($label => {
            const target = $label.attr('for');
            cy.wrap($group).find(`#${target}`).should('have.length', 1);
          });
        });
      });
    });

    it('clicking an option label in the second group updates only the second model', () => {
      mountTwo().then(w => {
        cy.get('app-pr-radio-button')
          .eq(1)
          .within(() => cy.contains('label.name', 'Option C').click({ force: true }));
        cy.wrap(null).then(() => {
          expect((w.component as any).modelB, 'second group took the click').to.equal(3);
          expect((w.component as any).modelA, 'first group was not touched').to.equal(null);
        });
      });
    });
  });
});
