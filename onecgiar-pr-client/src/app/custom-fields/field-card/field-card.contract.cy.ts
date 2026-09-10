import { mountCFHost, patchHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-field-card`.
 *
 * Source of truth
 * ---------------
 * NONE on `master` — this component does not exist there (`git show master:...field-card...`
 * fails). It was introduced on this branch as the visual wrapper that replaced
 * `app-pr-field-header` inside `pr-input`, `pr-select` and `lead-contact-person-field`. Its
 * contract therefore comes strictly from what its consumers pass it, per design.md D2.
 *
 * Consumers (4 templates + the two field components):
 *   pr-input / pr-select:  [label] [description] [required]="effectiveRequired()"
 *                          [hasValue]="hasValue" [hasError]="over word limit"
 *                          [showDescription] [descInlineStyles]
 *   lead-contact-person:   [label] [description] [required] [hasValue]="hasValidContact"
 *
 * The load-bearing behaviour is the DERIVED STATE, because it is what colours every field in
 * the app: optional / pending / done / error. `hasValue` and `hasError` are bound to live
 * expressions that flip as the user types, so the derived state must follow WITHOUT a remount.
 *
 * The card is a presentation wrapper: it renders no control, so the `.pr-field.mandatory` /
 * `.complete` submission-scan contract is NOT its responsibility (it lives on `pr-input` /
 * `pr-select`, which render `.pr-input.mandatory` / `.pr-field.mandatory` inside the card).
 * Asserting it here would fabricate a requirement.
 */

const CARD = `
  <app-field-card
    [label]="label"
    [description]="description"
    [required]="required"
    [hasValue]="hasValue"
    [hasError]="hasError"
    [showHeader]="showHeader"
    [showDescription]="showDescription">
    <input class="projected-control" />
  </app-field-card>`;

const mount = (props: Record<string, unknown> = {}) =>
  mountCFHost(CARD, {
    componentProperties: {
      label: 'Result title',
      description: 'Describe the result.',
      required: true,
      hasValue: false,
      hasError: false,
      showHeader: true,
      showDescription: true,
      ...props
    }
  });

describe('FieldCardComponent — contract', () => {
  describe('content projection', () => {
    it('[contract] renders the control the consumer projects into it', () => {
      mount();
      cy.get('.field_card .projected-control').should('exist');
    });

    it('[contract] still renders the projected control when the header is suppressed', () => {
      mount({ showHeader: false });
      cy.get('.field_card_header').should('not.exist');
      cy.get('.projected-control').should('exist');
    });
  });

  describe('header', () => {
    it('[contract] renders the label supplied by the consumer', () => {
      mount({ label: 'Lead center' });
      cy.get('.fch_title').should('contain.text', 'Lead center');
    });

    it('[contract] renders the label as HTML (labels carry <strong> and links)', () => {
      mount({ label: 'Lead <strong>center</strong>' });
      cy.get('.fch_title strong').should('contain.text', 'center');
    });

    it('[contract] tags a required field as Mandatory', () => {
      mount({ required: true });
      cy.get('.fch_tag').should('have.text', 'Mandatory');
    });

    it('[contract] tags an optional field as Optional', () => {
      mount({ required: false });
      cy.get('.fch_tag').should('have.text', 'Optional');
    });

    it('[contract] follows the consumer when [required] flips after mount', () => {
      mount({ required: false });
      cy.get('.fch_tag').should('have.text', 'Optional');

      patchHost(host => (host.required = true));

      cy.get('.fch_tag').should('have.text', 'Mandatory');
    });
  });

  describe('description', () => {
    it('[contract] renders the description under the header', () => {
      mount({ description: 'One sentence, no acronyms.' });
      cy.get('.field_card_desc .desc_text').should('contain.text', 'One sentence, no acronyms.');
    });

    it('[contract] renders the description as HTML', () => {
      mount({ description: 'See the <a href="#" class="guide">guide</a>.' });
      cy.get('.desc_text a.guide').should('contain.text', 'guide');
    });

    it('[contract] renders no description block when there is no description', () => {
      mount({ description: '' });
      cy.get('.field_card_desc').should('not.exist');
    });

    it('[contract] hides the description when the consumer opts out with [showDescription]="false"', () => {
      mount({ showDescription: false });
      cy.get('.field_card_desc').should('not.exist');
    });

    it('[contract] hides the description when the whole header is suppressed', () => {
      mount({ showHeader: false });
      cy.get('.field_card_desc').should('not.exist');
    });
  });

  describe('derived state — this is what colours every field in the app', () => {
    it('[contract] an empty required field is pending', () => {
      mount({ required: true, hasValue: false, hasError: false });
      cy.get('.field_card').should('have.class', 'fc-pending');
    });

    it('[contract] an empty optional field is optional, not pending', () => {
      mount({ required: false, hasValue: false, hasError: false });
      cy.get('.field_card').should('have.class', 'fc-optional').and('not.have.class', 'fc-pending');
    });

    it('[contract] a filled field is done, whether required or optional', () => {
      mount({ required: true, hasValue: true });
      cy.get('.field_card').should('have.class', 'fc-done');

      mount({ required: false, hasValue: true });
      cy.get('.field_card').should('have.class', 'fc-done');
    });

    it('[contract] an error outranks a value (over-limit text is not "done")', () => {
      mount({ required: true, hasValue: true, hasError: true });
      cy.get('.field_card').should('have.class', 'fc-error').and('not.have.class', 'fc-done');
    });

    it('[contract] an explicit [state] overrides everything derived', () => {
      mountCFHost(`<app-field-card label="x" [required]="true" [hasValue]="true" state="pending"></app-field-card>`);
      cy.get('.field_card').should('have.class', 'fc-pending').and('not.have.class', 'fc-done');
    });

    it('[contract] carries exactly one state class at a time', () => {
      mount({ required: true, hasValue: true });
      cy.get('.field_card')
        .invoke('attr', 'class')
        .then(cls => {
          const states = String(cls)
            .split(/\s+/)
            .filter(c => c.startsWith('fc-'));
          expect(states, 'exactly one fc-* state class').to.have.length(1);
        });
    });

    /**
     * The live path: the user types into the projected control and `hasValue` flips. If the
     * card does not repaint, every field in the app stays orange after being filled.
     */
    it('[contract] turns from pending to done as soon as the field gains a value', () => {
      mount({ required: true, hasValue: false });
      cy.get('.field_card').should('have.class', 'fc-pending');

      patchHost(host => (host.hasValue = true));

      cy.get('.field_card').should('have.class', 'fc-done').and('not.have.class', 'fc-pending');
    });

    it('[contract] turns from done to error as soon as the value breaks a rule', () => {
      mount({ required: true, hasValue: true, hasError: false });
      cy.get('.field_card').should('have.class', 'fc-done');

      patchHost(host => (host.hasError = true));

      cy.get('.field_card').should('have.class', 'fc-error');
    });

    it('[contract] returns to done once the error is corrected', () => {
      mount({ required: true, hasValue: true, hasError: true });
      cy.get('.field_card').should('have.class', 'fc-error');

      patchHost(host => (host.hasError = false));

      cy.get('.field_card').should('have.class', 'fc-done').and('not.have.class', 'fc-error');
    });
  });

  describe('colour legend', () => {
    it('[contract] exposes the legend affordance in the header', () => {
      mount();
      cy.get('.fch_info').should('exist').and('have.attr', 'aria-label');
      cy.get('.fch_legend .legend_row').should('have.length', 4);
    });
  });
});
