import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RolesService } from '../../shared/services/global/roles.service';
import { CustomFieldsModule } from '../custom-fields.module';
import { patchHost } from '../../../../cypress/support/ct-utils';

/**
 * Component tests for <app-pr-input> (signals refactor).
 *
 * Focus: two-way ngModel still works in a real browser, external value changes
 * (writeValue) are reflected, the read-only view renders static text instead of an
 * input, and the reactive word-count marks the input invalid past `maxWords`.
 *
 * NOTE (Spartan migration): PrimeNG was removed on `performance-refactor`, so the
 * control is no longer `input[pInputText]` — it is a native `<input hlmInput>` inside
 * the `.pr-input` root. Only the SELECTORS changed here; the assertions are the same
 * behaviour this spec has always locked.
 */

/** The editable control rendered by pr-input for the text/link/email types. */
const INPUT = '.pr-input input[hlmInput]';

const TEMPLATE = `
  <app-pr-input
    label="Title"
    type="text"
    placeholder="Type here"
    [maxWords]="maxWords"
    [readOnly]="readOnly"
    [(ngModel)]="model">
  </app-pr-input>
`;

function mountInput(model: string, opts: { readOnly?: boolean; maxWords?: number; forceEditable?: boolean } = {}) {
  return cy
    .mount(TEMPLATE, {
      imports: [CustomFieldsModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideRouter([])],
      componentProperties: {
        model,
        readOnly: opts.readOnly ?? false,
        maxWords: opts.maxWords ?? null
      }
    })
    .then(wrapper => {
      // The global read-only flag defaults to true; flip it off for the editable cases.
      if (opts.forceEditable ?? !opts.readOnly) {
        const roles = wrapper.fixture.debugElement.injector.get(RolesService);
        roles.readOnly = false;
        wrapper.fixture.detectChanges();
      }
      return cy.wrap(wrapper);
    });
}

describe('PrInputComponent (CT)', () => {
  it('renders an editable input and typing updates the bound model', () => {
    mountInput('').then(wrapper => {
      cy.get(INPUT).should('be.visible').type('Hello world');

      cy.wrap(null).then(() => {
        expect((wrapper.component as any).model).to.equal('Hello world');
      });
    });
  });

  it('reflects an external value change in the input', () => {
    // The host must be mutated through `patchHost` (autoDetectChanges) — mutating it and forcing a
    // SYNCHRONOUS detectChanges() runs the `[(ngModel)]` write-back inside the cycle that is already
    // checking it and throws NG0100 from the WrapperComponent: a harness artefact, not a field defect.
    mountInput('first').as('ctWrapper');
    cy.get(INPUT).should('have.value', 'first');

    patchHost(host => {
      host.model = 'updated from outside';
    });

    cy.get(INPUT).should('have.value', 'updated from outside');
  });

  it('renders the value as static text in read-only mode (no input)', () => {
    mountInput('Read only value', { readOnly: true });
    cy.get('.pr-input.readOnly').should('contain.text', 'Read only value');
    cy.get(INPUT).should('not.exist');
  });

  it('marks the input invalid when it exceeds maxWords', () => {
    mountInput('', { maxWords: 3 });
    cy.get(INPUT).type('one two three four five');
    cy.get(INPUT).should('have.class', 'invalid');
  });
});
