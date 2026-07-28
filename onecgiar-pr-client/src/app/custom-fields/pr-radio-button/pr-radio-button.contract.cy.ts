import { mountCF, mountCFHost, patchHost, sharedFieldContracts } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for <app-pr-radio-button> (39 consumer screens).
 *
 * Source of truth = `master` (`git show master:.../pr-radio-button.component.{ts,html}`).
 * The component CLASS is byte-identical on both branches; only the template changed
 * (`p-radioButton` -> native `<input type="radio" class="pr-native-radio">`), so `master`'s
 * observable behaviour is the contract verbatim:
 *
 *  - `onSelect(clicked)` emits `selectOptionEvent`, and if `value === clicked` it CLEARS the
 *    value to `null` -> "re-clicking the selected option deselects it" is REAL, documented
 *    behaviour, not an artefact of the old test. Verified on master (same `onSelect` body).
 *  - the root is `<div class="pr-field" [ngClass]="{ mandatory: required, complete: value !== null
 *    && value !== undefined }">` on BOTH branches -> the DataControlService DOM scan contract holds.
 *  - read-only does NOT remove the control on master either: it DISABLES it
 *    (`[disabled]="(readOnly || disabled || rolesSE.readOnly) && !isStatic"`) and adds
 *    `.block-field`. So the "no operable control while read-only" contract is expressed as
 *    "no ENABLED radio", which is faithful to master rather than to a hidden-DOM assumption.
 */
describe('PrRadioButtonComponent — contract', () => {
  const OPTIONS = [
    { id: 1, name: 'Option A' },
    { id: 2, name: 'Option B' },
    { id: 3, name: 'Option C' }
  ];

  const RADIO = 'input.pr-native-radio';
  /** Only an ENABLED radio is an operable control (master disables rather than removes). */
  const OPERABLE_RADIO = `${RADIO}:not([disabled])`;

  const tpl = (extra: string) => `
    <app-pr-radio-button
      label="Pick one"
      [options]="options"
      optionValue="id"
      optionLabel="name"
      ${extra}
      (selectOptionEvent)="onSelect()"
      [(ngModel)]="model">
    </app-pr-radio-button>`;

  const props = (model: number | null) => ({ options: OPTIONS, model, onSelect: () => undefined });

  /* --------------------------------------------------------------- *
   * Shared contracts (read-only gate + .pr-field mandatory/complete)
   * --------------------------------------------------------------- */
  sharedFieldContracts({
    emptyRequired: { template: tpl('[required]="true"'), componentProperties: props(null) },
    filledRequired: { template: tpl('[required]="true"'), componentProperties: props(2) },
    optional: { template: tpl('[required]="false"'), componentProperties: props(null) },
    controlSelector: OPERABLE_RADIO,
    rootSelector: '.pr-field'
  });

  /* --------------------------------------------------------------- *
   * Model contract (spec: "Single-value fields honour the same model contract")
   * --------------------------------------------------------------- */

  it('[contract] user selection propagates the optionValue to the model and emits exactly once', () => {
    const onSelect = cy.stub().as('select');
    mountCFHost(tpl('[required]="true"'), { componentProperties: { ...props(null), onSelect }, editable: true }).then(w => {
      cy.get(RADIO).eq(1).click();
      cy.get(RADIO).eq(1).should('be.checked');
      cy.wrap(null).then(() => {
        expect((w.component as any).model, 'bound model').to.equal(2);
        expect(onSelect.callCount, 'selectOptionEvent emissions').to.equal(1);
      });
    });
  });

  it('[contract] selection is EXCLUSIVE — choosing another option unchecks the previous one', () => {
    mountCFHost(tpl('[required]="true"'), { componentProperties: props(1), editable: true }).then(w => {
      cy.get(RADIO).eq(0).should('be.checked');
      cy.get(RADIO).eq(2).click();
      cy.get(RADIO).eq(2).should('be.checked');
      cy.get(RADIO).eq(0).should('not.be.checked');
      cy.get(RADIO).eq(1).should('not.be.checked');
      cy.wrap(null).then(() => expect((w.component as any).model, 'bound model').to.equal(3));
    });
  });

  it('[contract] re-clicking the SELECTED option clears the model (master onSelect behaviour)', () => {
    mountCFHost(tpl('[required]="true"'), { componentProperties: props(2), editable: true }).then(w => {
      cy.get(RADIO).eq(1).should('be.checked');
      cy.get(RADIO).eq(1).click();
      cy.get(RADIO).eq(1).should('not.be.checked');
      cy.wrap(null).then(() => expect((w.component as any).model, 'bound model').to.equal(null));
    });
  });

  it('[contract] a pre-existing model value renders checked on mount', () => {
    mountCF(tpl('[required]="true"'), { componentProperties: props(3), editable: true });
    cy.get(RADIO).eq(2).should('be.checked');
    cy.get(RADIO).eq(0).should('not.be.checked');
  });

  it('[contract] a programmatic model change updates the control without interaction', () => {
    mountCFHost(tpl('[required]="true"'), { componentProperties: props(null), editable: true });
    cy.get(RADIO).eq(2).should('not.be.checked');
    patchHost(host => (host.model = 3));
    cy.get(RADIO).eq(2).should('be.checked');
  });

  it('[contract] setting the model to null leaves every radio unchecked', () => {
    mountCFHost(tpl('[required]="true"'), { componentProperties: props(2), editable: true });
    cy.get(RADIO).eq(1).should('be.checked');
    patchHost(host => (host.model = null));
    cy.get(RADIO).should('not.be.checked');
  });

  it('[contract] the mandatory/complete marker follows the model, not only the initial render', () => {
    mountCFHost(tpl('[required]="true"'), { componentProperties: props(null), editable: true });
    cy.get('.pr-field.mandatory').should('not.have.class', 'complete');
    patchHost(host => (host.model = 1));
    cy.get('.pr-field.mandatory').should('have.class', 'complete');
  });

  /* --------------------------------------------------------------- *
   * Read-only gate (RolesService.readOnly defaults to TRUE)
   * --------------------------------------------------------------- */

  it('[contract] read-only still SHOWS the selected value', () => {
    mountCF(tpl('[required]="true"'), { componentProperties: props(2) });
    cy.get(RADIO).should('have.length', 3);
    cy.get(RADIO).eq(1).should('be.checked');
  });

  it('[contract] read-only rejects interaction — the model is untouched', () => {
    mountCFHost(tpl('[required]="true"'), { componentProperties: props(2) }).then(w => {
      cy.get(RADIO).eq(0).click({ force: true });
      cy.wait(150);
      cy.wrap(null).then(() => expect((w.component as any).model, 'bound model').to.equal(2));
    });
  });

  it('[contract] [isStatic] renders the value and keeps the control operable independently of the role gate', () => {
    // 7 consumers mount fields with [isStatic]="true"; it bypasses the readOnly disable.
    mountCF(tpl('[required]="true" [isStatic]="true"'), { componentProperties: props(2) });
    cy.get(OPERABLE_RADIO).should('have.length', 3);
    cy.get(RADIO).eq(1).should('be.checked');
  });

  /* --------------------------------------------------------------- *
   * Labels
   * --------------------------------------------------------------- */

  it('[contract] every option renders its optionLabel text', () => {
    mountCF(tpl('[required]="true"'), { componentProperties: props(null), editable: true });
    cy.get('.radioButton .name').should('have.length', 3);
    cy.contains('.radioButton .name', 'Option A').should('exist');
    cy.contains('.radioButton .name', 'Option C').should('exist');
  });

  it('[contract] [hideOptions] hides the option list', () => {
    mountCF(tpl('[required]="true" [hideOptions]="true"'), { componentProperties: props(null), editable: true });
    cy.get('.radioButtonList').should('not.be.visible');
  });
});
