import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-field-card> before the signals refactor.
 * Captures: header (label + Mandatory/Optional tag), derived state class, explicit state override,
 * and projected content.
 */
describe('FieldCardComponent (CT)', () => {
  it('renders label, Mandatory tag and projected content', () => {
    mountCF(
      `<app-field-card label="My field" [required]="true"><span class="body">inner</span></app-field-card>`
    );
    cy.get('.fch_title').should('contain.text', 'My field');
    cy.get('.fch_tag').should('contain.text', 'Mandatory');
    cy.get('.body').should('contain.text', 'inner');
  });

  it('derives "pending" state for a required empty field', () => {
    mountCF(`<app-field-card label="x" [required]="true" [hasValue]="false"></app-field-card>`);
    cy.get('.field_card').should('have.class', 'fc-pending');
  });

  it('derives "done" state when it has a value', () => {
    mountCF(`<app-field-card label="x" [required]="true" [hasValue]="true"></app-field-card>`);
    cy.get('.field_card').should('have.class', 'fc-done');
  });

  it('lets an explicit [state] win over the derived one', () => {
    mountCF(`<app-field-card label="x" [hasValue]="true" state="error"></app-field-card>`);
    cy.get('.field_card').should('have.class', 'fc-error');
  });

  it('shows the Optional tag when not required', () => {
    mountCF(`<app-field-card label="x" [required]="false"></app-field-card>`);
    cy.get('.fch_tag').should('contain.text', 'Optional');
  });
});
