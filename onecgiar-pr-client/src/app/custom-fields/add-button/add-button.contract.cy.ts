import { mountCFHost, patchHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-add-button` (14 consuming templates — "Add partner", "Add evidence",
 * "Add contributor", … the repeat-row affordance of every list section).
 *
 * Source of truth
 * ---------------
 * `master` — the component is BYTE-IDENTICAL there
 * (`git diff master -- src/app/custom-fields/add-button/*` -> empty).
 *
 * Real consumer shape:
 *   <app-add-button name="Add partner" [disabled]="someCondition" (clickEvent)="addRow()">
 *
 * The two things a list section depends on: exactly one row is added per click (a double emit
 * silently creates duplicate rows the user then has to delete), and a disabled button adds
 * nothing (it is disabled precisely when the previous row is still incomplete).
 */

const FIELD = `<app-add-button [name]="name" [disabled]="disabled" (clickEvent)="onClick()"></app-add-button>`;

const mount = (props: Record<string, unknown> = {}) => {
  const onClick = cy.stub().as('click');
  return mountCFHost(FIELD, { componentProperties: { name: 'Add partner', disabled: false, onClick, ...props } });
};

describe('AddButtonComponent — contract', () => {
  describe('labelling', () => {
    it('[contract] renders the name supplied by the consumer', () => {
      mount({ name: 'Add evidence' });
      cy.get('.add_button_content .name').should('have.text', 'Add evidence');
    });

    it('[contract] always shows the add affordance', () => {
      mount();
      cy.get('.icon_container i').should('contain.text', 'add');
    });

    it('[contract] follows the consumer when the name changes after mount', () => {
      mount({ name: 'Add partner' });
      patchHost(host => (host.name = 'Add another partner'));
      cy.get('.add_button_content .name').should('have.text', 'Add another partner');
    });
  });

  describe('click emission', () => {
    it('[contract] emits clickEvent exactly once per click — one click, one row', () => {
      mount();
      cy.get('.add_button_content').click();
      cy.get('@click').should('have.been.calledOnce');
    });

    it('[contract] emits once per click across repeated clicks (no double firing)', () => {
      mount();
      cy.get('.add_button_content').click().click().click();
      cy.get('@click').should('have.been.calledThrice');
    });
  });

  describe('disabled state', () => {
    it('[contract] marks the button as disabled', () => {
      mount({ disabled: true });
      cy.get('.add_button_content').should('have.class', 'disabled');
    });

    it('[contract] adds nothing while disabled', () => {
      // `.disabled` sets pointer-events:none, so force past the actionability check —
      // the guard under test is the component's, not the CSS.
      mount({ disabled: true });
      cy.get('.add_button_content').click({ force: true }).click({ force: true });
      cy.get('@click').should('not.have.been.called');
    });

    /** The live path: the previous row is completed and the button must come back to life. */
    it('[contract] becomes usable again when the consumer lifts [disabled]', () => {
      mount({ disabled: true });
      cy.get('.add_button_content').click({ force: true });
      cy.get('@click').should('not.have.been.called');

      patchHost(host => (host.disabled = false));

      cy.get('.add_button_content').should('not.have.class', 'disabled').click();
      cy.get('@click').should('have.been.calledOnce');
    });
  });
});
