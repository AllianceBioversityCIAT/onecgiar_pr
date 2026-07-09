import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-lead-contact-person-field> before the signals refactor.
 *
 * Covers the deterministic, no-network paths: a pre-selected contact renders locked with its
 * details + a clear button, and clearing removes the selection. (The live AD search path hits
 * the API and is left to manual/E2E verification.)
 */
describe('LeadContactPersonFieldComponent (CT)', () => {
  const TEMPLATE = `<app-lead-contact-person-field [body]="body"></app-lead-contact-person-field>`;

  const prefilledBody = () => ({
    lead_contact_person: 'Jane Doe',
    lead_contact_person_data: { display_name: 'Jane Doe', mail: 'jane.doe@cgiar.org', title: 'Researcher' }
  });

  it('renders a pre-selected contact locked with its details and a clear button', () => {
    mountCF(TEMPLATE, { editable: true, componentProperties: { body: prefilledBody() } });
    cy.get('.selected-user-name').should('contain.text', 'Jane Doe');
    cy.get('.selected-user-info').should('contain.text', 'jane.doe@cgiar.org');
    cy.get('.clear-contact-btn').should('exist');
  });

  it('clears the selection when the clear button is clicked', () => {
    mountCF(TEMPLATE, { editable: true, componentProperties: { body: prefilledBody() } });
    cy.get('.clear-contact-btn').click();
    cy.get('.selected-contact-info').should('not.exist');
    cy.get('.clear-contact-btn').should('not.exist');
  });
});
