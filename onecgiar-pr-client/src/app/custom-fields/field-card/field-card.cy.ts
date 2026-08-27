import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behaviour lock for <app-field-card>.
 *
 * ⚠️ This spec used to assert a four-colour status verdict (`fc-optional` / `fc-pending` /
 * `fc-done` / `fc-error`) and a Mandatory/Optional pill (`.fch_tag`). The redesign that matched
 * the approved mockup REMOVED both on purpose — the component's own template says so, and
 * `hasValue` is marked `@deprecated No longer read` in field-card.component.ts. Whether a section
 * is complete is now told once by the bottom bar instead of repeated on every field.
 *
 * Those assertions are gone rather than adapted: there is nothing left to adapt them to, and
 * re-adding the pill would be rebuilding what the mockup deliberately dropped. What the card
 * still owns — and what is locked here — is the label, the required asterisk, the error state,
 * the row layout and content projection.
 */
describe('FieldCardComponent (CT)', () => {
  it('renders the label and the projected control', () => {
    mountCF(`<app-field-card label="My field"><span class="body">inner</span></app-field-card>`);
    cy.get('.fch_title').should('contain.text', 'My field');
    cy.get('.body').should('contain.text', 'inner');
  });

  it('marks a required field with an asterisk, and says so to a screen reader', () => {
    mountCF(`<app-field-card label="My field" [required]="true"></app-field-card>`);
    cy.get('.fch_required').should('contain.text', '*');
    cy.get('.sr-only').should('contain.text', '(required)');
  });

  it('omits the asterisk when the field is optional', () => {
    mountCF(`<app-field-card label="My field" [required]="false"></app-field-card>`);
    // Anchored to a POSITIVE assertion first. A bare `.fch_required should not.exist` also passes
    // when nothing mounted at all, which makes it a test that cannot fail — verified by mutation.
    cy.get('.field_card_header').should('contain.text', 'My field').find('.fch_required').should('have.length', 0);
  });

  it('carries fc-error while the consumer reports an error', () => {
    mountCF(`<app-field-card label="x" [hasError]="true"></app-field-card>`);
    cy.get('.field_card').should('have.class', 'fc-error');
  });

  it('carries no fc-error by default', () => {
    mountCF(`<app-field-card label="unflagged"></app-field-card>`);
    // Positive anchor first, same reason as above.
    cy.get('.field_card').should('contain.text', 'unflagged').and('not.have.class', 'fc-error');
  });

  /**
   * ~60 call sites project a control with no label (currency cells, sub-inputs inside a radio
   * option, "Other" specifiers) and most of them leave `required` at its `true` default. Without
   * this guard every one of them would grow an orphan asterisk over an empty title.
   */
  it('renders no chrome at all when there is neither label nor description', () => {
    mountCF(`<app-field-card><span class="body">bare</span></app-field-card>`);
    // Positive first: proves the component really mounted before anything is asserted absent.
    cy.get('.body').should('contain.text', 'bare');
    cy.get('.field_card').should('have.length', 0);
    cy.get('.field_card_header').should('have.length', 0);
  });

  it('keeps the block for a description with no label, so that copy is never dropped', () => {
    mountCF(`<app-field-card description="Some guidance"></app-field-card>`);
    cy.get('.field_card').should('exist');
    cy.get('.field_card_desc .desc_text').should('contain.text', 'Some guidance');
  });

  it('lays the label beside the control when asked for the row layout', () => {
    mountCF(`<app-field-card label="x" layout="row"></app-field-card>`);
    cy.get('.field_card').should('have.class', 'fc-row');
  });
});
