import { mountCF, mountCFHost, patchHost, readHost, sharedFieldContracts } from '../../../../cypress/support/ct-utils';
import { DataControlService } from '../../shared/services/data-control.service';

/**
 * CONTRACT tests for <app-pr-textarea> — 27 consumer templates.
 *
 * Expectations are derived from an external source of truth, never from the current implementation:
 *
 *  1. `master` (Angular 19 + PrimeNG) — read with
 *     `git show master:onecgiar-pr-client/src/app/custom-fields/pr-textarea/pr-textarea.component.{ts,html}`.
 *     Behaviour only: `textarea[pTextarea]` no longer exists on this branch, so no PrimeNG selector
 *     is reused here.
 *  2. Measured consumer usage across the 27 templates:
 *     ngModel 35 · placeholder 34 · label 26 · required 22 · maxWords 21 · isStatic 10 ·
 *     readOnly 9 · rows 8 · description 7 · disabled 5 · autogenerate 3.
 *     `maxWords` is used by nearly every consumer, so the word-counter wiring is a first-class
 *     contract here (unlike pr-input, where only 7 consumers set it).
 *
 * A red test is the deliverable — it is reported as a defect candidate with its `master` evidence.
 */

/** The editable control. Was `textarea[pTextarea]` on master; plain `<textarea>` after Spartan. */
const TEXTAREA = '.pr-field textarea';

const TPL = `
  <app-pr-textarea
    label="Notes"
    placeholder="Describe the result"
    [required]="required"
    [readOnly]="readOnly"
    [isStatic]="isStatic"
    [maxWords]="maxWords"
    [autogenerate]="autogenerate"
    [(ngModel)]="model">
  </app-pr-textarea>`;

const BASE_PROPS = {
  model: null as any,
  required: true,
  readOnly: false,
  isStatic: false,
  maxWords: null as any,
  autogenerate: false
};

const props = (over: Record<string, unknown> = {}) => ({ ...BASE_PROPS, ...over });

/** Reach the singleton `DataControlService` the mounted field is wired to. */
function withDataControl(fn: (svc: DataControlService) => void) {
  return cy.get('@ctWrapper').then((wrapper: any) => {
    fn(wrapper.fixture.debugElement.injector.get(DataControlService));
  });
}

describe('PrTextareaComponent — contract (CT)', () => {
  // Shared contracts (read-only gate + `.pr-field.mandatory` / `.complete` DOM that
  // `DataControlService.someMandatoryFieldIncompleteResultDetail()` scans). pr-textarea DOES use
  // the `.complete` class on `master` (`[ngClass]="{ mandatory: required, complete: value, ... }"`),
  // so the shared block applies verbatim with the default `.pr-field` root.
  sharedFieldContracts({
    emptyRequired: { template: TPL, componentProperties: props({ model: null, required: true }) },
    filledRequired: { template: TPL, componentProperties: props({ model: 'Some notes', required: true }) },
    optional: { template: TPL, componentProperties: props({ model: null, required: false }) },
    controlSelector: TEXTAREA
  });

  describe('model contract (spec: "Single-value fields honour the same model contract")', () => {
    // Mirrors consumers that listen to (ngModelChange); the one-way binding + explicit handler lets
    // the spec count emissions without a second listener fighting the two-way sugar.
    const CHANGE_TPL = `
      <app-pr-textarea
        label="Notes"
        placeholder="Describe the result"
        [required]="true"
        [ngModel]="model"
        (ngModelChange)="onModelChange($event)">
      </app-pr-textarea>`;

    function mountModelHost(model: any) {
      return mountCFHost(CHANGE_TPL, {
        editable: true,
        componentProperties: {
          model,
          changes: [],
          onModelChange(v: any) {
            this.model = v;
            this.changes.push(v);
          }
        }
      });
    }

    it('[contract] user input propagates to the bound model', () => {
      mountModelHost('');
      cy.get(TEXTAREA).type('some notes here');
      readHost(host => host.model).should('equal', 'some notes here');
    });

    it('[contract] the change event emits exactly once per edit (no duplicate emission)', () => {
      mountModelHost('');
      cy.get(TEXTAREA).type('A');
      readHost(host => host.changes.length).should('equal', 1);
      readHost(host => host.changes[0]).should('equal', 'A');
    });

    it('[contract] a programmatic parent change updates the control without user interaction', () => {
      mountModelHost('first');
      cy.get(TEXTAREA).should('have.value', 'first');
      patchHost(host => {
        host.model = 'set from the parent';
      });
      cy.get(TEXTAREA).should('have.value', 'set from the parent');
    });

    it('[contract] setting the model to null renders the control empty and shows the placeholder', () => {
      mountModelHost('something');
      cy.get(TEXTAREA).should('have.value', 'something');
      patchHost(host => {
        host.model = null;
      });
      cy.get(TEXTAREA).should('have.value', '').and('have.attr', 'placeholder', 'Describe the result');
    });
  });

  describe('required / completeness DOM contract', () => {
    it('[contract] the .complete marker follows the value in both directions', () => {
      mountCFHost(TPL, { editable: true, componentProperties: props({ model: null, required: true }) });
      cy.get('.pr-field.mandatory').should('not.have.class', 'complete');
      cy.get(TEXTAREA).type('now filled');
      cy.get('.pr-field.mandatory').should('have.class', 'complete');
      cy.get(TEXTAREA).clear();
      cy.get('.pr-field.mandatory').should('not.have.class', 'complete');
    });

    it('[contract] the field label reaches the submission feedback list while the field is empty', () => {
      // `master` evidence: the scan resolves the label as
      //   field.parentElement.querySelector('.pr_label').innerText
      // i.e. `.pr-field` -> its parent, which on master also holds <app-pr-field-header> rendering
      // `<div class="pr_label">`. That list is what tells a submitter WHICH field is still missing.
      mountCFHost(TPL, { editable: true, componentProperties: props({ model: null, required: true }) });
      withDataControl(dataControl => {
        dataControl.someMandatoryFieldIncompleteResultDetail('[data-cy-root]');
        expect(dataControl.fieldFeedbackList(), 'submission feedback list').to.include('Notes:');
      });
    });
  });

  describe('read-only gate (spec: "Read-only state hides interaction for every field")', () => {
    it('[contract] the app default (RolesService.readOnly = true) shows the value as text and no control', () => {
      mountCF(TPL, { componentProperties: props({ model: 'Read only notes' }) });
      cy.get('.pr-field.readOnly').should('contain.text', 'Read only notes');
      cy.get(TEXTAREA).should('not.exist');
    });

    it('[contract] a required empty field reads "Not provided" while read-only', () => {
      mountCF(TPL, { componentProperties: props({ model: null, required: true }) });
      cy.get('.pr-field.readOnly').should('contain.text', 'Not provided');
    });

    it('[contract] an optional empty field reads "Not applicable" while read-only', () => {
      mountCF(TPL, { componentProperties: props({ model: null, required: false }) });
      cy.get('.pr-field.readOnly').should('contain.text', 'Not applicable');
    });

    it('[contract] [isStatic]="true" (10 consumers) keeps the field editable-rendered despite the read-only role', () => {
      // Documented from `master`: the switch is `(readOnly || rolesSE.readOnly) && !isStatic`.
      mountCF(TPL, { componentProperties: props({ model: 'Static notes', isStatic: true }) });
      cy.get(TEXTAREA).should('exist').and('have.value', 'Static notes');
    });
  });

  describe('word counter (maxWords, 21 of 27 consumers)', () => {
    it('[contract] no counter is rendered when maxWords is not configured', () => {
      mountCF(TPL, { editable: true, componentProperties: props({ model: '', maxWords: null }) });
      cy.get('app-pr-word-counter').should('not.exist');
    });

    it('[contract] the counter renders the configured limit and tracks the current word count', () => {
      mountCF(TPL, { editable: true, componentProperties: props({ model: '', maxWords: 5 }) });
      cy.get('app-pr-word-counter').should('contain.text', 'Max 5 words');
      cy.get(TEXTAREA).type('one two three');
      cy.get('app-pr-word-counter .limitBreaker').should('have.text', '3');
    });

    it('[contract] the counter reacts to a programmatic parent change, not only to typing', () => {
      mountCFHost(TPL, { editable: true, componentProperties: props({ model: '', maxWords: 5 }) });
      cy.get('app-pr-word-counter .limitBreaker').should('have.text', '0');
      patchHost(host => {
        host.model = 'one two three four';
      });
      cy.get('app-pr-word-counter .limitBreaker').should('have.text', '4');
    });

    it('[contract] crossing the limit marks the control and the counter invalid', () => {
      mountCF(TPL, { editable: true, componentProperties: props({ model: '', maxWords: 3 }) });
      cy.get(TEXTAREA).type('one two three four five');
      cy.get(TEXTAREA).should('have.class', 'invalid');
      cy.get('app-pr-word-counter .limitBreaker').should('have.class', 'invalid');
    });

    it('[contract] autogenerate downgrades an over-limit field from invalid to warning', () => {
      // `master` evidence: `invalid: wordCount > maxWords && !autogenerate` /
      //                    `warning: wordCount > maxWords && autogenerate`.
      mountCF(TPL, { editable: true, componentProperties: props({ model: '', maxWords: 3, autogenerate: true }) });
      cy.get(TEXTAREA).type('one two three four five');
      cy.get(TEXTAREA).should('have.class', 'warning').and('not.have.class', 'invalid');
    });
  });
});
