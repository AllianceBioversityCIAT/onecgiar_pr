import { mountComponent } from '../../../../cypress/support/ct-utils';
import { UnderConstructionPointComponent } from './under-construction-point.component';

/**
 * CONTRACT tests for `app-under-construction-point` (1 consumer: `pr-input`, which renders it
 * above the control when the field declares `[underConstruction]`).
 *
 * Source of truth
 * ---------------
 * `master` — BYTE-IDENTICAL there
 * (`git diff master -- src/app/custom-fields/under-construction-point/*` -> empty).
 *
 * Scope: SMOKE ONLY per design.md non-goals — no inputs, no outputs, no state, a single
 * `<img>`. The only meaningful contract is that the asset it points at is the one the app
 * ships, since a broken path here degrades silently to an invisible badge.
 *
 * `mountComponent` (not a template tag): the component is declared but NOT exported from
 * `CustomFieldsModule`, so a `<app-under-construction-point>` tag in a host template renders
 * nothing at all and the test would pass against an empty DOM.
 */

describe('UnderConstructionPointComponent — contract', () => {
  it('[contract] renders the work-in-progress badge', () => {
    mountComponent(UnderConstructionPointComponent);
    cy.get('img').should('have.attr', 'src', 'assets/work-in-progress.png');
  });

  it('[contract] renders exactly one badge and nothing else', () => {
    mountComponent(UnderConstructionPointComponent);
    cy.get('img').should('have.length', 1);
    cy.get('app-under-construction-point').should('have.text', '');
  });
});
