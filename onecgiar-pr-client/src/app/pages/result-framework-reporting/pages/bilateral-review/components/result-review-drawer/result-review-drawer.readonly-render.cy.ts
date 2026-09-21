// @akili-spec bilateral/review-drawer-readonly-rendering (RDR-T-2 — rendered proof for RDR-R-1)
//
// WHY THIS SUITE EXISTS
// ---------------------
// `result-review-drawer.readonly-bindings.spec.ts` (RDR-T-1) proves the `[readOnly]` BINDING is
// present in the shipped templates. It cannot prove the binding produces a read-only RENDERING,
// because every Jest spec in this module bootstraps with `overrideComponent({ template: '' })` —
// jsdom never renders these templates at all.
//
// This suite mounts the REAL child components with the REAL templates and asserts the rendered
// DOM: locked => no operable control, and the value painted as text instead.
//
// FALSIFIER (required by tasks.md RDR-T-2): the `disabled = false` cases below are the falsifier
// for the `disabled = true` cases. A selector that matches nothing in BOTH states would prove
// nothing; these pin that each selector really does match when the control is editable.
//
// NOT A GEOMETRY GATE. This asserts node presence/absence only — no size, overflow, visibility,
// position or containment claim is made, so the rendered-measurement checklist does not apply.
// Deliberately no `be.visible`: that would drag in font-loading and clipping preconditions this
// spec has not budgeted for.
//
// NOT COVERED HERE — defect class D4 (requirements.md §8): whether the read-only branch paints the
// CORRECT value against the live CLARISA catalogs. These fixtures are static, so a catalog that
// loads after first render cannot be reproduced. D4 is verified at the HITL pause only
// (tasks.md §4, checks 5 and 6).
import { PolicyChangeContentComponent } from './components/policy-change-content/policy-change-content.component';
import { CapSharingContentComponent } from './components/cap-sharing-content/cap-sharing-content.component';
import { PolicyControlListService } from '../../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { BilateralResultDetail } from './result-review-drawer.interfaces';
import { EventEmitter } from '@angular/core';
import { of } from 'rxjs';

/**
 * The `<a class="field">` trigger `pr-select` renders ONLY in its editable branch.
 * ⚠️ SCOPED to `app-pr-select` on purpose: `pr-multi-select` renders the same `a.field` trigger,
 * and policy-change-content hosts one (already `[readOnly]`-bound before this spec). Unscoped, the
 * editable falsifier counts 3 and the gate reports a defect that does not exist.
 */
const SELECT_TRIGGER = 'app-pr-select a.field';
/** `pr-input type="number"` renders `inputmode="decimal"` ONLY in its editable branch. */
const NUMBER_INPUT = 'input[inputmode="decimal"]';
/** The text node `pr-*` paints in its read-only branch. */
const READONLY_TEXT = '.text-secondary-400';

const POLICY_TYPES = [
  { id: 1, name: 'National policy' },
  { id: 2, name: 'Sub-national policy' }
];
const POLICY_STAGES = [
  { id: 7, full_name: 'Stage 2: Policy enacted' },
  { id: 8, full_name: 'Stage 3: Policy implemented' }
];

const policyDetail = (): BilateralResultDetail =>
  ({
    resultTypeResponse: [{ policy_type_id: 1, policy_stage_id: 7, institutions: [] }]
  }) as unknown as BilateralResultDetail;

const capSharingDetail = (): BilateralResultDetail =>
  ({
    resultTypeResponse: [
      {
        result_capacity_development_id: 1,
        female_using: 25,
        male_using: 40,
        non_binary_using: 0,
        has_unkown_using: null,
        capdev_delivery_method_id: null,
        capdev_term_id: null
      }
    ]
  }) as unknown as BilateralResultDetail;

/**
 * 🛑 THE GLOBAL `RolesService.readOnly` MUST BE LOWERED, OR THIS WHOLE SUITE IS VACUOUS.
 *
 * Every `pr-*` control picks its read-only branch from `readOnly() || rolesSE.readOnly`, and
 * `RolesService._readOnly` starts TRUE (roles.service.ts:22). Leave it alone and the harness
 * renders read-only no matter what `[readOnly]` is bound to — the locked cases below would pass
 * against the global, proving nothing about the binding this spec exists to test. Measured: the
 * first run of this suite had the two `disabled = false` cases RED for exactly this reason.
 *
 * Lowering it also reproduces production: the drawer flips `rolesSE.readOnly = false` for the
 * lifetime of the panel (`result-review-drawer.component.ts:1003`, design.md P-3). That flip is
 * WHY the Center-reported fields render editable for an SP reviewer, and therefore why this spec's
 * per-control `[readOnly]` binding is needed at all.
 */
const lowerGlobalReadOnly = (wrapper: any) => {
  const roles = wrapper.fixture.debugElement.injector.get(RolesService);
  roles.readOnly = false;
  wrapper.fixture.detectChanges();
  return cy.wrap(wrapper);
};

const mountPolicy = (disabled: boolean) =>
  cy
    .mount(PolicyChangeContentComponent, {
      componentProperties: { disabled, resultDetail: policyDetail() },
      providers: [
        {
          provide: PolicyControlListService,
          useValue: { policyTypesList: POLICY_TYPES, policyStages: POLICY_STAGES }
        },
        {
          provide: InstitutionsService,
          useValue: { institutionsList: [], loadedInstitutions: new EventEmitter<boolean>() }
        }
      ]
    })
    .then(lowerGlobalReadOnly);

const mountCapSharing = (disabled: boolean) =>
  cy
    .mount(CapSharingContentComponent, {
      componentProperties: { disabled, resultDetail: capSharingDetail() },
      providers: [
        {
          provide: ApiService,
          useValue: {
            resultsSE: {
              GET_capdevsTerms: () => of({ response: [{ id: 1 }] }),
              GET_capdevsDeliveryMethod: () => of({ response: [{ id: 10 }] })
            }
          }
        }
      ]
    })
    .then(lowerGlobalReadOnly);

describe('RDR-T-2 — locked Center-reported fields render as read-only text', () => {
  describe('pr-select (policy-change-content)', () => {
    it('(a) locked: renders NO operable select trigger, and paints the stored labels as text', () => {
      mountPolicy(true);
      cy.get(SELECT_TRIGGER).should('have.length', 0);
      // RDR-R-1: the value is shown, not hidden — a lock that blanks the data is also a defect.
      cy.get(READONLY_TEXT).should('contain.text', 'National policy');
      cy.get(READONLY_TEXT).should('contain.text', 'Stage 2: Policy enacted');
    });

    it('(c) FALSIFIER — editable: the same selector DOES match, so (a) is not vacuous', () => {
      mountPolicy(false);
      cy.get(SELECT_TRIGGER).should('have.length', 2);
    });
  });

  describe('pr-input (cap-sharing-content)', () => {
    it('(b) locked: renders NO operable number input, and paints the stored numbers as text', () => {
      mountCapSharing(true);
      cy.get(NUMBER_INPUT).should('have.length', 0);
      cy.get(READONLY_TEXT).should('contain.text', '25');
      cy.get(READONLY_TEXT).should('contain.text', '40');
    });

    it('(b2) locked: a zero value is painted as 0, never as the absent-value text', () => {
      // `non_binary_using: 0` — the read-only branch special-cases `value == '0'` precisely so a
      // real zero is not swallowed by the `||` fallback chain into "Not applicable".
      mountCapSharing(true);
      cy.get(READONLY_TEXT).should('contain.text', '0');
      cy.get(READONLY_TEXT).should('not.contain.text', 'Not provided');
    });

    it('(b3) locked: an empty optional field falls back to the absent-value text, not an empty control', () => {
      // RDR-R-1 scenario 2 + its BUT clause: `has_unkown_using: null` must render text, never an
      // empty editable input.
      mountCapSharing(true);
      cy.get(READONLY_TEXT).should('contain.text', 'Not applicable');
      cy.get(NUMBER_INPUT).should('have.length', 0);
    });

    it('(c) FALSIFIER — editable: the same selector DOES match, so (b) is not vacuous', () => {
      mountCapSharing(false);
      cy.get(NUMBER_INPUT).should('have.length', 4);
    });
  });
});
