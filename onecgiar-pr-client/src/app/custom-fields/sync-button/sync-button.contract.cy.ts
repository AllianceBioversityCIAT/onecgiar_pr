import { DataControlService } from '../../shared/services/data-control.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { mountCFHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-sync-button` (5 consuming screens, all inside Result Detail).
 *
 * Source of truth
 * ---------------
 * `sync-button.component.{ts,html}` is BYTE-IDENTICAL to `master`
 * (`git diff master -- src/app/custom-fields/sync-button/*.component.*` -> empty), so `master`
 * cannot be used to argue the component "changed". What changed underneath it is the framework:
 * Angular 19 -> Angular 21. The contract below is therefore derived from what the 5 real
 * consumers need, which is the same on both branches:
 *
 *   <app-sync-button (clickSave)="onSyncSection()"></app-sync-button>
 *
 * dropped unconditionally into rd-general-information, rd-partners, rd-geographic-location,
 * rd-contributors-and-partners and knowledge-product-info. None of them guards it. The button
 * decides for itself whether to show, by reading TWO PLAIN (non-signal) service flags:
 *
 *   *ngIf="dataControlSE.isKnowledgeProduct && !rolesSE.readOnly"
 *
 * BOTH flags are resolved ASYNCHRONOUSLY, after the section renders:
 *   - `DataControlService.currentResult` is assigned when GET result/:id resolves
 *     (`isKnowledgeProduct` is a getter over `currentResult.result_type_id == 6`);
 *   - `RolesService.readOnly` is assigned when the role/phase check resolves, and DEFAULTS TO TRUE.
 *
 * So "the flag flips after mount" is not a laboratory case — it is the ONLY way this button
 * ever becomes visible in the running app.
 *
 * NOTE for the reader: `DataControlService` already exposes `isKnowledgeProductSignal`
 * (a `computed()` over `currentResultSignal`) — the reactive equivalent this template does
 * not use. Same for `SaveButtonService.isGettingSection`, which carries an in-code comment
 * stating plain booleans stopped rendering on Angular 21. The reactive tools exist; this
 * component is still on the plain flags.
 */

/**
 * Local helper (ct-utils is shared with other agents and must not be edited).
 *
 * Mutates an INJECTED SERVICE the way the app does — outside any template binding — and INSIDE
 * the Angular zone, because in the app these assignments always happen inside an HTTP
 * `subscribe()` callback, which is a zone task. Running the mutation outside the zone would
 * schedule no tick at all and the resulting red would be a harness artefact, not a defect.
 *
 * Change detection is left to Angular (`autoDetectChanges`) for the same reason `patchHost`
 * does: forcing a synchronous `detectChanges()` raises NG0100 from the harness itself.
 */
function patchService<T>(token: any, fn: (svc: T) => void) {
  return cy.get('@ctWrapper').then((wrapper: any) => {
    const fixture = wrapper.fixture;
    fixture.autoDetectChanges(true);
    fixture.ngZone.run(() => fn(fixture.debugElement.injector.get(token)));
    return cy.wrap(wrapper, { log: false });
  });
}

const TEMPLATE = `<app-sync-button [text]="text" (clickSave)="onSave()"></app-sync-button>`;

const KNOWLEDGE_PRODUCT = { result_type_id: 6 } as any;

describe('SyncButtonComponent — contract', () => {
  const mount = () => {
    const onSave = cy.stub().as('save');
    return mountCFHost(TEMPLATE, { componentProperties: { text: 'Sync', onSave } });
  };

  describe('visibility gate', () => {
    it('[contract] stays hidden while the result is not a knowledge product', () => {
      mount();
      patchService(RolesService, (roles: any) => (roles.readOnly = false));
      cy.get('.fixed_button').should('not.exist');
    });

    it('[contract] stays hidden for a knowledge product while the user is read-only (the app default)', () => {
      mount();
      patchService(DataControlService, (dc: any) => (dc.currentResult = KNOWLEDGE_PRODUCT));
      cy.get('.fixed_button').should('not.exist');
    });

    /**
     * THE contract for this component. In the app the section template renders FIRST and the
     * result payload lands afterwards; the button must appear when it does.
     */
    it('[contract] appears once the loaded result turns out to be a knowledge product', () => {
      mount();
      patchService(RolesService, (roles: any) => (roles.readOnly = false));
      cy.get('.fixed_button').should('not.exist');

      // The async moment: GET result/:id resolved and it is a knowledge product.
      patchService(DataControlService, (dc: any) => (dc.currentResult = KNOWLEDGE_PRODUCT));

      cy.get('.fixed_button').should('exist');
      cy.get('app-pr-button .text').should('contain.text', 'Sync');
    });

    /**
     * The mirror case: the role check resolves last (it very often does — `readOnly` starts
     * TRUE and is only lowered once the phase + role are known).
     */
    it('[contract] appears once the role check lowers readOnly on a knowledge product', () => {
      mount();
      patchService(DataControlService, (dc: any) => (dc.currentResult = KNOWLEDGE_PRODUCT));
      cy.get('.fixed_button').should('not.exist');

      patchService(RolesService, (roles: any) => (roles.readOnly = false));

      cy.get('.fixed_button').should('exist');
    });

    it('[contract] disappears again when the user loses edit rights', () => {
      mount();
      patchService(RolesService, (roles: any) => (roles.readOnly = false));
      patchService(DataControlService, (dc: any) => (dc.currentResult = KNOWLEDGE_PRODUCT));
      cy.get('.fixed_button').should('exist');

      patchService(RolesService, (roles: any) => (roles.readOnly = true));
      cy.get('.fixed_button').should('not.exist');
    });
  });

  describe('action', () => {
    /** Bring the button into view through the same path the app uses, then act on it. */
    const mountVisible = () => {
      mount();
      patchService(RolesService, (roles: any) => (roles.readOnly = false));
      patchService(DataControlService, (dc: any) => (dc.currentResult = KNOWLEDGE_PRODUCT));
      return cy.get('.fixed_button').should('exist');
    };

    it('[contract] emits clickSave exactly once per click', () => {
      mountVisible();
      cy.get('.fixed_button').click();
      cy.get('@save').should('have.been.calledOnce');
    });

    it('[contract] emits once per click across repeated clicks (no double firing)', () => {
      mountVisible();
      cy.get('.fixed_button').click().click().click();
      cy.get('@save').should('have.been.calledThrice');
    });

    it('[contract] renders the label supplied by the consumer', () => {
      mountVisible();
      cy.get('app-pr-button .text').should('contain.text', 'Sync');
    });
  });
});
