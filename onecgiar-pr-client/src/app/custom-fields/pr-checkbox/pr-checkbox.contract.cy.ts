import { mountCF, mountCFHost, patchHost, sharedFieldContracts } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for <app-pr-checkbox> (14 consumer screens).
 *
 * Source of truth = `master` (`git show master:.../pr-checkbox.component.{ts,html}`).
 * The component CLASS is byte-identical on both branches. The template changed from
 * `<p-checkbox [binary]="true" [value]="true" [(ngModel)]="value" (ngModelChange)="selectOptionEvent.emit()">`
 * to a native `<input type="checkbox" class="pr-native-check" [(ngModel)]="value"
 * (ngModelChange)="selectOptionEvent.emit()">` — the SAME binding shape, so master's observable
 * behaviour is the contract:
 *
 *  - toggling writes the boolean into the bound model, and `selectOptionEvent` fires once per toggle;
 *  - read-only DISABLES the control (master does the same) while the checked state stays visible.
 *
 * KNOWN CONTRACT GAP (documented, expected RED — see the report):
 * `pr-checkbox` declares `@Input() required` but its template renders NO `.pr-field` root, so it
 * never emits the `.pr-field.mandatory` / `.complete` markers that
 * `DataControlService.someMandatoryFieldIncompleteResultDetail()` scans. This is IDENTICAL on
 * `master`, i.e. a pre-existing gap, NOT a Spartan-migration regression. The spec requirement
 * ("Required fields expose the mandatory-completeness DOM contract") is asserted as written and
 * left failing rather than softened.
 */
describe('PrCheckboxComponent — contract', () => {
  const CHECK = 'input.pr-native-check';
  /** Only an ENABLED checkbox is an operable control (master disables rather than removes). */
  const OPERABLE_CHECK = `${CHECK}:not([disabled])`;

  const tpl = (extra: string) => `
    <app-pr-checkbox
      label="I agree"
      ${extra}
      (selectOptionEvent)="onSelect()"
      [(ngModel)]="model">
    </app-pr-checkbox>`;

  const props = (model: boolean | null) => ({ model, onSelect: () => undefined });

  /* --------------------------------------------------------------- *
   * Shared contracts. The two `.pr-field` assertions are the known gap above.
   * --------------------------------------------------------------- */
  sharedFieldContracts({
    emptyRequired: { template: tpl('[required]="true"'), componentProperties: props(null) },
    filledRequired: { template: tpl('[required]="true"'), componentProperties: props(true) },
    optional: { template: tpl('[required]="false"'), componentProperties: props(null) },
    controlSelector: OPERABLE_CHECK,
    rootSelector: '.pr-field'
  });

  /* --------------------------------------------------------------- *
   * Model contract (spec: "Single-value fields honour the same model contract")
   * --------------------------------------------------------------- */

  it('[contract] checking the box writes true into the bound model', () => {
    mountCFHost(tpl(''), { componentProperties: props(false), editable: true }).then(w => {
      cy.get(CHECK).check();
      cy.wrap(null).then(() => expect((w.component as any).model, 'bound model').to.equal(true));
    });
  });

  it('[contract] checking the box emits selectOptionEvent exactly once', () => {
    const onSelect = cy.stub().as('select');
    mountCF(tpl(''), { componentProperties: { model: false, onSelect }, editable: true });
    cy.get(CHECK).check();
    cy.get('@select').should('have.been.calledOnce');
  });

  it('[contract] unchecking the box writes false into the bound model and emits once', () => {
    const onSelect = cy.stub().as('select');
    mountCFHost(tpl(''), { componentProperties: { model: true, onSelect }, editable: true }).then(w => {
      cy.get(CHECK).should('be.checked');
      cy.get(CHECK).uncheck();
      cy.get(CHECK).should('not.be.checked');
      cy.wrap(null).then(() => {
        expect((w.component as any).model, 'bound model').to.equal(false);
        expect(onSelect.callCount, 'selectOptionEvent emissions').to.equal(1);
      });
    });
  });

  it('[contract] a pre-existing true model renders the box checked on mount', () => {
    mountCF(tpl(''), { componentProperties: props(true), editable: true });
    cy.get(CHECK).should('be.checked');
  });

  it('[contract] a programmatic model change updates the control without interaction', () => {
    mountCFHost(tpl(''), { componentProperties: props(false), editable: true });
    cy.get(CHECK).should('not.be.checked');
    patchHost(host => (host.model = true));
    cy.get(CHECK).should('be.checked');
  });

  it('[contract] setting the model to null renders the box unchecked', () => {
    mountCFHost(tpl(''), { componentProperties: props(true), editable: true });
    cy.get(CHECK).should('be.checked');
    patchHost(host => (host.model = null));
    cy.get(CHECK).should('not.be.checked');
  });

  it('[contract] a programmatic model change does NOT emit selectOptionEvent', () => {
    // Only user interaction is a "selection"; consumers persist on this event.
    const onSelect = cy.stub().as('select');
    mountCFHost(tpl(''), { componentProperties: { model: false, onSelect }, editable: true });
    patchHost(host => (host.model = true));
    cy.get(CHECK).should('be.checked');
    cy.wrap(null).then(() => expect(onSelect.callCount, 'selectOptionEvent emissions').to.equal(0));
  });

  /* --------------------------------------------------------------- *
   * Read-only gate (RolesService.readOnly defaults to TRUE)
   * --------------------------------------------------------------- */

  it('[contract] read-only still SHOWS the checked state', () => {
    mountCF(tpl(''), { componentProperties: props(true) });
    cy.get(CHECK).should('be.checked');
  });

  it('[contract] read-only rejects interaction — the model is untouched', () => {
    mountCFHost(tpl(''), { componentProperties: props(false) }).then(w => {
      cy.get(CHECK).should('be.disabled');
      cy.get(CHECK).check({ force: true });
      cy.wait(150);
      cy.wrap(null).then(() => expect((w.component as any).model, 'bound model').to.equal(false));
    });
  });

  it('[contract] [isStatic] keeps the control operable independently of the role gate', () => {
    mountCF(tpl('[isStatic]="true"'), { componentProperties: props(true) });
    cy.get(OPERABLE_CHECK).should('exist');
  });

  /* --------------------------------------------------------------- *
   * Label
   * --------------------------------------------------------------- */

  it('[contract] renders the configured label as HTML', () => {
    mountCF(`<app-pr-checkbox [label]="label" [(ngModel)]="model"></app-pr-checkbox>`, {
      componentProperties: { label: 'Gender <b>equality</b>', model: false },
      editable: true
    });
    cy.get('.label').should('contain.text', 'Gender equality');
    cy.get('.label b').should('exist');
  });
});
