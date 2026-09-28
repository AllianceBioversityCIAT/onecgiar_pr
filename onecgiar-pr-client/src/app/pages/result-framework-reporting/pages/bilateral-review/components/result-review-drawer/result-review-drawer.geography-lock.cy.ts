// @akili-spec bilateral/review-toc-only-editing (BIL-RTE-T-7 — lock geography Yes/No in the drawer)
//
// Proves BIL-RTE-R-1.a/b: mounts the REAL `GeoscopeManagementComponent` with the exact `[readOnly]`
// the drawer passes, locked to the real template via `before()`. Full reasoning (mount decision,
// why "0 vs 2 choices" beats "click Yes, assert unchanged", and the chip/Approve/Save-button proof
// split with the Jest spec) is recorded in `docs/specs/bilateral/review-toc-only-editing/execution.md`
// §BIL-RTE-T-7 — read that before changing this file's scope or assertions.
import { GeoscopeManagementComponent } from '../../../../../../shared/components/geoscope-management/geoscope-management.component';
import { GeoscopeManagementModule } from '../../../../../../shared/components/geoscope-management/geoscope-management.module';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { GeoScopeEnum } from '../../../../../../shared/enum/geo-scope.enum';
import { RolesService } from '../../../../../../shared/services/global/roles.service';

/** Both Yes/No questions render their options only when `geo_scope_id == GLOBAL` (`hideOptions`
 * evaluates `false` for both fields at that id — `geoscope-management.component.html:28,60`). Using
 * any other scope would hide the choices for a reason unrelated to the lock this suite tests. */
const geoBody = (overrides: Record<string, unknown> = {}) => ({
  geo_scope_id: GeoScopeEnum.GLOBAL,
  regions: [],
  countries: [],
  extra_regions: [],
  extra_countries: [],
  has_regions: undefined,
  has_countries: undefined,
  ...overrides
});

/**
 * 🛑 THE GLOBAL `RolesService.readOnly` MUST BE LOWERED, OR THIS WHOLE SUITE IS VACUOUS — same
 * gotcha `result-review-drawer.readonly-render.cy.ts` documents. `RolesService._readOnly` starts
 * `true` (`roles.service.ts:22`); `pr-yes-or-not` ORs it into its own lock
 * (`!(readOnly || rolesSE.readOnly)`), so leaving it untouched locks EVERY case here regardless of
 * the component's own `[readOnly]` input, and a "(a) locked" case would pass for the wrong reason.
 *
 * Lowering it also reproduces production: the drawer flips `rolesSE.readOnly = false` for the
 * lifetime of the panel for ANY program member who can act in the drawer — admin or not
 * (`result-review-drawer.component.ts` `canEditInDrawer()`; AGENTS.md §4). That flip is exactly WHY
 * `geoscope-management`'s own per-instance `[readOnly]` input has to carry the lock on its own for a
 * non-admin reviewer — before BIL-RTE-T-7, it did not, and the bug was invisible unless this global
 * was lowered to match. Measured: without this, the pre-fix "editable" cases below render 0 choices
 * (locked by the untouched global) instead of exposing the leak.
 */
const lowerGlobalReadOnly = (wrapper: any) => {
  const roles = wrapper.fixture.debugElement.injector.get(RolesService);
  roles.readOnly = false;
  wrapper.fixture.detectChanges();
  return cy.wrap(wrapper);
};

const mountGeoscope = (readOnly: boolean, body = geoBody()) =>
  cy
    .mount(GeoscopeManagementComponent, {
      imports: [GeoscopeManagementModule, HttpClientTestingModule],
      providers: [provideRouter([])],
      componentProperties: { module: 'reporting', body, readOnly }
    })
    .then(lowerGlobalReadOnly);

const REAL_DRAWER_TEMPLATE_PATH =
  'src/app/pages/result-framework-reporting/pages/bilateral-review/components/result-review-drawer/result-review-drawer.component.html';

describe('BIL-RTE-T-7 — geography Yes/No lock in the review drawer', () => {
  before(() => {
    // TEMPLATE-DRIFT LOCK (same convention as `result-review-drawer.approve-tooltip.cy.ts`): this
    // suite mounts `GeoscopeManagementComponent` directly with the readOnly value the drawer is
    // SUPPOSED to pass. If the drawer template ever stops passing that binding, nothing else here
    // would notice — so read the real file and assert the two verbatim bindings survive.
    cy.readFile(REAL_DRAWER_TEMPLATE_PATH).then((html: string) => {
      // Scoped to `<app-geoscope-management ... </app-geoscope-management>` blocks on purpose —
      // `[readOnly]="!canEditDataStandards()"` alone also appears on several sibling controls in
      // the same card (textarea, multi-selects, …), so an unscoped substring count over-counts
      // (measured 8, not 2) and would not actually pin the geoscope call sites.
      const geoscopeBlocks = html.match(/<app-geoscope-management[\s\S]*?<\/app-geoscope-management>/g) ?? [];
      expect(geoscopeBlocks, 'main app-geoscope-management call site in the drawer').to.have.length(1);
      geoscopeBlocks.forEach(block => {
        expect(block, 'each app-geoscope-management site').to.include('[readOnly]="!canEditDataStandards()"');
      });
      // "Save data standards" (R-1.b) stays gated behind the SAME predicate — unaffected by this
      // task, asserted here only so a future regression on either side is caught in one place.
      expect(html).to.include('@if (canEditDataStandards())');
      expect(html).to.include('Save data standards');
    });
  });

  describe('"any regions…" (has_regions)', () => {
    it('(a) locked (non-admin): renders NO clickable choice when unanswered — nothing to click, so the value cannot change', () => {
      mountGeoscope(true).then(wrapper => {
        cy.get('.choice').should('have.length', 0);
        cy.wrap(wrapper).its('component.body.has_regions').should('be.undefined');
      });
    });

    it('(b) FALSIFIER — editable (admin): both choices render, and clicking "Yes" changes the value', () => {
      // Scoped to the FIRST `app-pr-yes-or-not` (regions): with `readOnly=false` both geography
      // questions render unlocked at once, so an unscoped `.choice` count is 4 (2 fields x 2
      // choices), not 2 — isolate this field the same way test (a) under "has_countries" does.
      mountGeoscope(false).then(wrapper => {
        cy.get('app-pr-yes-or-not').eq(0).find('.choice').should('have.length', 2);
        cy.get('app-pr-yes-or-not').eq(0).contains('.choice', 'Yes').click();
        cy.wrap(wrapper).its('component.body.has_regions').should('eq', true);
      });
    });

    it('(c) locked with a prior answer: only the answered choice renders, and clicking it (already selected) leaves it unchanged', () => {
      mountGeoscope(true, geoBody({ has_regions: true })).then(wrapper => {
        cy.get('.choice').should('have.length', 1).and('contain.text', 'Yes');
        cy.get('.choice').click();
        cy.wrap(wrapper).its('component.body.has_regions').should('eq', true);
      });
    });
  });

  describe('"any countries…" (has_countries)', () => {
    it('(a) locked (non-admin): renders NO clickable choice when unanswered', () => {
      mountGeoscope(true).then(wrapper => {
        // Both questions render together at geo_scope_id = GLOBAL, so this counts BOTH fields'
        // `.choice` nodes — reading `has_regions` above already isolates the regions field;
        // isolate this field the same way, by index.
        cy.get('app-pr-yes-or-not').should('have.length', 2);
        cy.get('app-pr-yes-or-not').eq(1).find('.choice').should('have.length', 0);
        cy.wrap(wrapper).its('component.body.has_countries').should('be.undefined');
      });
    });

    it('(b) FALSIFIER — editable (admin): both choices render, and clicking "No" changes the value', () => {
      mountGeoscope(false).then(wrapper => {
        cy.get('app-pr-yes-or-not').eq(1).find('.choice').should('have.length', 2);
        cy.get('app-pr-yes-or-not').eq(1).contains('.choice', 'No').click();
        cy.wrap(wrapper).its('component.body.has_countries').should('eq', false);
      });
    });
  });

  describe('consumers with no [readOnly] input keep behaving as today', () => {
    it('default (omitted [readOnly]) is editable — matches ipsr / rd-geographic-location callers, which never pass this input', () => {
      // `componentProperties` deliberately omits `readOnly` — grep confirms
      // `innovation-package-creator.component.html`, `step-n1.component.html` and
      // `rd-geographic-location.component.html` never bind it either (Consumers, tasks.md).
      cy
        .mount(GeoscopeManagementComponent, {
          imports: [GeoscopeManagementModule, HttpClientTestingModule],
          providers: [provideRouter([])],
          componentProperties: { module: 'reporting', body: geoBody() }
        })
        .then(lowerGlobalReadOnly)
        .then(wrapper => {
          cy.get('.choice').should('have.length', 4); // 2 choices x 2 questions, both interactive
          cy.wrap(wrapper).its('component.readOnly').should('eq', false);
        });
    });
  });
});
