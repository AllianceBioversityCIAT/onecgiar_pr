import { DataControlService } from '../../shared/services/data-control.service';
import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-sync-button> before the signals refactor.
 * Captures: only visible for knowledge products (and not read-only), and emits clickSave.
 */
describe('SyncButtonComponent (CT)', () => {
  const TEMPLATE = `
    <app-sync-button [text]="text" (clickSave)="onSave()"></app-sync-button>`;

  const mount = (isKnowledgeProduct: boolean) => {
    const onSave = cy.stub().as('save');
    return mountCF(TEMPLATE, { editable: true, componentProperties: { text: 'Sync', onSave } }).then(w => {
      const dc = w.fixture.debugElement.injector.get(DataControlService);
      // isKnowledgeProduct is a getter over currentResult.result_type_id (6 = knowledge product).
      dc.currentResult = isKnowledgeProduct ? ({ result_type_id: 6 } as any) : {};
      w.fixture.detectChanges();
      return cy.wrap(w);
    });
  };

  it('is hidden when the result is not a knowledge product', () => {
    mount(false);
    cy.get('.fixed_button').should('not.exist');
  });

  it('renders and emits clickSave for a knowledge product', () => {
    mount(true);
    cy.get('.fixed_button').should('exist');
    cy.get('app-pr-button .text').should('contain.text', 'Sync');
    cy.get('.fixed_button').click();
    cy.get('@save').should('have.been.called');
  });
});
