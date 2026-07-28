import { mountCFHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-pr-field-validations` (2 consumers: `pr-input` and `pr-textarea`).
 *
 * Source of truth
 * ---------------
 * `master` — BYTE-IDENTICAL there
 * (`git diff master -- src/app/custom-fields/pr-field-validations/*` -> empty).
 *
 * Scope: SMOKE ONLY. The component is an EMPTY PLACEHOLDER: its class has no members and its
 * template is a single HTML comment (`<!-- pr-field-validations works! -->`). Both consumers
 * drop the tag in without binding anything.
 *
 * The one contract worth locking is therefore a NEGATIVE one: the placeholder must stay
 * invisible and must not inject layout into the fields that host it. If someone later fills it
 * in, these tests go red and force a conscious decision — which is exactly what a placeholder
 * contract is for.
 */

describe('PrFieldValidationsComponent — contract', () => {
  it('[contract] mounts without error', () => {
    mountCFHost(`<app-pr-field-validations></app-pr-field-validations>`);
    cy.get('app-pr-field-validations').should('exist');
  });

  it('[contract] renders no visible text', () => {
    mountCFHost(`<app-pr-field-validations></app-pr-field-validations>`);
    cy.get('app-pr-field-validations').should('have.text', '');
  });

  it('[contract] adds no element children to the field that hosts it', () => {
    mountCFHost(`<app-pr-field-validations></app-pr-field-validations>`);
    cy.get('app-pr-field-validations').children().should('have.length', 0);
  });
});
