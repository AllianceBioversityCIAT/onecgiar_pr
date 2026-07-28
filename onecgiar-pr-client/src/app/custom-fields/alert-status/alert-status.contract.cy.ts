import { mountCFHost, patchHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-alert-status` (51 consuming templates — the inline notice used across
 * Result Detail, IPSR and the shared sections).
 *
 * Source of truth
 * ---------------
 * `master` for the BEHAVIOUR (which severities exist and what each must communicate), NOT for
 * the markup — this component was deliberately redesigned on this branch into a toast-style
 * card, so its DOM legitimately differs:
 *
 *   master:  <div class="pr_alert">          + <div class="line {{status}}">
 *                                            + <i class="material-icons-round icon {{status}}">{{status}}</i>
 *                                            + <div class="black_point" *ngIf="status=='warning'">
 *   here:    <div class="pr_alert {{status}}"> + <div class="alert_badge"><i>{{iconName}}</i></div>
 *                                              + <div class="alert_text">
 *
 * Two consequences, both recorded rather than filed as defects:
 *  - the severity now lives on the ROOT element (`.pr_alert.warning`) instead of on an inner
 *    `.line` — same information, different element;
 *  - `master` rendered the status NAME as the icon ligature, so `success` would have printed the
 *    literal "success" (not a valid Material ligature). The new `statusIcons` map fixes that.
 *
 * Measured consumer usage across the 51 templates: `status="warning"` 15, `status="info"` 9,
 * default (no status, i.e. info) for the rest. ZERO consumers use `success` or `error`, and
 * `master` did not even accept them — they are new on this branch, so they stay at smoke level
 * per the design non-goals. No consumer binds `[status]` dynamically.
 */

describe('AlertStatusComponent — contract', () => {
  describe('severity variants in real use', () => {
    it('[contract] defaults to the info severity when the consumer omits status', () => {
      mountCFHost(`<app-alert-status description="Heads up"></app-alert-status>`);
      cy.get('.pr_alert').should('have.class', 'info');
      cy.get('.alert_badge i').should('contain.text', 'info');
    });

    it('[contract] renders the info severity with its own icon (9 consumers)', () => {
      mountCFHost(`<app-alert-status status="info" description="Heads up"></app-alert-status>`);
      cy.get('.pr_alert').should('have.class', 'info').and('not.have.class', 'warning');
      cy.get('.alert_badge i').should('contain.text', 'info');
    });

    it('[contract] renders the warning severity with its own icon (15 consumers)', () => {
      mountCFHost(`<app-alert-status status="warning" description="Careful"></app-alert-status>`);
      cy.get('.pr_alert').should('have.class', 'warning').and('not.have.class', 'info');
      cy.get('.alert_badge i').should('contain.text', 'warning');
    });

    it('[contract] gives info and warning visually distinct backgrounds', () => {
      mountCFHost(`<app-alert-status status="info" description="x"></app-alert-status>`);
      cy.get('.pr_alert')
        .then($el => window.getComputedStyle($el[0]).backgroundColor)
        .then(infoBg => {
          expect(String(infoBg), 'info has a tinted background').to.not.match(/rgba\(0, 0, 0, 0\)|transparent/);

          mountCFHost(`<app-alert-status status="warning" description="x"></app-alert-status>`);
          cy.get('.pr_alert').then($el => {
            expect(window.getComputedStyle($el[0]).backgroundColor, 'warning differs from info').to.not.equal(String(infoBg));
          });
        });
    });

    it('[contract] falls back to the info icon for an unknown severity instead of rendering the raw value', () => {
      mountCFHost(`<app-alert-status [status]="status" description="x"></app-alert-status>`, {
        componentProperties: { status: 'catastrophe' }
      });
      cy.get('.alert_badge i').should('contain.text', 'info').and('not.contain.text', 'catastrophe');
    });
  });

  describe('message', () => {
    it('[contract] renders the description text', () => {
      mountCFHost(`<app-alert-status description="This result is locked for the current phase."></app-alert-status>`);
      cy.get('.alert_text').should('contain.text', 'This result is locked for the current phase.');
    });

    it('[contract] renders the description as HTML — consumers pass <strong> and <a>', () => {
      mountCFHost(`<app-alert-status [description]="description"></app-alert-status>`, {
        componentProperties: { description: 'Read the <a href="#" class="policy">policy</a> first.' }
      });
      cy.get('.alert_text a.policy').should('contain.text', 'policy');
      cy.get('.alert_text').should('not.contain.text', '<a href');
    });

    it('[contract] renders an empty alert without crashing when no description is supplied', () => {
      mountCFHost(`<app-alert-status status="warning"></app-alert-status>`);
      cy.get('.pr_alert').should('exist');
      cy.get('.alert_text').should('have.text', '');
    });

    /**
     * Several consumers interpolate live data into the description (counts, result names,
     * phase names), so the text must follow the binding after mount.
     */
    it('[contract] updates the message when the consumer changes it after mount', () => {
      mountCFHost(`<app-alert-status [description]="description"></app-alert-status>`, {
        componentProperties: { description: '2 results pending' }
      });
      cy.get('.alert_text').should('contain.text', '2 results pending');

      patchHost(host => (host.description = '5 results pending'));

      cy.get('.alert_text').should('contain.text', '5 results pending');
    });
  });

  describe('layout hook', () => {
    it('[contract] applies the inline styles the consumer passes', () => {
      mountCFHost(`<app-alert-status description="x" inlineStyles="margin-top: 40px"></app-alert-status>`);
      cy.get('.pr_alert').should('have.css', 'margin-top', '40px');
    });
  });

  describe('severities added on this branch (zero consumers — smoke per design non-goals)', () => {
    it('[contract] maps success to a check icon', () => {
      mountCFHost(`<app-alert-status status="success" description="Saved"></app-alert-status>`);
      cy.get('.pr_alert').should('have.class', 'success');
      cy.get('.alert_badge i').should('contain.text', 'check');
    });

    it('[contract] maps error to an error icon', () => {
      mountCFHost(`<app-alert-status status="error" description="Failed"></app-alert-status>`);
      cy.get('.pr_alert').should('have.class', 'error');
      cy.get('.alert_badge i').should('contain.text', 'error');
    });
  });
});
