import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RolesService } from '../../shared/services/global/roles.service';
import { CustomFieldsModule } from '../custom-fields.module';

/**
 * Component tests for <app-pr-multi-select> (signals refactor).
 *
 * These run in a REAL browser (Cypress CT), which is exactly what this component
 * needs: it renders through a CSS `:focus-within` dropdown + a CDK virtual scroll
 * viewport that jsdom/Jest cannot lay out. The star test is the regression that
 * shipped as a bug: deselecting from OUTSIDE (parent mutates the bound array in
 * place with `.splice`) must uncheck the dropdown checkbox.
 */

interface Center {
  code: string;
  full_name: string;
}

const OPTIONS: Center[] = [
  { code: 'C1', full_name: 'Center 1' },
  { code: 'C2', full_name: 'Center 2' },
  { code: 'C3', full_name: 'Center 3' }
];

const TEMPLATE = `
  <app-pr-multi-select
    [options]="options"
    optionValue="code"
    optionLabel="full_name"
    placeholder="Select centers"
    label="Centers"
    selectedLabel="Selected"
    selectedOptionLabel="full_name"
    [showSelectAll]="showSelectAll"
    [(ngModel)]="model">
  </app-pr-multi-select>
`;

/** Mount the field, then flip the global read-only flag so the interactive dropdown renders. */
function mountMultiSelect(model: Center[], showSelectAll = false) {
  return cy
    .mount(TEMPLATE, {
      imports: [CustomFieldsModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideRouter([])],
      componentProperties: { options: OPTIONS, model, showSelectAll }
    })
    .then(wrapper => {
      const roles = wrapper.fixture.debugElement.injector.get(RolesService);
      roles.readOnly = false;
      wrapper.fixture.detectChanges();
      return cy.wrap(wrapper);
    });
}

// SIP-T-4: template variant that WIRES `(searchTextChange)` — this is what an opted-in
// server-search consumer's template looks like (SIP-T-3). The other ~78 real call sites don't
// bind this output and are covered by the default `TEMPLATE`/`mountMultiSelect` above.
const TEMPLATE_WIRED = `
  <app-pr-multi-select
    [options]="options"
    optionValue="code"
    optionLabel="full_name"
    placeholder="Select centers"
    label="Centers"
    selectedLabel="Selected"
    selectedOptionLabel="full_name"
    [showSelectAll]="showSelectAll"
    [serverSearchDebounceMs]="serverSearchDebounceMs"
    (searchTextChange)="onSearchTextChange($event)"
    [(ngModel)]="model">
  </app-pr-multi-select>
`;

/** Mount with `(searchTextChange)` bound — exercises the SIP-T-3 server-search opt-in path. */
function mountMultiSelectWired(model: Center[], onSearchTextChange: (term: string) => void) {
  return cy
    .mount(TEMPLATE_WIRED, {
      imports: [CustomFieldsModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideRouter([])],
      componentProperties: { options: OPTIONS, model, showSelectAll: false, serverSearchDebounceMs: 30, onSearchTextChange }
    })
    .then(wrapper => {
      const roles = wrapper.fixture.debugElement.injector.get(RolesService);
      roles.readOnly = false;
      wrapper.fixture.detectChanges();
      return cy.wrap(wrapper);
    });
}

// SIP-T-7: template variant that binds `[resultPickerStyle]="true"` — this is what the
// `rd-annual-updating` merge/split pickers' template looks like (the only real consumer today).
// The other ~78 real call sites don't bind this input and are covered by the default
// `TEMPLATE`/`mountMultiSelect` above.
const TEMPLATE_RESULT_PICKER_STYLE = `
  <app-pr-multi-select
    [options]="options"
    optionValue="code"
    optionLabel="full_name"
    placeholder="Select centers"
    label="Centers"
    selectedLabel="Selected"
    selectedOptionLabel="full_name"
    [showSelectAll]="showSelectAll"
    [resultPickerStyle]="true"
    [(ngModel)]="model">
  </app-pr-multi-select>
`;

/** Mount with `[resultPickerStyle]="true"` — exercises the SIP-T-7 visual variant opt-in path. */
function mountMultiSelectResultPickerStyle(model: Center[]) {
  return cy
    .mount(TEMPLATE_RESULT_PICKER_STYLE, {
      imports: [CustomFieldsModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideRouter([])],
      componentProperties: { options: OPTIONS, model, showSelectAll: false }
    })
    .then(wrapper => {
      const roles = wrapper.fixture.debugElement.injector.get(RolesService);
      roles.readOnly = false;
      wrapper.fixture.detectChanges();
      return cy.wrap(wrapper);
    });
}

/** Open the dropdown (the `.options` panel is shown via `:focus-within`). */
function openDropdown() {
  cy.get('.custom_select .field').should('exist').focus();
  cy.get('.custom_select .field .options').should('be.visible');
}

/** The native checkbox inside the row whose label matches `label`. */
function checkbox(label: string) {
  return cy.contains('.options .option', label).find('input[type="checkbox"]');
}

describe('PrMultiSelectComponent (CT)', () => {
  it('renders the options passed by the parent', () => {
    mountMultiSelect([]);
    openDropdown();
    cy.contains('.options .option', 'Center 1').should('exist');
    cy.contains('.options .option', 'Center 2').should('exist');
    cy.contains('.options .option', 'Center 3').should('exist');
  });

  it('marks options already present in the bound value as checked', () => {
    mountMultiSelect([{ code: 'C1', full_name: 'Center 1' }]);
    openDropdown();
    checkbox('Center 1').should('be.checked');
    checkbox('Center 2').should('not.be.checked');
    checkbox('Center 3').should('not.be.checked');
  });

  it('selecting an option checks it and pushes it into the bound model', () => {
    mountMultiSelect([]).then(wrapper => {
      openDropdown();
      cy.contains('.options .option', 'Center 2')
        .find('.label')
        .click();

      checkbox('Center 2').should('be.checked');
      cy.wrap(null).then(() => {
        expect((wrapper.component as any).model.map((c: Center) => c.code)).to.deep.equal(['C2']);
      });
    });
  });

  it('deselecting from inside the dropdown unchecks it and removes it from the model', () => {
    mountMultiSelect([{ code: 'C1', full_name: 'Center 1' }]).then(wrapper => {
      openDropdown();
      checkbox('Center 1').should('be.checked');

      cy.contains('.options .option', 'Center 1').find('.label').click();

      checkbox('Center 1').should('not.be.checked');
      cy.wrap(null).then(() => {
        expect((wrapper.component as any).model.length).to.equal(0);
      });
    });
  });

  // ⭐ Regression (the bug the user caught): a parent deselects by mutating the bound
  // array IN PLACE (`model.splice(...)`), which keeps the same reference and never
  // triggers writeValue. The dropdown checkbox must still reflect the removal.
  it('reflects an EXTERNAL in-place removal (splice) by unchecking the dropdown checkbox', () => {
    mountMultiSelect([
      { code: 'C1', full_name: 'Center 1' },
      { code: 'C2', full_name: 'Center 2' }
    ]).then(wrapper => {
      openDropdown();
      checkbox('Center 1').should('be.checked');
      checkbox('Center 2').should('be.checked');

      // Parent removes C1 in place (same array reference — no writeValue fires).
      cy.wrap(null).then(() => {
        (wrapper.component as any).model.splice(0, 1);
        wrapper.fixture.detectChanges();
      });

      checkbox('Center 1').should('not.be.checked');
      checkbox('Center 2').should('be.checked');
    });
  });

  it('never mutates the original options array passed by the parent', () => {
    mountMultiSelect([{ code: 'C1', full_name: 'Center 1' }]).then(() => {
      openDropdown();
      checkbox('Center 1').should('be.checked');
      // The parent's OPTIONS objects must stay clean (no `selected`/`disabled` leaking in).
      cy.wrap(null).then(() => {
        expect(OPTIONS[0]).to.not.have.property('selected');
        expect(OPTIONS[0]).to.not.have.property('disabled');
      });
    });
  });

  it('"Select all" checks every option', () => {
    mountMultiSelect([], true).then(wrapper => {
      openDropdown();
      cy.get('.bulk_selector').should('contain.text', 'Select all').click();

      checkbox('Center 1').should('be.checked');
      checkbox('Center 2').should('be.checked');
      checkbox('Center 3').should('be.checked');
      cy.wrap(null).then(() => {
        expect((wrapper.component as any).model.length).to.equal(3);
      });
    });
  });

  // SIP-T-4 (wired mode): proves SIP-R-5/SIP-R-10 — typing emits the trimmed, debounced term via
  // `(searchTextChange)`, and local filtering is bypassed (the parent owns filtering by replacing
  // `[options]`; while wired, the dropdown must NOT hide non-matching options locally, or it would
  // double-filter against whatever the parent already sent).
  it('wired mode: emits the trimmed, debounced search term and bypasses local filtering', () => {
    const onSearchTextChange = cy.stub().as('searchTextChange');
    mountMultiSelectWired([], onSearchTextChange).then(() => {
      openDropdown();

      cy.get('.search_input_container input').type('  zzz-no-match  ', { delay: 0 });

      // Debounce window is 30ms (see mountMultiSelectWired) — wait past it before asserting.
      cy.wait(150);
      cy.get('@searchTextChange').should('have.been.calledOnce').and('have.been.calledWith', 'zzz-no-match');

      // None of the seeded options match "zzz-no-match", yet all three must still be visible:
      // filterFlatOptions() is bypassed while server-search is wired (SIP-T-3).
      cy.contains('.options .option', 'Center 1').should('exist');
      cy.contains('.options .option', 'Center 2').should('exist');
      cy.contains('.options .option', 'Center 3').should('exist');
    });
  });

  // SIP-T-4 (unwired mode, the carried-forward coverage gap): proves the ~78 existing, unwired
  // call sites are genuinely unaffected — same default TEMPLATE/mountMultiSelect as every other
  // case in this file, no `(searchTextChange)` binding at all.
  it('unwired mode (default template): search still filters locally and never emits searchTextChange', () => {
    mountMultiSelect([]).then(wrapper => {
      openDropdown();

      const comp = wrapper.fixture.debugElement.children[0].componentInstance;
      cy.spy(comp.searchTextChange, 'emit').as('emit');

      cy.get('.search_input_container input').type('Center 1');

      // Local filterFlatOptions() still narrows the list exactly as before SIP-T-3.
      cy.contains('.options .option', 'Center 1').should('exist');
      cy.contains('.options .option', 'Center 2').should('not.exist');
      cy.contains('.options .option', 'Center 3').should('not.exist');

      // Wait past the component's real default 300ms debounce window (serverSearchDebounceMs,
      // pr-multi-select.component.ts:54) before asserting absence. Without this wait, the
      // assertion runs inside that window and only proves nothing emitted synchronously — a real
      // (regressed) emission from a debounced pipeline would not have fired yet, so the "never
      // emits" claim would be unproven, not just unobserved-yet.
      cy.wait(400);

      // isServerSearchWired() correctly evaluates false for this instance: no debounce pipeline,
      // no emission — proven by spying on the component's own emitter, not an external observer.
      cy.get('@emit').should('not.have.been.called');
    });
  });

  // SIP-T-7: closes the verification gap flagged by two independent Reviewer passes — the PASS
  // verdict for the option-row height correction rested on re-derived CSS math (16+16 padding +
  // 18px line-height + 1px border = 51px, +1px rounding buffer = 52px `min-height`), never on a
  // runnable browser measurement. This measures the ACTUAL rendered `.option` row via
  // `getBoundingClientRect()` against the shipped `.options.result_picker_style .option` rule
  // (`pr-multi-select.component.scss`) and the shipped `virtualOptionItemSize` computed
  // (`pr-multi-select.component.ts`), which returns 52 when `resultPickerStyle()` is true.
  it('SIP-T-7: resultPickerStyle=true renders option rows at ~52px and tags the panel', () => {
    mountMultiSelectResultPickerStyle([]).then(() => {
      openDropdown();

      cy.get('.options').should('have.class', 'result_picker_style');

      cy.get('.options .option')
        .first()
        .then($el => {
          const height = $el[0].getBoundingClientRect().height;
          // `min-height: 52px` with `height: auto` — tolerant bound absorbs box-model/sub-pixel
          // rounding without being brittle to an exact-pixel assumption (per task brief).
          expect(height).to.be.at.least(51);
          expect(height).to.be.at.most(54);
        });
    });
  });

  // SIP-T-7: the opt-in boundary — proves the ~78 other (unwired) call sites keep the original
  // 30px row height from the global `custom-fields.scss` rule when `resultPickerStyle` is unset,
  // matching this file's established "prove the opt-in doesn't leak" pattern (see the SIP-T-4
  // unwired-mode case above).
  it('SIP-T-7: default (unwired) instance keeps the original 30px option row height', () => {
    mountMultiSelect([]).then(() => {
      openDropdown();

      cy.get('.options').should('not.have.class', 'result_picker_style');

      cy.get('.options .option')
        .first()
        .then($el => {
          const height = $el[0].getBoundingClientRect().height;
          expect(height).to.be.closeTo(30, 1);
        });
    });
  });
});
