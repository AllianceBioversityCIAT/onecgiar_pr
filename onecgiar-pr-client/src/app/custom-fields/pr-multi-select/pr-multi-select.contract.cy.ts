import { mountCF, mountCFHost, patchHost, readHost, sharedFieldContracts } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for <app-pr-multi-select> — priority 1 of `harden-custom-fields-ct`.
 *
 * These are deliberately written from an EXTERNAL source of truth, never from reading the
 * current implementation:
 *
 *  1. `git show master:onecgiar-pr-client/src/app/custom-fields/pr-multi-select/*` — the PrimeNG
 *     implementation that has been in production for years. Its *observable behaviour* is the
 *     specification of record (design D1). Its markup/selectors are NOT copied — PrimeNG is gone.
 *  2. The measured usage across the 34 consumer templates:
 *     [options] 34 · optionValue= 31 · [required] 27 · label= 26 · optionLabel= 25 · placeholder= 23
 *     selectedLabel= 15 · [readOnly] 11 · [disableOptions] 10 · [isStatic] 7
 *     [confirmDeletion] 4 · [showSelectAll] 2 · [logicalDeletion] 1 · [cannotRemoveOptionValues] 1
 *
 * A failing test here is the DELIVERABLE, not a problem: production code is not touched and no
 * assertion is softened to reach green (design D3). Every red is triaged in the handover report.
 *
 * The existing `pr-multi-select.cy.ts` is left untouched — it is the descriptive smoke suite.
 */

/* ------------------------------------------------------------------ *
 * Fixtures — modelled on the canonical consumer (Contributing CGIAR Centers)
 * ------------------------------------------------------------------ */

interface Center {
  code: string;
  full_name: string;
  [k: string]: any;
}

/** Fresh option catalog per test, so one test can never pollute the next. */
const centers = (): Center[] => [
  { code: 'C1', full_name: 'Alpha Center' },
  { code: 'C2', full_name: 'Beta Center' },
  { code: 'C3', full_name: 'Gamma Center' },
  { code: 'C4', full_name: 'Delta Institute' }
];

/** The canonical real-world template (see `rd-contributors-and-partners`). */
const TEMPLATE = `
  <app-pr-multi-select
    [options]="options"
    label="Contributing CGIAR Centers"
    selectedLabel="Center(s) selected"
    selectedOptionLabel="full_name"
    optionLabel="full_name"
    optionValue="code"
    placeholder="Select center(s)"
    [required]="required"
    [isStatic]="isStatic"
    [disableOptions]="disableOptions"
    [cannotRemoveOptionValues]="cannotRemoveOptionValues"
    [confirmDeletion]="confirmDeletion"
    [logicalDeletion]="logicalDeletion"
    [showSelectAll]="showSelectAll"
    [(ngModel)]="value"
    (selectOptionEvent)="onSelect($event)"
    (removeOptionEvent)="onRemove($event)">
  </app-pr-multi-select>
`;

function props(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    options: centers(),
    value: [],
    required: false,
    isStatic: false,
    disableOptions: [],
    cannotRemoveOptionValues: [],
    confirmDeletion: false,
    logicalDeletion: false,
    showSelectAll: false,
    selectEvents: [] as any[],
    removeEvents: [] as any[],
    onSelect(event: any) {
      this.selectEvents.push(event);
    },
    onRemove(event: any) {
      this.removeEvents.push(event);
    },
    ...overrides
  };
}

function mountField(overrides: Record<string, any> = {}, editable = true) {
  return mountCFHost(TEMPLATE, { componentProperties: props(overrides), editable });
}

/* ------------------------------------------------------------------ *
 * DOM helpers — the dropdown opens via CSS `:focus-within` on `a.field`
 * (tabindex=0), NOT by clicking the wrapper. Options live inside a
 * `cdk-virtual-scroll-viewport` (200px tall, itemSize 30 → ~7 rows), so
 * fixtures stay at 4 options to keep every row rendered.
 * ------------------------------------------------------------------ */

function openDropdown() {
  cy.get('.custom_select a.field').should('exist').focus();
  cy.get('.custom_select a.field .options').should('be.visible');
}

function optionRow(label: string) {
  return cy.contains('.custom_select .options .option', label);
}

function optionCheckbox(label: string) {
  return optionRow(label).find('input[type="checkbox"]');
}

function chips() {
  return cy.get('.selected_container .pr_chip_selected');
}

function chip(label: string) {
  return cy.contains('.selected_container .pr_chip_selected', label);
}

function searchInput() {
  return cy.get('.custom_select .options .search_input_container input');
}

/** Model entry ids, in order. */
const ids = (value: any[]) => (value || []).map((v: any) => (typeof v === 'object' && v !== null ? v.code : v));

describe('PrMultiSelectComponent — CONTRACT (34 consumers)', () => {
  /* ================================================================
   * Shared field contracts (design D4 / task 1.3)
   * Read-only gate + the `.pr-field.mandatory` / `.complete` DOM that
   * DataControlService.someMandatoryFieldIncompleteResultDetail() scans.
   * ================================================================ */
  describe('shared field contracts', () => {
    sharedFieldContracts({
      emptyRequired: {
        template: TEMPLATE,
        componentProperties: props({ required: true, value: [] })
      },
      filledRequired: {
        template: TEMPLATE,
        componentProperties: props({ required: true, value: [{ code: 'C1', full_name: 'Alpha Center' }] })
      },
      optional: {
        template: TEMPLATE,
        componentProperties: props({ required: false, value: [] })
      },
      controlSelector: '.custom_select a.field'
    });
  });

  /* ================================================================
   * 2.1 — Model synchronisation
   * master evidence: `onSelectOption()` pushes `{...option, new: true, is_active: true}`
   * into `value` and emits `selectOptionEvent({ option })` exactly once; deselecting
   * filters the entry out. Identity is carried by `optionValue`.
   * ================================================================ */
  describe('2.1 model synchronisation', () => {
    it('selecting an option checks it, stores it by optionValue and emits selectOptionEvent once', () => {
      mountField();
      openDropdown();

      optionCheckbox('Beta Center').should('not.be.checked');
      optionRow('Beta Center').find('.label').click();

      optionCheckbox('Beta Center').should('be.checked');
      readHost(h => ids(h.value)).should('deep.equal', ['C2']);
      readHost(h => h.selectEvents.length).should('eq', 1);
    });

    it('selecting through the native checkbox behaves identically (single emission, no double toggle)', () => {
      mountField();
      openDropdown();

      optionCheckbox('Gamma Center').click();

      optionCheckbox('Gamma Center').should('be.checked');
      readHost(h => ids(h.value)).should('deep.equal', ['C3']);
      readHost(h => h.selectEvents.length).should('eq', 1);
    });

    it('deselecting from inside the dropdown unchecks it and removes it from the bound model', () => {
      mountField({ value: [{ code: 'C1', full_name: 'Alpha Center' }] });
      openDropdown();
      optionCheckbox('Alpha Center').should('be.checked');

      optionRow('Alpha Center').find('.label').click();

      optionCheckbox('Alpha Center').should('not.be.checked');
      readHost(h => ids(h.value)).should('deep.equal', []);
    });

    it('pre-existing model values render as checked on mount and the count label reflects them', () => {
      mountField({
        value: [
          { code: 'C1', full_name: 'Alpha Center' },
          { code: 'C3', full_name: 'Gamma Center' }
        ]
      });
      openDropdown();

      optionCheckbox('Alpha Center').should('be.checked');
      optionCheckbox('Beta Center').should('not.be.checked');
      optionCheckbox('Gamma Center').should('be.checked');
      optionCheckbox('Delta Institute').should('not.be.checked');
      cy.get('.selected_container .pr_description').should('contain.text', 'Center(s) selected (2)');
    });

    it('a model of RAW optionValues (not objects) renders as checked — master maps ids to options in writeValue', () => {
      mountField({ value: ['C2', 'C4'] });
      openDropdown();

      optionCheckbox('Beta Center').should('be.checked');
      optionCheckbox('Delta Institute').should('be.checked');
      optionCheckbox('Alpha Center').should('not.be.checked');
    });

    it('selecting several options preserves insertion order in the model', () => {
      mountField();
      openDropdown();

      optionRow('Gamma Center').find('.label').click();
      optionRow('Alpha Center').find('.label').click();
      optionRow('Delta Institute').find('.label').click();

      readHost(h => ids(h.value)).should('deep.equal', ['C3', 'C1', 'C4']);
    });
  });

  /* ================================================================
   * 2.2 — External in-place mutation (THE known regression path)
   * A parent deselects with `partnersBody.contributing_center.splice(i, 1)`.
   * The array reference does not change, so `writeValue` never fires; the
   * dropdown must still re-derive its checkboxes.
   * ================================================================ */
  describe('2.2 external in-place mutation', () => {
    it('an external splice() unchecks the option without user interaction', () => {
      mountField({
        value: [
          { code: 'C1', full_name: 'Alpha Center' },
          { code: 'C2', full_name: 'Beta Center' }
        ]
      });
      openDropdown();
      optionCheckbox('Alpha Center').should('be.checked');
      optionCheckbox('Beta Center').should('be.checked');

      patchHost(host => host.value.splice(0, 1));

      optionCheckbox('Alpha Center').should('not.be.checked');
      optionCheckbox('Beta Center').should('be.checked');
    });

    it('an external splice() decreases the selected-count label', () => {
      mountField({
        value: [
          { code: 'C1', full_name: 'Alpha Center' },
          { code: 'C2', full_name: 'Beta Center' }
        ]
      });
      cy.get('.selected_container .pr_description').should('contain.text', 'Center(s) selected (2)');

      patchHost(host => host.value.splice(0, 1));

      cy.get('.selected_container .pr_description').should('contain.text', 'Center(s) selected (1)');
      chips().should('have.length', 1);
    });

    it('an external push() checks the matching option', () => {
      mountField({ value: [{ code: 'C1', full_name: 'Alpha Center' }] });
      openDropdown();
      optionCheckbox('Delta Institute').should('not.be.checked');

      patchHost(host => host.value.push({ code: 'C4', full_name: 'Delta Institute' }));

      optionCheckbox('Delta Institute').should('be.checked');
      optionCheckbox('Alpha Center').should('be.checked');
    });

    it('a wholesale reassignment of the bound model re-renders the checkboxes', () => {
      mountField({ value: [{ code: 'C1', full_name: 'Alpha Center' }] });
      openDropdown();

      patchHost(host => {
        host.value = [{ code: 'C3', full_name: 'Gamma Center' }];
      });

      optionCheckbox('Alpha Center').should('not.be.checked');
      optionCheckbox('Gamma Center').should('be.checked');
    });
  });

  /* ================================================================
   * 2.3 — Options arriving after mount (every real consumer feeds them
   * from an async CLARISA call, so `[]` is the first render).
   * ================================================================ */
  describe('2.3 late-arriving options', () => {
    it('renders options that are supplied after the first render', () => {
      mountField({ options: [] });
      openDropdown();
      cy.get('.custom_select .options .no_info').should('contain.text', 'No information found');

      patchHost(host => {
        host.options = centers();
      });

      optionRow('Alpha Center').should('exist');
      optionRow('Beta Center').should('exist');
      optionRow('Gamma Center').should('exist');
      optionRow('Delta Institute').should('exist');
    });

    it('a model value present before the options arrive renders checked once they do (object entries)', () => {
      mountField({ options: [], value: [{ code: 'C2', full_name: 'Beta Center' }] });
      openDropdown();

      patchHost(host => {
        host.options = centers();
      });

      optionCheckbox('Beta Center').should('be.checked');
    });

    it('a model of RAW optionValues survives the options arriving late', () => {
      // The real async shape: the parent restores `['C2']` from the API before the CLARISA
      // catalog resolves. master maps ids -> options in writeValue and DROPS unmatched ids
      // (`.filter(Boolean)`), so this path is fragile by construction — it is asserted here
      // because the selection must not be silently lost.
      mountField({ options: [], value: ['C2'] });
      openDropdown();

      patchHost(host => {
        host.options = centers();
      });

      optionCheckbox('Beta Center').should('be.checked');
    });
  });

  /* ================================================================
   * 2.4 — The parent's `[options]` array is read-only input.
   * Consumers pass singleton catalogs (`CentersService.centersList`,
   * `InstitutionsService`), so any mutation corrupts unrelated screens.
   * ================================================================ */
  describe('2.4 immutability of [options]', () => {
    it('select/deselect cycles leave the parent array identical in reference, length, order and item identity', () => {
      const sourceOptions = centers();
      const snapshot = [...sourceOptions];

      mountField({ options: sourceOptions });
      openDropdown();

      optionRow('Alpha Center').find('.label').click();
      optionRow('Gamma Center').find('.label').click();
      optionRow('Alpha Center').find('.label').click();

      readHost(h => h.options).should('equal', sourceOptions);
      cy.wrap(null).then(() => {
        expect(sourceOptions).to.have.length(snapshot.length);
        snapshot.forEach((original, index) => {
          expect(sourceOptions[index], `option #${index} identity`).to.equal(original);
        });
      });
    });

    it('never writes `selected` / `disabled` flags onto the parent option objects', () => {
      const sourceOptions = centers();

      mountField({ options: sourceOptions, disableOptions: [{ code: 'C4' }] });
      openDropdown();
      optionRow('Beta Center').find('.label').click();

      optionCheckbox('Beta Center').should('be.checked');
      cy.wrap(null).then(() => {
        sourceOptions.forEach(option => {
          expect(option, `${option.code} must stay clean`).to.not.have.property('selected');
          expect(option, `${option.code} must stay clean`).to.not.have.property('disabled');
        });
      });
    });
  });

  /* ================================================================
   * 2.5 — [disableOptions] (10 consumers; e.g. CGSpace-locked centers)
   * master evidence: the getter flags matching options `disabled = true`
   * and `onSelectOption()` returns early when `option.disabled`.
   * ================================================================ */
  describe('2.5 [disableOptions]', () => {
    it('keeps a disabled option visible but refuses to select it', () => {
      mountField({ disableOptions: [{ code: 'C2' }] });
      openDropdown();

      optionRow('Beta Center').should('be.visible').and('have.class', 'disabled');
      optionRow('Beta Center').find('.label').click();

      optionCheckbox('Beta Center').should('not.be.checked');
      readHost(h => ids(h.value)).should('deep.equal', []);
    });

    it('disables the native checkbox of a disabled option', () => {
      mountField({ disableOptions: [{ code: 'C2' }] });
      openDropdown();

      optionCheckbox('Beta Center').should('be.disabled');
      optionCheckbox('Alpha Center').should('not.be.disabled');
    });

    it('leaves every other option selectable', () => {
      mountField({ disableOptions: [{ code: 'C2' }] });
      openDropdown();

      optionRow('Alpha Center').find('.label').click();

      optionCheckbox('Alpha Center').should('be.checked');
      readHost(h => ids(h.value)).should('deep.equal', ['C1']);
    });
  });

  /* ================================================================
   * 2.6 — [cannotRemoveOptionValues] (rd-contributors-and-partners pins
   * the lead center with it). Contract source: the consumer's need.
   * ================================================================ */
  describe('2.6 [cannotRemoveOptionValues]', () => {
    it('renders the protected chip without a remove affordance', () => {
      mountField({
        cannotRemoveOptionValues: ['C1'],
        value: [
          { code: 'C1', full_name: 'Alpha Center' },
          { code: 'C2', full_name: 'Beta Center' }
        ]
      });

      chip('Alpha Center').find('i.material-icons-round').should('not.exist');
      chip('Beta Center').find('i.material-icons-round').should('exist');
    });

    it('keeps the protected value in the model when it is deselected from the dropdown', () => {
      mountField({
        cannotRemoveOptionValues: ['C1'],
        value: [
          { code: 'C1', full_name: 'Alpha Center' },
          { code: 'C2', full_name: 'Beta Center' }
        ]
      });
      openDropdown();
      optionCheckbox('Alpha Center').should('be.checked');

      optionRow('Alpha Center').find('.label').click();

      readHost(h => ids(h.value)).should('include', 'C1');
      optionCheckbox('Alpha Center').should('be.checked');
    });

    it('still allows unprotected values to be removed from the chip', () => {
      mountField({
        cannotRemoveOptionValues: ['C1'],
        value: [
          { code: 'C1', full_name: 'Alpha Center' },
          { code: 'C2', full_name: 'Beta Center' }
        ]
      });

      chip('Beta Center').find('i.material-icons-round').click();

      readHost(h => ids(h.value)).should('deep.equal', ['C1']);
    });
  });

  /* ================================================================
   * 2.7 — Deletion guards: [confirmDeletion] (4 consumers) and
   * [logicalDeletion] (1 consumer).
   * ================================================================ */
  describe('2.7 deletion guards', () => {
    // CustomizedAlertsFeService injects its markup into `document.getElementsByTagName('app-root')[0]`.
    // The CT harness mounts into `[data-cy-root]`, so the host element has to exist for the
    // confirmation to be reachable at all. This is harness setup, not a relaxed assertion.
    beforeEach(() => {
      cy.document().then(doc => {
        doc.querySelectorAll('app-root').forEach(node => node.remove());
        doc.body.appendChild(doc.createElement('app-root'));
      });
    });

    it('[confirmDeletion] does not remove the value until the confirmation is accepted', () => {
      mountField({
        confirmDeletion: true,
        value: [{ code: 'C1', full_name: 'Alpha Center', new: true, is_active: true }]
      });

      chip('Alpha Center').find('i.material-icons-round').click();

      cy.get('#confirm-delete-item').should('exist');
      readHost(h => ids(h.value)).should('deep.equal', ['C1']);
    });

    it('[confirmDeletion] leaves the model unchanged when the confirmation is dismissed', () => {
      mountField({
        confirmDeletion: true,
        value: [{ code: 'C1', full_name: 'Alpha Center', new: true, is_active: true }]
      });

      chip('Alpha Center').find('i.material-icons-round').click();
      cy.get('#cancel-confirm-delete-item').click();

      readHost(h => ids(h.value)).should('deep.equal', ['C1']);
      chip('Alpha Center').should('exist');
    });

    it('[confirmDeletion] removes the value once the confirmation is accepted', () => {
      mountField({
        confirmDeletion: true,
        value: [{ code: 'C1', full_name: 'Alpha Center', new: true, is_active: true }]
      });

      chip('Alpha Center').find('i.material-icons-round').click();
      cy.get('#confirm-confirm-delete-item').click();

      readHost(h => ids(h.value)).should('deep.equal', []);
    });

    it('[logicalDeletion] flags the entry as inactive instead of splicing it out', () => {
      mountField({
        logicalDeletion: true,
        value: [{ code: 'C1', full_name: 'Alpha Center', is_active: true }]
      });

      chip('Alpha Center').find('i.material-icons-round').click();

      readHost(h => h.value.length).should('eq', 1);
      readHost(h => h.value[0].is_active).should('eq', false);
    });

    it('[logicalDeletion] unchecks the dropdown option once the entry is flagged inactive', () => {
      mountField({
        logicalDeletion: true,
        value: [{ code: 'C1', full_name: 'Alpha Center', is_active: true }]
      });

      chip('Alpha Center').find('i.material-icons-round').click();
      openDropdown();

      optionCheckbox('Alpha Center').should('not.be.checked');
    });
  });

  /* ================================================================
   * 2.8 — [showSelectAll] (2 consumers)
   * ================================================================ */
  describe('2.8 [showSelectAll]', () => {
    it('checks every enabled option and puts them all in the model', () => {
      mountField({ showSelectAll: true });
      openDropdown();

      cy.get('.bulk_selector').should('contain.text', 'Select all').click();

      optionCheckbox('Alpha Center').should('be.checked');
      optionCheckbox('Beta Center').should('be.checked');
      optionCheckbox('Gamma Center').should('be.checked');
      optionCheckbox('Delta Institute').should('be.checked');
      readHost(h => ids(h.value)).should('deep.equal', ['C1', 'C2', 'C3', 'C4']);
    });

    it('does NOT add options listed in [disableOptions]', () => {
      mountField({ showSelectAll: true, disableOptions: [{ code: 'C4' }] });
      openDropdown();

      cy.get('.bulk_selector').click();

      readHost(h => ids(h.value)).should('not.include', 'C4');
      optionCheckbox('Delta Institute').should('not.be.checked');
    });

    it('deselect-all clears the removable selection but retains protected values', () => {
      mountField({ showSelectAll: true, cannotRemoveOptionValues: ['C1'] });
      openDropdown();

      cy.get('.bulk_selector').click();
      readHost(h => h.value.length).should('eq', 4);

      cy.get('.bulk_selector').should('contain.text', 'Unselect all').click();

      readHost(h => ids(h.value)).should('deep.equal', ['C1']);
    });
  });

  /* ================================================================
   * 2.9 — In-dropdown search is a VIEW filter only.
   * ================================================================ */
  describe('2.9 search', () => {
    it('narrows the list without touching the bound model', () => {
      mountField({ value: [{ code: 'C1', full_name: 'Alpha Center' }] });
      openDropdown();

      searchInput().type('Delta');

      optionRow('Delta Institute').should('exist');
      cy.get('.custom_select .options .option').should('have.length', 1);
      readHost(h => ids(h.value)).should('deep.equal', ['C1']);
    });

    it('restores the full list with the original checkboxes still checked when the search is cleared', () => {
      mountField({ value: [{ code: 'C1', full_name: 'Alpha Center' }] });
      openDropdown();

      searchInput().type('Delta');
      cy.get('.custom_select .options .option').should('have.length', 1);
      searchInput().clear();

      cy.get('.custom_select .options .option').should('have.length', 4);
      optionCheckbox('Alpha Center').should('be.checked');
    });

    it('shows the empty state when nothing matches, without dropping the selection', () => {
      mountField({ value: [{ code: 'C1', full_name: 'Alpha Center' }] });
      openDropdown();

      searchInput().type('zzzz-no-match');

      cy.get('.custom_select .options .no_info').should('contain.text', 'No information found');
      readHost(h => ids(h.value)).should('deep.equal', ['C1']);
    });

    it('selecting a filtered match APPENDS to the existing selection instead of replacing it', () => {
      mountField({ value: [{ code: 'C1', full_name: 'Alpha Center' }] });
      openDropdown();

      searchInput().type('Gamma');
      optionRow('Gamma Center').find('.label').click();

      readHost(h => ids(h.value)).should('deep.equal', ['C1', 'C3']);
    });
  });

  /* ================================================================
   * 2.10 — Labels, placeholder and counts
   * master evidence: `.select_placeholder` renders `placeholder` as the
   * permanent trigger caption; the selection is surfaced separately by
   * `selectedLabelDescription()` -> "<selectedLabel> (<n>)" plus chips.
   * ================================================================ */
  describe('2.10 labels, placeholder and counts', () => {
    it('renders the configured label and placeholder', () => {
      mountField();

      cy.get('.pr_label').first().should('contain.text', 'Contributing CGIAR Centers');
      cy.get('.custom_select .select_placeholder').should('contain.text', 'Select center(s)');
    });

    it('reports the number of selections using selectedLabel', () => {
      mountField({
        value: [
          { code: 'C1', full_name: 'Alpha Center' },
          { code: 'C2', full_name: 'Beta Center' }
        ]
      });

      cy.get('.selected_container .pr_description').should('contain.text', 'Center(s) selected (2)');
    });

    it('keeps the count in step with the selection made through the dropdown', () => {
      mountField();
      cy.get('.selected_container .pr_description').should('contain.text', 'Center(s) selected (0)');

      openDropdown();
      optionRow('Alpha Center').find('.label').click();

      cy.get('.selected_container .pr_description').should('contain.text', 'Center(s) selected (1)');
      chip('Alpha Center').should('exist');
    });

    it('renders one chip per selected value using selectedOptionLabel', () => {
      mountField({
        value: [
          { code: 'C1', full_name: 'Alpha Center' },
          { code: 'C4', full_name: 'Delta Institute' }
        ]
      });

      chips().should('have.length', 2);
      chip('Alpha Center').should('exist');
      chip('Delta Institute').should('exist');
    });
  });

  /* ================================================================
   * Read-only and [isStatic] (11 and 7 consumers)
   * ================================================================ */
  describe('read-only and [isStatic]', () => {
    it('hides the dropdown trigger when RolesService.readOnly is true (the app default)', () => {
      mountCF(TEMPLATE, {
        componentProperties: props({ value: [{ code: 'C1', full_name: 'Alpha Center' }] })
      });

      cy.get('.custom_select a.field').should('not.exist');
      chip('Alpha Center').should('exist');
    });

    it('hides the dropdown trigger when [readOnly] is set on the field itself', () => {
      mountCF(
        `<app-pr-multi-select [options]="options" optionValue="code" optionLabel="full_name"
            label="Contributing CGIAR Centers" selectedLabel="Center(s) selected"
            selectedOptionLabel="full_name" placeholder="Select center(s)"
            [readOnly]="true" [(ngModel)]="value"></app-pr-multi-select>`,
        {
          componentProperties: props({ value: [{ code: 'C1', full_name: 'Alpha Center' }] }),
          editable: true
        }
      );

      cy.get('.custom_select a.field').should('not.exist');
      chip('Alpha Center').should('exist');
    });

    it('read-only still shows the selected values as text, with no remove affordance', () => {
      mountCF(TEMPLATE, {
        componentProperties: props({
          value: [
            { code: 'C1', full_name: 'Alpha Center' },
            { code: 'C2', full_name: 'Beta Center' }
          ]
        })
      });

      chips().should('have.length', 2);
      cy.get('.selected_container .pr_chip_selected i.material-icons-round').should('not.exist');
    });

    it('[isStatic] lists the selected values and exposes no remove affordance', () => {
      mountField(
        {
          isStatic: true,
          value: [
            { code: 'C1', full_name: 'Alpha Center' },
            { code: 'C2', full_name: 'Beta Center' }
          ]
        },
        true
      );

      chips().should('have.length', 2);
      cy.get('.selected_container .pr_chip_selected i.material-icons-round').should('not.exist');
    });

    it('[isStatic] does not open an editable dropdown', () => {
      mountField(
        {
          isStatic: true,
          value: [{ code: 'C1', full_name: 'Alpha Center' }]
        },
        true
      );

      cy.get('.custom_select a.field').focus();
      cy.get('.custom_select a.field .options').should('not.be.visible');
    });
  });
});
