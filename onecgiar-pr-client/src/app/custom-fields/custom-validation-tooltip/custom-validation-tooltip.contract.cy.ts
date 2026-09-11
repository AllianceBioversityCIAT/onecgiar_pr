import { mountCFHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-custom-validation-tooltip` (1 consuming template).
 *
 * Source of truth
 * ---------------
 * `master` — BYTE-IDENTICAL there
 * (`git diff master -- src/app/custom-fields/custom-validation-tooltip/*` -> empty).
 *
 * Scope: SMOKE ONLY, per design.md non-goals. The component has no inputs, no outputs and no
 * state — it is a fixed "Please enter a valid URL" bubble that `pr-input` reveals with CSS when
 * a `type="link"` field fails validation. The only guarantee a consumer can rely on is that the
 * message and its warning affordance are present; when it becomes VISIBLE is `pr-input`'s
 * contract, not this component's.
 */

describe('CustomValidationTooltipComponent — contract', () => {
  it('[contract] states the URL validation message', () => {
    mountCFHost(`<app-custom-validation-tooltip></app-custom-validation-tooltip>`);
    cy.get('.custom_validation_tooltip .text').should('have.text', 'Please enter a valid URL');
  });

  it('[contract] carries a warning affordance next to the message', () => {
    mountCFHost(`<app-custom-validation-tooltip></app-custom-validation-tooltip>`);
    cy.get('.custom_validation_tooltip .icon i').should('have.class', 'material-icons-round').and('contain.text', 'warning');
  });

  it('[contract] renders the pointer that anchors it to the field', () => {
    mountCFHost(`<app-custom-validation-tooltip></app-custom-validation-tooltip>`);
    cy.get('.custom_validation_tooltip .triangle').should('exist');
  });
});
