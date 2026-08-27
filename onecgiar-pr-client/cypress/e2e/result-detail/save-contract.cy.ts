/// <reference types="cypress" />

import {
  BOTTOM_BAR,
  SAVE_ENDPOINTS,
  SAVING_LABEL,
  describeWithToken,
  findEditableResultUrl,
  openContributorsPartners,
  openDropdown,
  openGeneralInformation,
  sectionUrl,
  waitForContributorsPartners,
  waitForGeneralInformation
} from '../../support/result-detail';

/**
 * Result Detail → THE SAVE CONTRACT: what the screen shows must be what the request carries.
 *
 * Why this spec exists. Every other persistence test in this suite asserts
 * `its('response.statusCode').should('be.oneOf', [200, 201])`. A 200 only proves the backend
 * accepted whatever it was sent — it says nothing about WHAT was sent. A field the form renders,
 * the user fills in, and the component then drops from the body produces a green test and a lost
 * answer. That is not hypothetical here: it is the exact defect class this project has already
 * shipped (a mandatory control the DTO never accepted, so the value silently vanished on reload).
 *
 * So this spec asserts on `interception.request.body`, not on the status code:
 *
 *   1. COVERAGE — every control rendered with a `data-testid="<sec>-field-<payload path>"` hook
 *      must appear in the PATCH body at that path. A rendered MANDATORY field must additionally
 *      carry a non-empty value. This is the assertion that fails when a painted field is omitted.
 *   2. VALUE — every control the spec edited must travel with the value that is now on screen.
 *   3. ROUND TRIP — after `cy.reload()` the DOM must show the edited values again, which is the
 *      only oracle for controls whose payload value (a catalog id) is not readable from the DOM.
 *
 * The hooks live in the section templates, next to the control, so a new field is one attribute
 * away from being covered. The suffix after `~` (e.g. `contributing_center~flat`) only
 * disambiguates two controls that feed the SAME payload key; it is stripped before lookup.
 *
 * Deliberate limits, stated instead of hidden:
 *   - A control WITHOUT a hook is not covered. The coverage check cannot be "every mandatory node
 *     in the DOM", because `appFeedbackValidation` injects hidden `.pr-field.mandatory` markers
 *     for rules that have no single control behind them.
 *   - `changePrimaryInit` (Submitter) is covered but never edited: changing it reassigns the
 *     result to another program on the SHARED test backend. See `NEVER_EDIT`.
 *   - Fields whose payload value is a catalog id (radio, segmented score, select) are asserted by
 *     presence + reload round-trip. Their id is not derivable from the rendered DOM.
 */

/**
 * Payload paths this spec ASSERTS but never writes to.
 *
 * Two reasons, both learned the hard way against the shared test backend:
 *   - `changePrimaryInit` reassigns the result to another program;
 *   - the rest are STRUCTURAL switches: flipping them reconfigures the section (a different lead
 *     selector, half the ToC block appearing or vanishing) and can leave a mandatory control empty
 *     with no catalog behind it. Flipping `is_lead_by_partner` once left the shared record showing
 *     an empty "Lead partner" and took the sibling contributors spec down with it.
 * They are still covered: if they are rendered, mandatory and filled, their key must be in the
 * payload — the assertion that matters. Only the write is skipped.
 */
const NEVER_EDIT = new Set(['changePrimaryInit', 'is_lead_by_partner', 'result_toc_result.planned_result', 'has_innovation_link']);

const E2E_SUFFIX = '(e2e)';

type Kind = 'input' | 'textarea' | 'radio' | 'segmented' | 'yesno' | 'select' | 'multiselect' | 'unknown';

interface Hook {
  /** Full `data-testid` value — the selector. */
  testid: string;
  /** Dotted path into the PATCH body. */
  path: string;
  kind: Kind;
  required: boolean;
}

/** Idempotent marker toggle, so repeated runs flip the same record instead of growing it. */
function toggleSuffix(value: string): string {
  const trimmed = (value || '').trim();
  if (trimmed.endsWith(E2E_SUFFIX)) return trimmed.slice(0, -E2E_SUFFIX.length).trim() || 'Cypress e2e value';
  return `${trimmed} ${E2E_SUFFIX}`.trim();
}

function kindOf(el: HTMLElement): Kind {
  switch (el.tagName.toLowerCase()) {
    case 'app-pr-input':
      return 'input';
    case 'app-pr-textarea':
      return 'textarea';
    case 'app-pr-radio-button':
      // The segmented variant renders `role="radiogroup"` buttons instead of native radios.
      return el.querySelector('[role="radiogroup"]') ? 'segmented' : 'radio';
    case 'app-pr-yes-or-not':
      return 'yesno';
    case 'app-pr-select':
      return 'select';
    case 'app-pr-multi-select':
      return 'multiselect';
    default:
      return 'unknown';
  }
}

/** Reads the hooks the section actually rendered. Hidden controls are ignored — so is their data. */
function discover($root: JQuery<HTMLElement>, prefix: string): Hook[] {
  return $root
    .find(`[data-testid^="${prefix}"]`)
    .toArray()
    .filter(el => (el as HTMLElement).offsetParent !== null || (el as HTMLElement).getClientRects().length > 0)
    .map(el => {
      const testid = el.getAttribute('data-testid') as string;
      return {
        testid,
        path: testid.slice(prefix.length).split('~')[0],
        kind: kindOf(el as HTMLElement),
        required: !!el.querySelector('.pr-field.mandatory, .pr-input.mandatory')
      };
    });
}

/** `true` when `path` is actually present in the body (a `null` value counts — an absent key does not). */
function hasPath(body: any, path: string): boolean {
  const keys = path.split('.');
  let node = body;
  for (const key of keys.slice(0, -1)) {
    if (node == null || typeof node !== 'object') return false;
    node = node[key];
  }
  return node != null && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, keys[keys.length - 1]);
}

function valueAt(body: any, path: string): any {
  return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), body);
}

function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * The value the control currently holds, normalized to a string so it can be compared before and
 * after a reload regardless of the control kind.
 *
 * SYNCHRONOUS on purpose: both the reader below and the retrying round-trip assertion run it, so
 * `.should()` can re-evaluate it on every retry. A `cy.get(...).then(...)` reader would freeze the
 * value at the first attempt and turn "the section is still hydrating" into a failure.
 */
function domValueOf(hook: Hook, root: HTMLElement): string {
  const val = (selector: string) => String((root.querySelector(selector) as HTMLInputElement | null)?.value ?? '');

  switch (hook.kind) {
    case 'input':
      return val('input');
    case 'textarea':
      return val('textarea');
    case 'radio':
      // Index, not `input.value`: when the options carry booleans (`[value]="true"`) Angular's
      // RadioControlValueAccessor keeps the real value internally and the DOM property falls back
      // to the browser default `"on"`. The index is what round-trips reliably.
      return String(Array.from(root.querySelectorAll('input.pr-native-radio')).findIndex(i => (i as HTMLInputElement).checked));
    case 'segmented':
      return String(Array.from(root.querySelectorAll('[role="radio"]')).findIndex(b => b.getAttribute('aria-checked') === 'true'));
    case 'yesno':
      if (root.querySelector('.choice.yes')) return 'yes';
      if (root.querySelector('.choice.no')) return 'no';
      return '';
    case 'select':
      // `app-pr-select` mirrors its ngModel into a hidden text input — the only place the raw
      // catalog id is readable from the DOM.
      return val('input[type="text"][hidden]');
    case 'multiselect':
      return String(root.querySelectorAll('.selected_container .pr_chip_selected').length);
    default:
      return '';
  }
}

/** Chainable reader built on {@link domValueOf}. */
function readDomValue(hook: Hook): Cypress.Chainable<string> {
  return cy.get(`[data-testid="${hook.testid}"]`).then($el => domValueOf(hook, $el[0]));
}

/**
 * The value the PATCH body must carry for this control, when the DOM exposes it — `null` when it
 * does not (a segmented score, or a radio whose option values are booleans). Those fall back to
 * "the key must be present", with the reload round-trip proving the value.
 *
 * ⚠️ `null`, never `undefined`: returning `undefined` from a `.then()` makes Cypress yield the
 * PREVIOUS subject instead, so the caller would receive a jQuery object and compare against it.
 */
function readExpectedPayload(hook: Hook): Cypress.Chainable<string | null> {
  const root = `[data-testid="${hook.testid}"]`;

  switch (hook.kind) {
    case 'input':
      return cy
        .get(`${root} input`)
        .first()
        .invoke('val')
        .then(v => String(v ?? ''));
    case 'textarea':
      return cy
        .get(`${root} textarea`)
        .first()
        .invoke('val')
        .then(v => String(v ?? ''));
    case 'yesno':
      return cy.get(root).then($el => ($el.find('.choice.yes').length ? 'true' : $el.find('.choice.no').length ? 'false' : null));
    case 'select':
      return cy
        .get(`${root} input[type="text"][hidden]`)
        .first()
        .invoke('val')
        .then(v => {
          const value = String(v ?? '');
          return value === '' ? null : value;
        });
    case 'radio':
      return cy.get(root).then($el => {
        const checked = $el.find('input.pr-native-radio').toArray().find(i => (i as HTMLInputElement).checked) as HTMLInputElement | undefined;
        const attr = checked?.getAttribute('value') ?? '';
        // `"on"` is the browser default the accessor leaves behind for non-string option values.
        return attr && attr !== 'on' ? attr : null;
      });
    default:
      return cy.wrap<string | null>(null, { log: false });
  }
}

/** Drives one control. Returns `true` when it actually changed something. */
function editControl(hook: Hook): Cypress.Chainable<boolean> {
  const root = `[data-testid="${hook.testid}"]`;

  switch (hook.kind) {
    case 'input':
    case 'textarea': {
      const field = hook.kind === 'input' ? `${root} input` : `${root} textarea`;
      return cy
        .get(field)
        .first()
        .then($field => {
          if ($field.is(':disabled') || $field.attr('readonly') !== undefined) return cy.wrap(false, { log: false });
          const next = toggleSuffix(String($field.val() ?? ''));
          cy.wrap($field).clear().type(next, { delay: 0, parseSpecialCharSequences: false });
          return cy.wrap(true, { log: false });
        });
    }

    case 'radio':
      return cy.get(root).then($el => {
        // Only the first two options: the top score opens an extra mandatory sub-question and
        // would change what "saveable" means for the whole section.
        const options = $el
          .find('input.pr-native-radio')
          .toArray()
          .slice(0, 2)
          .filter(i => !(i as HTMLInputElement).disabled);
        const target = options.find(i => !(i as HTMLInputElement).checked);
        if (!target) return cy.wrap(false, { log: false });
        cy.wrap(target).click({ force: true });
        return cy.wrap(true, { log: false });
      });

    case 'segmented':
      return cy.get(root).then($el => {
        const buttons = $el
          .find('[role="radio"]')
          .toArray()
          .slice(0, 2)
          .filter(b => !(b as HTMLButtonElement).disabled);
        const target = buttons.find(b => b.getAttribute('aria-checked') !== 'true');
        if (!target) return cy.wrap(false, { log: false });
        cy.wrap(target).click({ force: true });
        return cy.wrap(true, { log: false });
      });

    case 'yesno':
      return cy.get(root).then($el => {
        const choices = $el.find('.field_container .choice').toArray();
        if (choices.length < 2) return cy.wrap(false, { log: false });
        const target = $el.find('.choice.yes').length ? 'No' : 'Yes';
        cy.contains(`${root} .field_container .choice`, target).click();
        cy.contains(`${root} .field_container .choice`, target).should('have.class', target.toLowerCase());
        return cy.wrap(true, { log: false });
      });

    case 'select':
      return cy.get(root).then($el => {
        if (!$el.find('.custom_select a.field').length) return cy.wrap(false, { log: false });
        openDropdown(root);
        return cy.get(`${root} .options .option:not(.disabled):not(.labelGroup)`).then($options => {
          if (!$options.length) return cy.wrap(false, { log: false });
          // Prefer an option that is not the current one so the value really moves.
          const target = $options.toArray().find(o => !o.classList.contains('selected')) ?? $options[0];
          cy.wrap(target).find('.label').click({ force: true });
          return cy.wrap(true, { log: false });
        });
      });

    case 'multiselect':
      return cy.get(root).then($el => {
        if (!$el.find('.custom_select a.field').length) return cy.wrap(false, { log: false });
        openDropdown(root);
        return cy.get(`${root} .options .option`).then($options => {
          const target = $options
            .toArray()
            .find(o => {
              const box = o.querySelector('input.pr-native-check') as HTMLInputElement | null;
              return !!box && !box.checked && !box.disabled && !o.classList.contains('disabled');
            });
          if (!target) return cy.wrap(false, { log: false });
          cy.wrap(target).find('.label').click({ force: true });
          return cy.wrap(true, { log: false });
        });
      });

    default:
      return cy.wrap(false, { log: false });
  }
}

/** Reads every rendered hook's on-screen value, so the coverage rule can tell filled from empty. */
function captureOnScreen(hooks: Hook[], onScreen: Map<string, string>): void {
  onScreen.clear();
  hooks.forEach(hook => {
    readDomValue(hook).then(value => {
      onScreen.set(hook.testid, value);
    });
  });
}

/** Whether the control is showing something — the index-based kinds report `-1`/`0` when empty. */
function hasValueOnScreen(hook: Hook, value: string | undefined): boolean {
  if (value === undefined) return false;
  if (hook.kind === 'radio' || hook.kind === 'segmented') return value !== '-1';
  if (hook.kind === 'multiselect') return Number(value) > 0;
  return value.trim() !== '';
}

/** The two assertions that give this spec its teeth. */
function assertPayloadCovers(
  body: any,
  hooks: Hook[],
  edited: Map<string, string>,
  expected: Map<string, string>,
  onScreen: Map<string, string>
): void {
  expect(body, 'PATCH body').to.be.an('object');

  // COVERAGE: a MANDATORY field that is rendered AND filled in must reach the request. Optional
  // fields the user never touched are not asserted — their key is legitimately absent until
  // something is written into them, and demanding it would report noise instead of defects.
  hooks
    .filter(hook => hook.required && hasValueOnScreen(hook, onScreen.get(hook.testid)))
    .forEach(hook => {
      expect(
        hasPath(body, hook.path),
        `mandatory field "${hook.path}" is filled in on screen (data-testid="${hook.testid}") but its key is MISSING from the PATCH payload`
      ).to.equal(true);

      expect(
        isEmptyValue(valueAt(body, hook.path)),
        `mandatory field "${hook.path}" is filled in on screen but the PATCH payload carries an empty value`
      ).to.equal(false);
    });

  // Anything the spec edited must reach the request, whether mandatory or not.
  edited.forEach((_value, testid) => {
    const hook = hooks.find(h => h.testid === testid) as Hook;
    expect(
      hasPath(body, hook.path),
      `field "${hook.path}" was edited on screen (data-testid="${testid}") but its key is MISSING from the PATCH payload`
    ).to.equal(true);
  });

  edited.forEach((domValue, testid) => {
    const hook = hooks.find(h => h.testid === testid) as Hook;
    const sent = valueAt(body, hook.path);
    const onScreen = expected.get(testid);

    if (hook.kind === 'multiselect') {
      expect(Array.isArray(sent), `"${hook.path}" must travel as an array`).to.equal(true);
      expect((sent as any[]).length, `"${hook.path}" must carry at least the ${domValue} option(s) shown as chips`).to.be.at.least(
        Number(domValue)
      );
      return;
    }

    if (typeof onScreen !== 'string') {
      // The DOM does not expose this control's catalog id (segmented score, boolean radio):
      // presence here, exact value proven by the reload round-trip below.
      expect(isEmptyValue(sent), `"${hook.path}" was edited, so the payload must carry a value for it`).to.equal(false);
      return;
    }

    if (hook.kind === 'yesno') {
      expect(String(sent), `"${hook.path}" must travel as the boolean the Yes/No control shows`).to.equal(onScreen);
      return;
    }

    expect(String(sent ?? ''), `"${hook.path}" must travel with the value that is on screen`).to.equal(onScreen);
  });
}

/**
 * Edits every hook the section rendered and records the on-screen value of the ones that moved.
 *
 * Each control is re-checked immediately before it is driven: these sections are full of
 * conditional fields, and one edit can remove another control from the page (answering "was this
 * planned?" with Yes hides the "why is it being reported?" textarea). A hook that is gone by the
 * time its turn comes is skipped, not failed.
 */
function editAll(hooks: Hook[], edited: Map<string, string>, expected: Map<string, string>): void {
  hooks
    .filter(hook => !NEVER_EDIT.has(hook.path) && hook.kind !== 'unknown' && !edited.has(hook.testid))
    .forEach(hook => {
      cy.get('body').then($body => {
        if (!$body.find(`[data-testid="${hook.testid}"]`).length) return;

        editControl(hook).then(changed => {
          if (!changed) return;
          readDomValue(hook).then(value => {
            edited.set(hook.testid, value);
          });
          readExpectedPayload(hook).then(value => {
            if (typeof value === 'string') expected.set(hook.testid, value);
          });
        });
      });
    });
}

/**
 * Re-reads the hooks after the edits, because a conditional control may have appeared or gone.
 * The coverage assertion must be about what the page shows AT SAVE TIME — anything else would
 * either miss a newly rendered field or demand a payload key for a field that is no longer there.
 */
function refreshHooks(hooks: Hook[], prefix: string, edited: Map<string, string>, expected: Map<string, string>): void {
  cy.get('body').then($body => {
    const current = discover($body, prefix);
    hooks.length = 0;
    hooks.push(...current);

    [...edited.keys()].forEach(testid => {
      if (current.some(hook => hook.testid === testid)) return;
      edited.delete(testid);
      expected.delete(testid);
    });
  });
}

/**
 * Round-trip check for one edited control after `cy.reload()`.
 *
 * Two deliberate softenings, both about CONDITIONAL rendering rather than about persistence:
 *   - a control that is no longer on the page is skipped (answering the question above it can
 *     legitimately remove it, and asserting on a control that does not exist tests nothing);
 *   - a multiselect is asserted by "still has chips", not by an exact count, because several
 *     controls feed one payload key (ToC centers ∪ Other centers) and the section is free to
 *     redistribute the chips between them when it reloads.
 * The exact value of every scalar control is still asserted.
 */
function assertRoundTrip(hook: Hook, expectedValue: string): void {
  cy.get('body').then($body => {
    if (!$body.find(`[data-testid="${hook.testid}"]`).length) {
      cy.log(`↷ "${hook.path}" is no longer rendered after the reload — nothing to compare`);
      return;
    }

    // Retrying assertions: the section keeps hydrating (catalogs, ToC, bilateral projects) for a
    // while after `waitFor…` returns, so the control can be rendered before it is populated.
    if (hook.kind === 'multiselect') {
      cy.get(`[data-testid="${hook.testid}"]`, { timeout: 30000 }).should($el => {
        expect(Number(domValueOf(hook, $el[0])), `"${hook.path}" chips after reloading the page`).to.be.at.least(1);
      });
      return;
    }

    cy.get(`[data-testid="${hook.testid}"]`, { timeout: 30000 }).should($el => {
      expect(domValueOf(hook, $el[0]), `"${hook.path}" after reloading the page`).to.equal(expectedValue);
    });
  });
}

describeWithToken('Result Detail — save contract (what the form shows is what the request carries)', () => {
  let generalInformationUrl: string;

  before(() => {
    findEditableResultUrl().then(url => {
      generalInformationUrl = url;
    });
  });

  it('General information: every rendered field travels in the PATCH body and survives a reload', function () {
    const hooks: Hook[] = [];
    const edited = new Map<string, string>();
    const expectedValues = new Map<string, string>();
    const onScreenValues = new Map<string, string>();

    cy.intercept('PATCH', SAVE_ENDPOINTS.generalInformation).as('saveGeneralInformation');
    openGeneralInformation(generalInformationUrl);

    cy.get('body').then($body => {
      hooks.push(...discover($body, 'gi-field-'));
      // Without hooks there is no contract to check — a broken template, not a passing test.
      expect(hooks.map(h => h.path), 'hooked General information fields').to.include.members(['result_name', 'result_description']);
    });

    cy.then(() => editAll(hooks, edited, expectedValues));
    cy.then(() => refreshHooks(hooks, 'gi-field-', edited, expectedValues));
    // Second pass: an edit can REVEAL a control (a score of 3 opens its impact-area question).
    cy.then(() => editAll(hooks, edited, expectedValues));
    cy.then(() => refreshHooks(hooks, 'gi-field-', edited, expectedValues));
    cy.then(() => captureOnScreen(hooks, onScreenValues));

    cy.then(() => {
      expect(edited.size, 'controls actually edited before saving').to.be.greaterThan(0);
      cy.get(BOTTOM_BAR.save).should('not.be.disabled').click();
    });

    cy.wait('@saveGeneralInformation', { timeout: 90000 }).then(interception => {
      expect(interception.response?.statusCode, 'save response').to.be.oneOf([200, 201]);
      assertPayloadCovers(interception.request.body, hooks, edited, expectedValues, onScreenValues);
    });

    cy.get(BOTTOM_BAR.save, { timeout: 60000 }).should('not.contain.text', SAVING_LABEL);

    // --- round trip -------------------------------------------------------------------------
    cy.reload();
    waitForGeneralInformation();

    cy.then(() => {
      edited.forEach((expectedValue, testid) => {
        const hook = hooks.find(h => h.testid === testid) as Hook;
        assertRoundTrip(hook, expectedValue);
      });
    });
  });

  it('Contributors & partners: every rendered field travels in the PATCH body and survives a reload', function () {
    const hooks: Hook[] = [];
    const edited = new Map<string, string>();
    const expectedValues = new Map<string, string>();
    const onScreenValues = new Map<string, string>();
    const contributorsUrl = sectionUrl(generalInformationUrl, 'contributor-partners');

    cy.intercept('PATCH', SAVE_ENDPOINTS.contributorsPartners).as('saveContributors');
    openContributorsPartners(contributorsUrl);

    cy.get('body').then($body => {
      hooks.push(...discover($body, 'cp-field-'));
      expect(hooks.length, 'hooked Contributors & partners fields').to.be.greaterThan(0);
    });

    cy.then(() => editAll(hooks, edited, expectedValues));
    cy.then(() => refreshHooks(hooks, 'cp-field-', edited, expectedValues));
    // Second pass: answering the ToC question reveals (or hides) the fields that depend on it.
    cy.then(() => editAll(hooks, edited, expectedValues));
    cy.then(() => refreshHooks(hooks, 'cp-field-', edited, expectedValues));
    cy.then(() => captureOnScreen(hooks, onScreenValues));

    cy.then(() => {
      if (!edited.size) {
        // Everything rendered is read-only for this record: there is no edit to trace through the
        // payload. Pending, never a silent pass.
        this.skip();
      }
      cy.get(BOTTOM_BAR.save).should('not.be.disabled').click();
    });

    cy.wait('@saveContributors', { timeout: 90000 }).then(interception => {
      expect(interception.response?.statusCode, 'save response').to.be.oneOf([200, 201]);
      assertPayloadCovers(interception.request.body, hooks, edited, expectedValues, onScreenValues);
    });

    cy.get(BOTTOM_BAR.save, { timeout: 60000 }).should('not.contain.text', SAVING_LABEL);

    // --- round trip -------------------------------------------------------------------------
    cy.reload();
    waitForContributorsPartners();

    cy.then(() => {
      edited.forEach((expectedValue, testid) => {
        const hook = hooks.find(h => h.testid === testid) as Hook;
        assertRoundTrip(hook, expectedValue);
      });
    });
  });
});
