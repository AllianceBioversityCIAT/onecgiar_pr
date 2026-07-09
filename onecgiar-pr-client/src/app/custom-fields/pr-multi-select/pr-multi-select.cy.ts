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
});
