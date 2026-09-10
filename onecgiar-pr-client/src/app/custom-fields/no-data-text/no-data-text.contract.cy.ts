import { mountCFHost, patchHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-no-data-text` (25 consuming templates — the empty-state line every
 * list section shows when it has nothing to display).
 *
 * Source of truth
 * ---------------
 * `master` — the component is BYTE-IDENTICAL there
 * (`git diff master -- src/app/custom-fields/no-data-text/*` -> empty).
 *
 * Real consumer shape (the only one): `title` is passed as a plain string or an interpolated
 * expression, sometimes carrying markup, and the element is placed behind an `*ngIf` on the
 * list length. So the contract is small but load-bearing: whatever the consumer passes must be
 * rendered as HTML, and it must follow the binding when the message changes.
 */

describe('NoDataTextComponent — contract', () => {
  it('[contract] renders the message supplied by the consumer', () => {
    mountCFHost(`<app-no-data-text title="No partners have been added yet."></app-no-data-text>`);
    cy.get('.no_data_text').should('have.text', 'No partners have been added yet.');
  });

  it('[contract] renders the message as HTML — consumers embed <strong> and links', () => {
    mountCFHost(`<app-no-data-text [title]="title"></app-no-data-text>`, {
      componentProperties: { title: 'No results. <a href="#" class="cta">Create one</a>.' }
    });
    cy.get('.no_data_text a.cta').should('contain.text', 'Create one');
    cy.get('.no_data_text').should('not.contain.text', '<a href');
  });

  it('[contract] renders an empty line rather than crashing when no title is supplied', () => {
    mountCFHost(`<app-no-data-text></app-no-data-text>`);
    cy.get('.no_data_text').should('exist').and('have.text', '');
  });

  it('[contract] follows the consumer when the message changes after mount', () => {
    mountCFHost(`<app-no-data-text [title]="title"></app-no-data-text>`, {
      componentProperties: { title: 'Loading…' }
    });
    cy.get('.no_data_text').should('have.text', 'Loading…');

    patchHost(host => (host.title = 'No data found.'));

    cy.get('.no_data_text').should('have.text', 'No data found.');
  });

  it('[contract] renders no interactive control — it is a message, not a field', () => {
    mountCFHost(`<app-no-data-text title="Nothing here"></app-no-data-text>`, { editable: true });
    cy.get('app-no-data-text').find('input, select, textarea, button').should('not.exist');
  });
});
