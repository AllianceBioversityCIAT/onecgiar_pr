import { RolesService } from '../../shared/services/global/roles.service';
import { mountCFHost, patchHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-pr-field-header` (79 consuming templates — the label/description block
 * above almost every field in the app).
 *
 * Source of truth
 * ---------------
 * `master`. The component class is identical apart from one added input (`tooltip`, P2-3061),
 * and the template only gained the tooltip branch:
 *
 *   master:  <div class="pr_label ..." *ngIf="label" [innerHTML]="label + (useColon ? ':' : '')">
 *   here:    same div when there is NO tooltip; a `.pr_label_row` wrapper + an info icon when
 *            a tooltip IS supplied.
 *
 * So the no-tooltip path must be byte-for-byte equivalent in behaviour to `master` (79 consumers
 * depend on it and none of them was touched), and the tooltip path is new behaviour whose
 * contract comes from the P2-3061 intent: an info affordance next to the label that reveals the
 * text on hover.
 *
 * The `descriptionLabel` getter is the one piece of real logic:
 *   showDescriptionLabel && !rolesSE.readOnly  ->  prefix the description with "Description:"
 * i.e. the "Description:" chip is an EDIT-MODE affordance. `RolesService.readOnly` defaults to
 * TRUE, so the default render must NOT carry it. That is `master` behaviour, unchanged.
 *
 * NOT asserted here: the `.pr-field.mandatory` / `.complete` DOM contract. `pr-field-header`
 * renders no control and no `.pr-field` root — `[required]` only toggles the `.required` class
 * that draws the asterisk. The mandatory scan lives on the field components themselves.
 */

describe('PrFieldHeaderComponent — contract', () => {
  describe('label', () => {
    it('[contract] renders the label with a trailing colon by default', () => {
      mountCFHost(`<app-pr-field-header label="Result title"></app-pr-field-header>`);
      cy.get('.pr_label').should('have.text', 'Result title:');
    });

    it('[contract] omits the colon when the consumer sets [useColon]="false"', () => {
      mountCFHost(`<app-pr-field-header label="Result title" [useColon]="false"></app-pr-field-header>`);
      cy.get('.pr_label').should('have.text', 'Result title');
    });

    it('[contract] renders nothing at all when there is no label', () => {
      mountCFHost(`<app-pr-field-header [required]="true"></app-pr-field-header>`);
      cy.get('.pr_label').should('not.exist');
    });

    it('[contract] renders the label as HTML (consumers embed <strong>/<a> in labels)', () => {
      mountCFHost(`<app-pr-field-header [label]="label" [useColon]="false"></app-pr-field-header>`, {
        componentProperties: { label: 'Lead <strong>center</strong>' }
      });
      cy.get('.pr_label strong').should('contain.text', 'center');
    });

    it('[contract] updates the label when the consumer changes it after mount', () => {
      mountCFHost(`<app-pr-field-header [label]="label" [useColon]="false"></app-pr-field-header>`, {
        componentProperties: { label: 'Old label' }
      });
      cy.get('.pr_label').should('have.text', 'Old label');

      patchHost(host => (host.label = 'New label'));

      cy.get('.pr_label').should('have.text', 'New label');
    });
  });

  describe('required marker (the asterisk 27 field consumers rely on)', () => {
    it('[contract] marks the label as required by default', () => {
      mountCFHost(`<app-pr-field-header label="Result title"></app-pr-field-header>`);
      cy.get('.pr_label').should('have.class', 'required');
    });

    it('[contract] does not mark an optional label as required', () => {
      mountCFHost(`<app-pr-field-header label="Comments" [required]="false"></app-pr-field-header>`);
      cy.get('.pr_label').should('not.have.class', 'required');
    });

    it('[contract] follows the consumer when [required] flips after mount', () => {
      mountCFHost(`<app-pr-field-header label="Evidence link" [required]="required"></app-pr-field-header>`, {
        componentProperties: { required: false }
      });
      cy.get('.pr_label').should('not.have.class', 'required');

      patchHost(host => (host.required = true));

      cy.get('.pr_label').should('have.class', 'required');
    });
  });

  describe('description', () => {
    it('[contract] renders the description text', () => {
      mountCFHost(`<app-pr-field-header description="Describe the result in one sentence."></app-pr-field-header>`);
      cy.get('.pr_description').should('contain.text', 'Describe the result in one sentence.');
    });

    it('[contract] renders no description block when none is supplied', () => {
      mountCFHost(`<app-pr-field-header label="Result title"></app-pr-field-header>`);
      cy.get('.pr_description').should('not.exist');
    });

    it('[contract] renders the description as HTML (consumers embed links and lists)', () => {
      mountCFHost(`<app-pr-field-header [description]="description"></app-pr-field-header>`, {
        componentProperties: { description: 'See the <a href="#" class="guide">guide</a>.' }
      });
      cy.get('.pr_description a.guide').should('contain.text', 'guide');
    });

    /**
     * `RolesService.readOnly` defaults to TRUE, so this is the DEFAULT render in the app.
     * Behaviour taken from `master`, where the getter is identical.
     */
    it('[contract] omits the "Description:" chip for a read-only user (the app default)', () => {
      mountCFHost(`<app-pr-field-header description="Some help text"></app-pr-field-header>`);
      cy.get('.pr_description').should('contain.text', 'Some help text').and('not.contain.text', 'Description:');
    });

    it('[contract] prefixes the description with "Description:" while editing', () => {
      mountCFHost(`<app-pr-field-header description="Some help text"></app-pr-field-header>`, { editable: true });
      cy.get('.pr_description').should('contain.text', 'Description:');
    });

    it('[contract] never shows the chip when the consumer opts out with [showDescriptionLabel]="false"', () => {
      mountCFHost(`<app-pr-field-header description="Some help text" [showDescriptionLabel]="false"></app-pr-field-header>`, {
        editable: true
      });
      cy.get('.pr_description').should('contain.text', 'Some help text').and('not.contain.text', 'Description:');
    });

    /**
     * The chip is derived from a PLAIN service boolean (`rolesSE.readOnly`) read through a
     * getter, and `readOnly` is lowered asynchronously once the role check resolves. Same
     * async-flag shape as `sync-button` / `save-button`, asserted here on its own surface.
     */
    it('[contract] gains the "Description:" chip once the role check lowers readOnly', () => {
      mountCFHost(`<app-pr-field-header description="Some help text"></app-pr-field-header>`);
      cy.get('.pr_description').should('not.contain.text', 'Description:');

      cy.get('@ctWrapper').then((w: any) => {
        w.fixture.autoDetectChanges(true);
        w.fixture.ngZone.run(() => (w.fixture.debugElement.injector.get(RolesService).readOnly = false));
      });

      cy.get('.pr_description').should('contain.text', 'Description:');
    });
  });

  describe('info tooltip (P2-3061 — new on this branch, contract from the ticket intent)', () => {
    it('[contract] shows no info icon when no tooltip is configured', () => {
      mountCFHost(`<app-pr-field-header label="Result title"></app-pr-field-header>`);
      cy.get('.pr_label_tooltip').should('not.exist');
    });

    it('[contract] renders an info icon next to the label when a tooltip is configured', () => {
      mountCFHost(`<app-pr-field-header label="Result title" tooltip="Use a short, factual title."></app-pr-field-header>`);
      cy.get('.pr_label_row .pr_label').should('contain.text', 'Result title:');
      cy.get('.pr_label_tooltip').should('exist').and('contain.text', 'info');
    });

    it('[contract] reveals the tooltip text on hover and hides it on leave', () => {
      mountCFHost(`<app-pr-field-header label="Result title" tooltip="Use a short, factual title."></app-pr-field-header>`);

      cy.get('.pr_label_tooltip').trigger('mouseenter');
      cy.contains('Use a short, factual title.').should('be.visible');

      cy.get('.pr_label_tooltip').trigger('mouseleave');
      cy.contains('Use a short, factual title.').should('not.exist');
    });

    it('[contract] keeps the label text identical whether or not a tooltip is present', () => {
      mountCFHost(`<app-pr-field-header label="Result title" tooltip="Help"></app-pr-field-header>`);
      cy.get('.pr_label').should('have.text', 'Result title:').and('have.class', 'required');
    });
  });
});
