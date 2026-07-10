import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-pr-textarea> before the signals refactor.
 * Captures: two-way ngModel, external value reflection, read-only view, word-count invalid state.
 */
describe('PrTextareaComponent (CT)', () => {
  const TEMPLATE = `
    <app-pr-textarea
      label="Notes"
      [maxWords]="maxWords"
      [readOnly]="readOnly"
      [(ngModel)]="model">
    </app-pr-textarea>`;

  it('typing updates the bound model', () => {
    mountCF(TEMPLATE, { editable: true, componentProperties: { model: '', maxWords: null, readOnly: false } }).then(w => {
      cy.get('textarea[pTextarea]').should('be.visible').type('some notes here');
      cy.wrap(null).then(() => expect((w.component as any).model).to.equal('some notes here'));
    });
  });

  it('reflects an external value change', () => {
    mountCF(TEMPLATE, { editable: true, componentProperties: { model: 'first', maxWords: null, readOnly: false } }).then(w => {
      cy.get('textarea[pTextarea]').should('have.value', 'first');
      cy.wrap(null).then(() => {
        (w.component as any).model = 'changed outside';
        w.fixture.detectChanges();
      });
      cy.get('textarea[pTextarea]').should('have.value', 'changed outside');
    });
  });

  it('renders static text (no textarea) in read-only mode', () => {
    mountCF(TEMPLATE, { componentProperties: { model: 'Read only', maxWords: null, readOnly: true } });
    cy.get('.pr-field.readOnly').should('contain.text', 'Read only');
    cy.get('textarea[pTextarea]').should('not.exist');
  });

  it('marks the textarea invalid past maxWords', () => {
    // After the signals refactor, `wordCount` is a pure computed (no getter side effect),
    // so the dev-mode ExpressionChanged (NG0100) check no longer trips here.
    mountCF(TEMPLATE, { editable: true, componentProperties: { model: '', maxWords: 3, readOnly: false } });
    cy.get('textarea[pTextarea]').type('one two three four five');
    cy.get('app-pr-word-counter').should('exist').and('contain.text', 'Max 3 words');
    cy.get('.limitBreaker').should('have.class', 'invalid');
  });
});
