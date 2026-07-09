import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RolesService } from '../../shared/services/global/roles.service';
import { CustomFieldsModule } from '../custom-fields.module';

/**
 * Component tests for <app-pr-select> (signals refactor).
 *
 * Focus: real-browser behavior of the single-select dropdown — selecting emits and
 * shows the label, the reactive reset (setting the model to null clears the field on
 * its own), disabled options are not selectable, and the restored `optionsInlineStyles`
 * input still reaches the dropdown panel (that was a cosmetic regression we fixed).
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
  <app-pr-select
    [options]="options"
    optionValue="code"
    optionLabel="full_name"
    placeholder="Select center"
    label="Center"
    [disableOptions]="disableOptions"
    [optionsInlineStyles]="optionsInlineStyles"
    [(ngModel)]="model">
  </app-pr-select>
`;

function mountSelect(
  model: string | null,
  extra: { disableOptions?: Center[]; optionsInlineStyles?: string } = {}
) {
  return cy
    .mount(TEMPLATE, {
      imports: [CustomFieldsModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideRouter([])],
      componentProperties: {
        options: OPTIONS,
        model,
        disableOptions: extra.disableOptions ?? [],
        optionsInlineStyles: extra.optionsInlineStyles ?? ''
      }
    })
    .then(wrapper => {
      const roles = wrapper.fixture.debugElement.injector.get(RolesService);
      roles.readOnly = false;
      wrapper.fixture.detectChanges();
      return cy.wrap(wrapper);
    });
}

function openDropdown() {
  cy.get('.custom_select .field').should('exist').focus();
  cy.get('.custom_select .field .options').should('be.visible');
}

describe('PrSelectComponent (CT)', () => {
  it('shows the placeholder when nothing is selected', () => {
    mountSelect(null);
    cy.get('.custom_select .field .text').should('contain.text', 'Select center');
  });

  it('renders the label of the pre-selected value', () => {
    mountSelect('C2');
    cy.get('.custom_select .field .text').should('contain.text', 'Center 2');
  });

  it('selecting an option updates the field label and the bound model', () => {
    mountSelect(null).then(wrapper => {
      openDropdown();
      cy.contains('.options .option', 'Center 3').click();

      cy.get('.custom_select .field .text').should('contain.text', 'Center 3');
      cy.wrap(null).then(() => {
        expect((wrapper.component as any).model).to.equal('C3');
      });
    });
  });

  // Reactive reset: setting the model to null from outside must clear the selection
  // WITHOUT the `*ngIf` destroy/recreate hack consumers used to rely on.
  it('clears the selection reactively when the model is set to null', () => {
    mountSelect('C1').then(wrapper => {
      cy.get('.custom_select .field .text').should('contain.text', 'Center 1');

      cy.wrap(null).then(() => {
        (wrapper.component as any).model = null;
        wrapper.fixture.detectChanges();
      });

      cy.get('.custom_select .field .text').should('contain.text', 'Select center');
    });
  });

  it('does not select a disabled option', () => {
    mountSelect(null, { disableOptions: [{ code: 'C2', full_name: 'Center 2' }] }).then(wrapper => {
      openDropdown();
      cy.contains('.options .option', 'Center 2').should('have.class', 'disabled').click({ force: true });

      cy.wrap(null).then(() => {
        expect((wrapper.component as any).model).to.not.equal('C2');
      });
    });
  });

  // Regression: the `optionsInlineStyles` input was dropped during the refactor,
  // breaking a tuned dropdown height in Admin > Knowledge Products. Verify it reaches
  // the panel again.
  it('applies optionsInlineStyles to the dropdown panel', () => {
    mountSelect(null, { optionsInlineStyles: 'max-height: 123px;' });
    openDropdown();
    cy.get('.custom_select .field .options')
      .should('have.attr', 'style')
      .and('include', 'max-height: 123px');
  });
});
