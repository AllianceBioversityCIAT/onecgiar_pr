import { mountCF, mountCFHost, patchHost, readHost, sharedFieldContracts } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-pr-select` — the most used field in the app (53 consuming screens).
 *
 * These assert how the field is EXPECTED to behave, derived from two external sources:
 *  - the `master` implementation (PrimeNG), in production for years, and
 *  - how the real consumer templates actually use it.
 *
 * They are deliberately NOT derived from the current implementation. A failure here is a
 * defect to report, not a test to soften.
 *
 * Input usage measured across the 53 consumers (drives what is worth covering):
 *   [options] 53 · placeholder 49 · optionValue 48 · optionLabel 48 · [required] 44
 *   [disabled] 21 · [readOnly] 18 · [isStatic] 18 · noDataText 2 · [showClear] 1 · hideSelect 0
 */

const OPTIONS = [
  { code: 'C1', full_name: 'Alliance Bioversity-CIAT' },
  { code: 'C2', full_name: 'IWMI' },
  { code: 'C3', full_name: 'IFPRI' }
];

/** The shape used by the majority of the 53 consumers. */
const FIELD = `
  <app-pr-select
    [options]="options"
    optionLabel="full_name"
    optionValue="code"
    label="Lead Center"
    placeholder="Select a center"
    [required]="required"
    [(ngModel)]="value">
  </app-pr-select>`;

const FIELD_WITH = (extra: string) => `
  <app-pr-select
    [options]="options"
    optionLabel="full_name"
    optionValue="code"
    label="Lead Center"
    placeholder="Select a center"
    [required]="required"
    ${extra}
    [(ngModel)]="value">
  </app-pr-select>`;

/** The dropdown opens through CSS `:focus-within` on the focusable `a.field`, not by clicking the wrapper. */
const openDropdown = () => cy.get('.pr-field a.field').focus();

describe('PrSelectComponent — contract', () => {
  describe('shared field contracts', () => {
    sharedFieldContracts({
      emptyRequired: { template: FIELD, componentProperties: { options: OPTIONS, value: null, required: true } },
      filledRequired: { template: FIELD, componentProperties: { options: OPTIONS, value: 'C1', required: true } },
      optional: { template: FIELD, componentProperties: { options: OPTIONS, value: null, required: false } },
      controlSelector: '.pr-field a.field'
    });
  });

  describe('model synchronisation', () => {
    it('reflects a programmatic model change without user interaction', () => {
      mountCFHost(FIELD, {
        componentProperties: { options: OPTIONS, value: null, required: false },
        editable: true
      });

      cy.contains('Select a center').should('be.visible');

      patchHost(host => (host.value = 'C2'));

      cy.contains('IWMI').should('be.visible');
      cy.contains('Select a center').should('not.exist');
    });

    it('restores the placeholder when the parent clears the model', () => {
      mountCFHost(FIELD, {
        componentProperties: { options: OPTIONS, value: 'C1', required: false },
        editable: true
      });

      cy.contains('Alliance Bioversity-CIAT').should('be.visible');

      patchHost(host => (host.value = null));

      cy.contains('Select a center').should('be.visible');
    });

    it('renders options that arrive after mount (async catalog load)', () => {
      mountCFHost(FIELD, {
        componentProperties: { options: [], value: null, required: false },
        editable: true
      });

      patchHost(host => (host.options = OPTIONS));

      openDropdown();
      cy.contains('IFPRI').should('exist');
    });

    it('stores the optionValue, not the whole option object', () => {
      mountCFHost(FIELD, {
        componentProperties: { options: OPTIONS, value: null, required: false },
        editable: true
      });

      openDropdown();
      cy.contains('IWMI').click();

      readHost(host => host.value).should('eq', 'C2');
    });

    it('replaces the previous selection rather than accumulating (single-value field)', () => {
      mountCFHost(FIELD, {
        componentProperties: { options: OPTIONS, value: 'C1', required: false },
        editable: true
      });

      openDropdown();
      cy.contains('IFPRI').click();

      readHost(host => host.value).should('eq', 'C3');
      cy.contains('Alliance Bioversity-CIAT').should('not.exist');
    });

    it('never mutates the options array owned by the parent', () => {
      // Consumers pass shared catalogs straight from singleton services
      // (CentersService.centersList, InstitutionsService). Mutating them corrupts other screens.
      const original = JSON.parse(JSON.stringify(OPTIONS));

      mountCFHost(FIELD, {
        componentProperties: { options: OPTIONS, value: null, required: false },
        editable: true
      });

      openDropdown();
      cy.contains('IWMI').click();

      readHost(host => host.options).should('deep.equal', original);
    });
  });

  describe('read-only rendering (the app default — RolesService.readOnly is true)', () => {
    it('shows the selected label as text, with no dropdown trigger', () => {
      mountCF(FIELD, { componentProperties: { options: OPTIONS, value: 'C2', required: false } });

      cy.contains('IWMI').should('be.visible');
      cy.get('a.field').should('not.exist');
    });

    it('falls back to "Not provided" for a required field with no value', () => {
      mountCF(FIELD, { componentProperties: { options: OPTIONS, value: null, required: true } });

      cy.contains('Not provided').should('be.visible');
    });

    it('falls back to "Not applicable" for an optional field with no value', () => {
      mountCF(FIELD, { componentProperties: { options: OPTIONS, value: null, required: false } });

      cy.contains('Not applicable').should('be.visible');
    });

    it('prefers noDataText over the generic fallback when supplied', () => {
      mountCF(FIELD_WITH('noDataText="No center reported"'), {
        componentProperties: { options: OPTIONS, value: null, required: true }
      });

      cy.contains('No center reported').should('be.visible');
      cy.contains('Not provided').should('not.exist');
    });
  });

  describe('static rendering', () => {
    it('shows the value without a dropdown even when the user could otherwise edit', () => {
      mountCF(FIELD_WITH('[isStatic]="true"'), {
        componentProperties: { options: OPTIONS, value: 'C3', required: false },
        editable: true
      });

      cy.contains('IFPRI').should('be.visible');
    });
  });

  describe('disabled state', () => {
    it('does not accept a selection while disabled', () => {
      mountCFHost(FIELD_WITH('[disabled]="true"'), {
        componentProperties: { options: OPTIONS, value: null, required: false },
        editable: true
      });

      openDropdown();
      cy.contains('IWMI').click({ force: true });

      readHost(host => host.value).should('eq', null);
    });
  });

  describe('empty and searchable option lists', () => {
    it('tells the user when there is nothing to choose from', () => {
      mountCF(FIELD, {
        componentProperties: { options: [], value: null, required: false },
        editable: true
      });

      openDropdown();
      cy.contains('There are no items available for this list.').should('exist');
    });

    it('filters the visible options without touching the model', () => {
      mountCFHost(FIELD, {
        componentProperties: { options: OPTIONS, value: 'C1', required: false },
        editable: true
      });

      openDropdown();
      cy.get('.search_input_container input').type('IWM');

      cy.contains('IWMI').should('exist');
      cy.contains('IFPRI').should('not.exist');
      readHost(host => host.value).should('eq', 'C1');
    });

    it('restores the full list when the search is cleared', () => {
      mountCF(FIELD, {
        componentProperties: { options: OPTIONS, value: null, required: false },
        editable: true
      });

      openDropdown();
      cy.get('.search_input_container input').type('IWM').clear();

      cy.contains('IFPRI').should('exist');
      cy.contains('Alliance Bioversity-CIAT').should('exist');
    });
  });

  describe('clear affordance', () => {
    it('clears the model when the clear icon is used', () => {
      mountCFHost(FIELD_WITH('[showClear]="true"'), {
        componentProperties: { options: OPTIONS, value: 'C2', required: false },
        editable: true
      });

      cy.get('.pr-select-clear').click();

      readHost(host => host.value).should('eq', null);
      cy.contains('Select a center').should('be.visible');
    });

    it('offers no clear affordance while the field is empty', () => {
      mountCF(FIELD_WITH('[showClear]="true"'), {
        componentProperties: { options: OPTIONS, value: null, required: false },
        editable: true
      });

      cy.get('.pr-select-clear').should('not.exist');
    });
  });
});
