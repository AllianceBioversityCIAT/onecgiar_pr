import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-alert-status> before the signals refactor.
 * Captures: status class, mapped icon, and description rendering.
 */
describe('AlertStatusComponent (CT)', () => {
  it('renders the info status with its icon by default', () => {
    mountCF(`<app-alert-status description="Heads up"></app-alert-status>`);
    cy.get('.pr_alert').should('have.class', 'info');
    cy.get('.alert_badge i').should('contain.text', 'info');
    cy.get('.alert_text').should('contain.text', 'Heads up');
  });

  it('maps the warning status to the warning icon', () => {
    mountCF(`<app-alert-status status="warning" description="Careful"></app-alert-status>`);
    cy.get('.pr_alert').should('have.class', 'warning');
    cy.get('.alert_badge i').should('contain.text', 'warning');
  });

  it('maps the success status to the check icon', () => {
    mountCF(`<app-alert-status status="success" description="Done"></app-alert-status>`);
    cy.get('.alert_badge i').should('contain.text', 'check');
  });
});

/**
 * ITR-T-3: the `status="info"` disclosure added by ITR-T-1 (see
 * docs/specs/changes/info-tooltip-hover-reveal/design.md §6.2).
 *
 * These assertions deliberately use `.should('be.visible')` / `.should('not.be.visible')`
 * (never `contain.text` alone) — `[hidden]` keeps `.alert_text` in the DOM at all times, so a
 * `textContent`-only assertion cannot distinguish collapsed from expanded (see the disqualifier
 * in tasks.md `ITR-T-3`).
 */
describe('collapsible info panel', () => {
  it('collapses the info panel by default with the toggle reporting aria-expanded="false"', () => {
    mountCF(`<app-alert-status status="info" description="Longer guidance text"></app-alert-status>`);
    cy.get('.alert_toggle').should('have.attr', 'aria-expanded', 'false');
    cy.get('.alert_text').should('not.be.visible');
  });

  it('reveals the description on click and re-collapses on a second click', () => {
    mountCF(`<app-alert-status status="info" description="Longer guidance text"></app-alert-status>`);

    cy.get('.alert_toggle').click();
    cy.get('.alert_toggle').should('have.attr', 'aria-expanded', 'true');
    cy.get('.alert_text').should('be.visible');

    cy.get('.alert_toggle').click();
    cy.get('.alert_toggle').should('have.attr', 'aria-expanded', 'false');
    cy.get('.alert_text').should('not.be.visible');
  });

  it('reveals the description identically via Enter and Space keyboard activation', () => {
    mountCF(`<app-alert-status status="info" description="Longer guidance text"></app-alert-status>`);

    cy.get('.alert_toggle').focus().type('{enter}');
    cy.get('.alert_toggle').should('have.attr', 'aria-expanded', 'true');
    cy.get('.alert_text').should('be.visible');

    cy.get('.alert_toggle').focus().type(' ');
    cy.get('.alert_toggle').should('have.attr', 'aria-expanded', 'false');
    cy.get('.alert_text').should('not.be.visible');
  });

  it('renders no toggle at all for the warning, error, and success variants', () => {
    mountCF(`<app-alert-status status="warning" description="Careful"></app-alert-status>`);
    cy.get('.alert_toggle').should('not.exist');

    mountCF(`<app-alert-status status="error" description="Failed"></app-alert-status>`);
    cy.get('.alert_toggle').should('not.exist');

    mountCF(`<app-alert-status status="success" description="Done"></app-alert-status>`);
    cy.get('.alert_toggle').should('not.exist');
  });
});
