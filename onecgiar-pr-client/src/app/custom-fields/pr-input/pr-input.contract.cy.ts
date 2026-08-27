import { mountCF, mountCFHost, patchHost, readHost } from '../../../../cypress/support/ct-utils';
import { DataControlService } from '../../shared/services/data-control.service';

/**
 * CONTRACT tests for <app-pr-input> — 50 consumer templates.
 *
 * These assert how the field is EXPECTED to behave, not what the current implementation happens to
 * do. The expectations come from two sources only:
 *
 *  1. `master` (Angular 19 + PrimeNG, years in production) — read with
 *     `git show master:onecgiar-pr-client/src/app/custom-fields/pr-input/pr-input.component.{ts,html}`.
 *     It is a reference for BEHAVIOUR, never for markup: PrimeNG is gone on this branch, so no
 *     `pInputText` / `p-inputNumber` selector is reused here.
 *  2. Measured consumer usage across the 50 templates:
 *     ngModel 186 · required 169 · placeholder 157 · label 147 · type 135
 *     (type= number 64 · text 39 · currency 18 · link 13 · email 1) ·
 *     disabled 63 · readOnly 51 · ngModelChange 33 · noDataText 31 · isStatic 10 · maxWords 7.
 *
 * A red test here is the deliverable: it is reported as a defect candidate with its `master`
 * evidence. Production code is never touched to make one pass, and no assertion is softened to
 * match current behaviour.
 */

/** The editable text control. `hlmInput` is the Spartan directive that replaced `pInputText`. */
const INPUT = '.pr-input input[hlmInput]';
/** The node `DataControlService.someMandatoryFieldIncompleteResultDetail()` reads for completeness. */
const VALIDATION_NODE = '.pr-input.mandatory .input-validation';

/** Reach the singleton `DataControlService` the mounted field is wired to. */
function withDataControl(fn: (svc: DataControlService) => void) {
  return cy.get('@ctWrapper').then((wrapper: any) => {
    fn(wrapper.fixture.debugElement.injector.get(DataControlService));
  });
}

describe('PrInputComponent — contract (CT)', () => {
  describe('model contract (spec: "Single-value fields honour the same model contract")', () => {
    // Mirrors the 33 consumers that listen to (ngModelChange) instead of relying on the banana box,
    // so the spec can count emissions without a second binding fighting the two-way sugar.
    const TPL = `
      <app-pr-input
        label="Title"
        type="text"
        placeholder="Type here"
        [required]="required"
        [ngModel]="model"
        (ngModelChange)="onModelChange($event)">
      </app-pr-input>`;

    function mountModelHost(model: any) {
      return mountCFHost(TPL, {
        editable: true,
        componentProperties: {
          model,
          required: true,
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
      cy.get(INPUT).type('Hello world');
      readHost(host => host.model).should('equal', 'Hello world');
    });

    it('[contract] the change event emits exactly once per edit (no duplicate emission)', () => {
      mountModelHost('');
      cy.get(INPUT).type('A');
      readHost(host => host.changes.length).should('equal', 1);
      readHost(host => host.changes[0]).should('equal', 'A');
    });

    it('[contract] a programmatic parent change updates the control without user interaction', () => {
      mountModelHost('first');
      cy.get(INPUT).should('have.value', 'first');
      patchHost(host => {
        host.model = 'set from the parent';
      });
      cy.get(INPUT).should('have.value', 'set from the parent');
    });

    it('[contract] setting the model to null renders the control empty', () => {
      mountModelHost('something');
      cy.get(INPUT).should('have.value', 'something');
      patchHost(host => {
        host.model = null;
      });
      cy.get(INPUT).should('have.value', '');
    });

    it('[contract] the placeholder is exposed while the field is empty', () => {
      mountModelHost(null);
      cy.get(INPUT).should('have.value', '').and('have.attr', 'placeholder', 'Type here');
    });
  });

  describe('required / completeness DOM contract (spec: "Required fields expose the mandatory-completeness DOM contract")', () => {
    // pr-input does NOT use the `.complete` class — on `master` too, its root is
    // `<div class="pr-input" [ngClass]="{ mandatory: required, readOnly: ... }">` with no `complete`
    // branch. Its completeness proxy is the text inside `.input-validation`, which is exactly what
    // `DataControlService.someMandatoryFieldIncompleteResultDetail()` reads:
    //   querySelectorAll('.pr-input.mandatory .input-validation').filter(f => !f.innerText)
    // Asserting `.complete` here would invent a requirement neither branch ever had.
    const TPL = `
      <app-pr-input
        label="Title"
        type="text"
        placeholder="Type here"
        [required]="required"
        [(ngModel)]="model">
      </app-pr-input>`;

    function mountField(model: any, required: boolean) {
      return mountCFHost(TPL, { editable: true, componentProperties: { model, required } });
    }

    it('[contract] a required field carries the .mandatory marker while empty, with an empty validation node', () => {
      mountField(null, true);
      cy.get('.pr-input.mandatory').should('exist');
      cy.get(VALIDATION_NODE).should('exist').and('have.text', '');
    });

    it('[contract] the validation node mirrors the value once the field is filled', () => {
      mountField(null, true);
      cy.get(INPUT).type('Some title');
      cy.get(VALIDATION_NODE).should('have.text', 'Some title');
    });

    it('[contract] an optional field carries no .mandatory marker', () => {
      mountField(null, false);
      cy.get('.pr-input.mandatory').should('not.exist');
    });

    it('[contract] the field label reaches the submission feedback list while the field is empty', () => {
      // `master` evidence: the scan resolves the label as
      //   field.parentElement.parentElement.parentElement.querySelector('.pr_label').innerText
      // i.e. `.input-validation` -> `.input_container` -> `.pr-input` -> the wrapper that also holds
      // <app-pr-field-header>, which renders `<div class="pr_label">`. That is how a submitter is
      // told WHICH field is missing before submitting a result.
      mountField(null, true);
      withDataControl(dataControl => {
        dataControl.someMandatoryFieldIncompleteResultDetail('[data-cy-root]');
        expect(dataControl.fieldFeedbackList(), 'submission feedback list').to.include('Title:');
      });
    });
  });

  describe('read-only gate (spec: "Read-only state hides interaction for every field")', () => {
    const TPL = `
      <app-pr-input
        label="Title"
        [type]="type"
        [required]="required"
        [readOnly]="readOnly"
        [isStatic]="isStatic"
        [noDataText]="noDataText"
        [(ngModel)]="model">
      </app-pr-input>`;

    function mountField(props: Record<string, unknown>, editable = false) {
      return mountCFHost(TPL, {
        editable,
        componentProperties: {
          type: 'text',
          required: true,
          readOnly: false,
          isStatic: false,
          noDataText: '',
          model: null,
          ...props
        }
      });
    }

    it('[contract] the app default (RolesService.readOnly = true) shows the value as text and no control', () => {
      mountField({ model: 'Read only value' });
      cy.get('.pr-input.readOnly').should('contain.text', 'Read only value');
      cy.get(INPUT).should('not.exist');
    });

    it('[contract] an explicit [readOnly]="true" hides the control even when the role allows editing', () => {
      mountField({ model: 'Read only value', readOnly: true }, true);
      cy.get(INPUT).should('not.exist');
      cy.get('.pr-input.readOnly').should('contain.text', 'Read only value');
    });

    it('[contract] editable mounts expose the control', () => {
      mountField({}, true);
      cy.get(INPUT).should('exist');
    });

    it('[contract] a required empty field reads "Not provided" while read-only', () => {
      mountField({ model: null, required: true });
      cy.get('.pr-input.readOnly').should('contain.text', 'Not provided');
    });

    it('[contract] an optional empty field reads "Not applicable" while read-only', () => {
      mountField({ model: null, required: false });
      cy.get('.pr-input.readOnly').should('contain.text', 'Not applicable');
    });

    it('[contract] noDataText (31 consumers) overrides the empty read-only text', () => {
      mountField({ model: null, noDataText: 'No centers reported' });
      cy.get('.pr-input.readOnly').should('contain.text', 'No centers reported');
    });

    it('[contract] [isStatic]="true" keeps the field editable-rendered despite the read-only role', () => {
      // Documented from `master`: the switch is `(readOnly || rolesSE.readOnly) && !isStatic`, so
      // isStatic bypasses the read-only branch. Locked here so the redesign cannot silently drop it.
      mountField({ model: 'Static value', isStatic: true });
      cy.get(INPUT).should('exist').and('have.value', 'Static value');
    });

    it('[contract] a read-only link renders as an anchor to the stored URL', () => {
      mountField({ model: 'https://example.org/report', type: 'link' });
      cy.get('.pr-input.readOnly a.open_route').should('have.attr', 'href', 'https://example.org/report');
    });
  });

  describe('type="number" (64 consumers)', () => {
    const TPL = `
      <app-pr-input label="Amount" type="number" [required]="false" [(ngModel)]="model"></app-pr-input>`;
    // The field is a text input with `inputmode="decimal"` so it can show grouped thousands
    // (`123,123`) the way the pre-migration `<p-inputNumber>` did.
    const NUMBER_INPUT = '.pr-input input[inputmode="decimal"]';

    it('[contract] a typed amount reaches the bound model as a number', () => {
      mountCFHost(TPL, { editable: true, componentProperties: { model: null } });
      cy.get(NUMBER_INPUT).type('42');
      readHost(host => host.model).should('equal', 42);
    });

    it('[contract] the rendered control and the bound model agree after a negative entry', () => {
      // `master` evidence: the number field was <p-inputNumber [min]="0">, so a negative amount was
      // unreachable and the displayed value always equalled the bound model. The component clamps
      // its internal value at 0 but propagates the raw input, so the two can only diverge if the
      // control lets a negative through.
      mountCFHost(TPL, { editable: true, componentProperties: { model: null } });
      cy.get(NUMBER_INPUT).type('-5');
      cy.get(NUMBER_INPUT).then($input => {
        const rendered = ($input.val() as string) === '' ? null : Number($input.val());
        readHost(host => host.model).should('equal', rendered);
      });
    });
  });

  describe('type="currency" (18 consumers)', () => {
    const TPL = `
      <app-pr-input label="Budget" type="currency" [required]="false" placeholder="Enter amount" [(ngModel)]="model"></app-pr-input>`;
    const CURRENCY_INPUT = '.pr-input input[inputmode="decimal"]';

    it('[contract] an existing amount is displayed formatted as USD', () => {
      // `master` evidence: <p-inputNumber mode="currency" currency="USD" locale="en-US">.
      mountCFHost(TPL, { editable: true, componentProperties: { model: 1500 } });
      cy.get(CURRENCY_INPUT).should('have.value', '$1,500.00');
    });

    it('[contract] a typed amount is stored as a number and re-displayed formatted', () => {
      mountCFHost(TPL, { editable: true, componentProperties: { model: null } });
      cy.get(CURRENCY_INPUT).type('2500').blur();
      readHost(host => host.model).should('equal', 2500);
      cy.get(CURRENCY_INPUT).should('have.value', '$2,500.00');
    });

    it('[contract] a negative amount never reaches the bound model', () => {
      // `master` evidence: <p-inputNumber [min]="0"> made negative amounts unreachable.
      mountCFHost(TPL, { editable: true, componentProperties: { model: null } });
      cy.get(CURRENCY_INPUT).type('-500').blur();
      readHost(host => host.model).then((model: any) => {
        expect(model === null || model >= 0, `bound model was ${model}`).to.equal(true);
      });
    });

    it('[contract] clearing the amount empties the model and restores the placeholder', () => {
      mountCFHost(TPL, { editable: true, componentProperties: { model: 1500 } });
      cy.get(CURRENCY_INPUT).clear().blur();
      readHost(host => host.model).should('equal', null);
      cy.get(CURRENCY_INPUT).should('have.value', '').and('have.attr', 'placeholder', 'Enter amount');
    });
  });

  describe('type="link" (13 consumers)', () => {
    it('[contract] surrounding whitespace is trimmed out of the bound model', () => {
      // `master` evidence: `set value(v)` does `if (this.type === 'link') v = v.trim();`.
      mountCFHost(`<app-pr-input label="Link" type="link" [required]="false" [(ngModel)]="model"></app-pr-input>`, {
        editable: true,
        componentProperties: { model: null }
      });
      cy.get(INPUT).type('  https://example.org  ');
      readHost(host => host.model).should('equal', 'https://example.org');
    });
  });

  describe('word counter (maxWords, 7 consumers)', () => {
    const TPL = `
      <app-pr-input label="Title" type="text" [required]="false" [maxWords]="maxWords" [autogenerate]="autogenerate" [(ngModel)]="model"></app-pr-input>`;

    it('[contract] no counter is rendered when maxWords is not configured', () => {
      mountCF(TPL, { editable: true, componentProperties: { model: '', maxWords: null, autogenerate: false } });
      cy.get('app-pr-word-counter').should('not.exist');
    });

    it('[contract] the counter tracks the current word count', () => {
      mountCF(TPL, { editable: true, componentProperties: { model: '', maxWords: 5, autogenerate: false } });
      cy.get(INPUT).type('one two three');
      cy.get('app-pr-word-counter .limitBreaker').should('have.text', '3');
    });

    it('[contract] autogenerate downgrades an over-limit field from invalid to warning', () => {
      // `master` evidence: `invalid: wordCount > maxWords && !autogenerate` /
      //                    `warning: wordCount > maxWords && autogenerate`.
      mountCF(TPL, { editable: true, componentProperties: { model: '', maxWords: 3, autogenerate: true } });
      cy.get(INPUT).type('one two three four five');
      cy.get(INPUT).should('have.class', 'warning').and('not.have.class', 'invalid');
    });
  });
});
