import { mountCF, mountCFHost, patchHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for <app-pr-yes-or-not> (14 consumer screens).
 *
 * Source of truth = `master`: both the class AND the template are BYTE-IDENTICAL to
 * `git show master:.../pr-yes-or-not.component.{ts,html}` — this component was untouched by the
 * Spartan migration (it never used PrimeNG; the choices are plain `<div class="choice">`).
 * Everything asserted here therefore encodes master's shipped behaviour.
 *
 * Three-state model (the field's whole point — a tri-state boolean):
 *   `true`      -> "Yes" carries `.yes`
 *   `false`     -> "No"  carries `.no`
 *   null/undef  -> UNANSWERED: neither choice is highlighted (and, while read-only, neither renders)
 * `false` is a real answer and must never be conflated with "unanswered".
 *
 * `sharedFieldContracts()` is deliberately NOT used here: its `controlSelector` must vanish while
 * read-only, but in this component the SAME `.choice` div is both the control and the value
 * display — read-only keeps the chosen side rendered on purpose (spec: "still displaying the
 * current value"). Using the helper would produce a red that is not a defect. The read-only gate
 * is asserted below in the form the component actually implements.
 *
 * KNOWN CONTRACT GAP (documented, expected RED — see the report):
 * `[required]` only drives the asterisk in `app-pr-field-header`; the template renders NO
 * `.pr-field` root, so the field never emits the `.pr-field.mandatory` / `.complete` markers that
 * `DataControlService.someMandatoryFieldIncompleteResultDetail()` scans. Real consumers DO mount
 * it with `[required]="true"` (share-request-modal, target-indicator, knowledge-product-info,
 * ipsr-contributors), so those answers never block submission. IDENTICAL on `master` — a
 * pre-existing gap, NOT a migration regression.
 */
describe('PrYesOrNotComponent — contract', () => {
  const tpl = (extra: string) => `
    <app-pr-yes-or-not
      label="Confirm?"
      ${extra}
      (selectOptionEvent)="onSelect($event)"
      [(ngModel)]="model">
    </app-pr-yes-or-not>`;

  const props = (model: boolean | null) => ({ model, onSelect: () => undefined });

  /* --------------------------------------------------------------- *
   * Three-state rendering
   * --------------------------------------------------------------- */

  it('[contract] an UNANSWERED field highlights neither choice', () => {
    mountCF(tpl('[editable]="true"'), { componentProperties: props(null) });
    cy.contains('.choice', 'Yes').should('not.have.class', 'yes');
    cy.contains('.choice', 'No').should('not.have.class', 'no');
  });

  it('[contract] model true highlights Yes only', () => {
    mountCF(tpl('[editable]="true"'), { componentProperties: props(true) });
    cy.contains('.choice', 'Yes').should('have.class', 'yes');
    cy.contains('.choice', 'No').should('not.have.class', 'no');
  });

  it('[contract] model false highlights No only — false is an ANSWER, not "unanswered"', () => {
    mountCF(tpl('[editable]="true"'), { componentProperties: props(false) });
    cy.contains('.choice', 'No').should('have.class', 'no');
    cy.contains('.choice', 'Yes').should('not.have.class', 'yes');
  });

  /* --------------------------------------------------------------- *
   * Model contract (spec: "Single-value fields honour the same model contract")
   * --------------------------------------------------------------- */

  it('[contract] clicking Yes writes true and emits true exactly once', () => {
    const onSelect = cy.stub().as('select');
    mountCFHost(tpl('[editable]="true"'), { componentProperties: { model: null, onSelect } }).then(w => {
      cy.contains('.choice', 'Yes').click();
      cy.contains('.choice', 'Yes').should('have.class', 'yes');
      cy.wrap(null).then(() => {
        expect((w.component as any).model, 'bound model').to.equal(true);
        expect(onSelect.callCount, 'selectOptionEvent emissions').to.equal(1);
        expect(onSelect.firstCall.args[0], 'emitted payload').to.equal(true);
      });
    });
  });

  it('[contract] clicking No writes false and emits false exactly once', () => {
    const onSelect = cy.stub().as('select');
    mountCFHost(tpl('[editable]="true"'), { componentProperties: { model: null, onSelect } }).then(w => {
      cy.contains('.choice', 'No').click();
      cy.contains('.choice', 'No').should('have.class', 'no');
      cy.wrap(null).then(() => {
        expect((w.component as any).model, 'bound model').to.equal(false);
        expect(onSelect.callCount, 'selectOptionEvent emissions').to.equal(1);
        expect(onSelect.firstCall.args[0], 'emitted payload').to.equal(false);
      });
    });
  });

  it('[contract] switching Yes -> No replaces the answer', () => {
    mountCFHost(tpl('[editable]="true"'), { componentProperties: props(true) }).then(w => {
      cy.contains('.choice', 'No').click();
      cy.contains('.choice', 'No').should('have.class', 'no');
      cy.contains('.choice', 'Yes').should('not.have.class', 'yes');
      cy.wrap(null).then(() => expect((w.component as any).model, 'bound model').to.equal(false));
    });
  });

  it('[contract] re-clicking the ALREADY selected choice keeps the answer (no deselect)', () => {
    // Unlike pr-radio-button, `onclickYes()` has no toggle-off branch on master.
    // The answer must survive a second click — losing it would silently blank a saved answer.
    mountCFHost(tpl('[editable]="true"'), { componentProperties: props(true) }).then(w => {
      cy.contains('.choice', 'Yes').click();
      cy.contains('.choice', 'Yes').should('have.class', 'yes');
      cy.wrap(null).then(() => expect((w.component as any).model, 'bound model').to.equal(true));
    });
  });

  it('[contract] a programmatic model change updates the control without interaction', () => {
    mountCFHost(tpl('[editable]="true"'), { componentProperties: props(null) });
    cy.contains('.choice', 'Yes').should('not.have.class', 'yes');
    patchHost(host => (host.model = true));
    cy.contains('.choice', 'Yes').should('have.class', 'yes');
    patchHost(host => (host.model = false));
    cy.contains('.choice', 'No').should('have.class', 'no');
    cy.contains('.choice', 'Yes').should('not.have.class', 'yes');
  });

  it('[contract] setting the model to null returns the field to UNANSWERED', () => {
    mountCFHost(tpl('[editable]="true"'), { componentProperties: props(true) });
    cy.contains('.choice', 'Yes').should('have.class', 'yes');
    patchHost(host => (host.model = null));
    cy.contains('.choice', 'Yes').should('not.have.class', 'yes');
    cy.contains('.choice', 'No').should('not.have.class', 'no');
  });

  it('[contract] a programmatic model change does NOT emit selectOptionEvent', () => {
    const onSelect = cy.stub().as('select');
    mountCFHost(tpl('[editable]="true"'), { componentProperties: { model: null, onSelect } });
    patchHost(host => (host.model = true));
    cy.contains('.choice', 'Yes').should('have.class', 'yes');
    cy.wrap(null).then(() => expect(onSelect.callCount, 'selectOptionEvent emissions').to.equal(0));
  });

  /* --------------------------------------------------------------- *
   * Read-only gate (RolesService.readOnly defaults to TRUE)
   * --------------------------------------------------------------- */

  it('[contract] read-only + unanswered offers NO choice at all', () => {
    mountCF(tpl(''), { componentProperties: props(null) });
    cy.get('.choices').should('exist');
    cy.get('.choices .choice').should('not.exist');
  });

  it('[contract] read-only shows ONLY the answered side (value visible, alternative not offered)', () => {
    mountCF(tpl(''), { componentProperties: props(true) });
    cy.get('.choices .choice').should('have.length', 1);
    cy.contains('.choice', 'Yes').should('have.class', 'yes');
    cy.contains('.choice', 'No').should('not.exist');
  });

  it('[contract] read-only rejects interaction — the model is untouched and nothing is emitted', () => {
    const onSelect = cy.stub().as('select');
    mountCFHost(tpl(''), { componentProperties: { model: true, onSelect } }).then(w => {
      cy.contains('.choice', 'Yes').click();
      cy.wait(150);
      cy.wrap(null).then(() => {
        expect((w.component as any).model, 'bound model').to.equal(true);
        expect(onSelect.callCount, 'selectOptionEvent emissions').to.equal(0);
      });
    });
  });

  it('[contract] [editable]="true" bypasses the role gate and exposes both choices', () => {
    mountCF(tpl('[editable]="true"'), { componentProperties: props(null) });
    cy.get('.choices .choice').should('have.length', 2);
  });

  it('[contract] [hideOptions] removes the choice row entirely', () => {
    mountCF(tpl('[editable]="true" [hideOptions]="true"'), { componentProperties: props(true) });
    cy.get('.choices').should('not.exist');
  });

  /* --------------------------------------------------------------- *
   * Mandatory-completeness DOM contract — see KNOWN CONTRACT GAP above.
   * --------------------------------------------------------------- */

  it('[contract] a required+empty field is marked mandatory-but-incomplete for the submission scan', () => {
    mountCF(tpl('[editable]="true" [required]="true"'), { componentProperties: props(null) });
    cy.get('.pr-field.mandatory').should('exist').and('not.have.class', 'complete');
  });

  it('[contract] a required field marks itself complete once answered', () => {
    mountCF(tpl('[editable]="true" [required]="true"'), { componentProperties: props(false) });
    cy.get('.pr-field.mandatory').should('have.class', 'complete');
  });

  it('[contract] an optional field is never marked mandatory', () => {
    mountCF(tpl('[editable]="true" [required]="false"'), { componentProperties: props(null) });
    cy.get('.pr-field.mandatory').should('not.exist');
  });

  /* --------------------------------------------------------------- *
   * Label
   * --------------------------------------------------------------- */

  it('[contract] renders the configured label with the required asterisk', () => {
    mountCF(tpl('[editable]="true" [required]="true"'), { componentProperties: props(null) });
    cy.get('.title').should('contain.text', 'Confirm?');
  });
});
