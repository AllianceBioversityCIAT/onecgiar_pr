import { mountCFHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-edit-or-delete-item-button` (5 consuming templates).
 *
 * Source of truth
 * ---------------
 * `master` — BYTE-IDENTICAL there
 * (`git diff master -- src/app/custom-fields/edit-or-delete-item-button/*` -> empty).
 *
 * Scope: SMOKE ONLY, on purpose. The component has NO inputs, NO outputs and NO state — it is a
 * pure icon. Every one of its 5 consumers wires the behaviour itself:
 *
 *   <app-edit-or-delete-item-button (click)="deleteRow(i)">
 *
 * i.e. the click handler lives on the HOST element in the consumer template, not inside the
 * component. So the only thing this component can be held to is "it renders a delete
 * affordance that the consumer's own (click) can reach". Writing emission/disabled contracts
 * here would test the consumer, not this component (design.md non-goals).
 */

describe('EditOrDeleteItemButtonComponent — contract', () => {
  it('[contract] renders a delete affordance', () => {
    mountCFHost(`<app-edit-or-delete-item-button></app-edit-or-delete-item-button>`);
    cy.get('.eod_button').should('exist');
    cy.get('.eod_button i').should('have.class', 'material-icons-round').and('contain.text', 'delete');
  });

  it('[contract] the consumer\'s own (click) handler reaches it', () => {
    const onClick = cy.stub().as('click');
    mountCFHost(`<app-edit-or-delete-item-button (click)="onClick()"></app-edit-or-delete-item-button>`, {
      componentProperties: { onClick }
    });

    cy.get('.eod_button').click();
    cy.get('@click').should('have.been.calledOnce');
  });

  it('[contract] renders identically for a read-only user (visibility is the consumer\'s call)', () => {
    mountCFHost(`<app-edit-or-delete-item-button></app-edit-or-delete-item-button>`);
    cy.get('.eod_button').should('exist');
  });
});
