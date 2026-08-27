import { mountComponent } from '../../../../cypress/support/ct-utils';
import { UnderConstructionPointComponent } from './under-construction-point.component';

/**
 * Behavior lock for <app-under-construction-point> before the signals refactor.
 * Purely presentational — renders the work-in-progress image.
 *
 * Mounted via `mountComponent` — NOT exported from CustomFieldsModule (only used inside pr-input).
 */
describe('UnderConstructionPointComponent (CT)', () => {
  it('renders the work-in-progress image', () => {
    mountComponent(UnderConstructionPointComponent);
    cy.get('img[src="assets/work-in-progress.png"]').should('exist');
  });
});
