import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { mountCF, mountCFHost } from '../../../../cypress/support/ct-utils';
import { ResultsApiService } from '../../shared/services/api/results-api.service';

/**
 * Behavior lock for <app-lead-contact-person-field> before the signals refactor.
 *
 * Covers the deterministic, no-network paths: a pre-selected contact renders locked with its
 * details + a clear button, and clearing removes the selection. (The live AD search path hits
 * the API and is left to manual/E2E verification.)
 */
describe('LeadContactPersonFieldComponent (CT)', () => {
  const TEMPLATE = `<app-lead-contact-person-field [body]="body"></app-lead-contact-person-field>`;

  const prefilledBody = () => ({
    lead_contact_person: 'Jane Doe',
    lead_contact_person_data: { display_name: 'Jane Doe', mail: 'jane.doe@cgiar.org', title: 'Researcher' }
  });

  it('renders a pre-selected contact locked with its details and a clear button', () => {
    mountCF(TEMPLATE, { editable: true, componentProperties: { body: prefilledBody() } });
    cy.get('.selected-user-name').should('contain.text', 'Jane Doe');
    cy.get('.selected-user-info').should('contain.text', 'jane.doe@cgiar.org');
    cy.get('.clear-contact-btn').should('exist');
  });

  it('clears the selection when the clear button is clicked', () => {
    mountCF(TEMPLATE, { editable: true, componentProperties: { body: prefilledBody() } });
    cy.get('.clear-contact-btn').click();
    cy.get('.selected-contact-info').should('not.exist');
    cy.get('.clear-contact-btn').should('not.exist');
  });
});

/**
 * P2-3260 regression — bugfix/lead-contact-person-search (LCP-R-1, LCP-R-2, LCP-AC-1..3).
 *
 * Root cause: `GET /api/ad-users/search` answers HTTP 404 for "no matches". Before the fix, the
 * component's `switchMap`-over-a-single-long-lived-`searchSubject` pipeline had no `catchError`,
 * so that 404 propagated as an `error` notification and permanently killed the outer
 * subscription — every search typed after the FIRST zero-match result silently did nothing,
 * with no page reload able to recover it short of a full component remount.
 *
 * `mountCF`/`mountCFHost` bring in `HttpClientTestingModule` (see `ct-utils.ts`), so
 * `GET_adUsersSearch` never reaches a real XHR for `cy.intercept` to catch — the seam this test
 * drives is the component's own public `resultsApiService.GET_adUsersSearch`, the same seam the
 * Jest unit spec already stubs via `jest.spyOn` for its single-search cases. What Jest does NOT
 * cover (see `lead-contact-person-field.component.spec.ts`'s "should handle search errors
 * gracefully") is a SECOND, different, successful search in the SAME component instance after an
 * error — that multi-search sequence is exactly what killed the pipeline, and is what this test
 * proves fixed.
 *
 * Harness note: this component's search result lands on an RxJS `debounceTime(500)` timer
 * callback, not a Cypress-driven DOM event, and `mountCF`/`mountCFHost` only repaint the view in
 * response to the latter. Verified by reading `debugElement.query(...)` directly across many
 * runs: the component's OWN state (`searchResults`, `showResults`, `isSearching`,
 * `isContactLocked`) is correct after every search in this suite the instant the debounce settles
 * — proving the fix works — even on runs where the DOM had not yet repainted to match. Neither
 * `fixture.detectChanges()` nor `ApplicationRef.tick()` reliably forces that repaint here; a
 * genuine Cypress-driven DOM event afterward does. `settle()` waits past the debounce, fires one
 * inert click (no handler, so no side effect on component state) to trigger Angular's normal
 * zone-based repaint, then asserts against the live DOM with a generous retry timeout. This is a
 * test-harness concern, not something the component under test is responsible for.
 */
describe('LeadContactPersonFieldComponent — search pipeline survives a zero-match search (P2-3260)', () => {
  const TEMPLATE = `<app-lead-contact-person-field [body]="body"></app-lead-contact-person-field>`;

  const emptyBody = () => ({ lead_contact_person: null, lead_contact_person_data: null });

  const matchedUser = { display_name: 'Ana Cadavid', mail: 'ana.cadavid@cgiar.org', title: 'Researcher' };

  /** Keep forcing change detection until `selector` matches (or times out). */
  const settle = (selector: string, exists = true) => {
    cy.wait(700);
    // A genuine Cypress-driven DOM event (vs. the RxJS debounceTime timer callback that produced
    // this state change) is what this CT harness needs to repaint — see the class doc comment.
    // Click something inert (no handler) rather than the input itself, so this nudge carries no
    // side effect of its own (blurring the input would trip `onContactBlur()`).
    cy.get('.fch_title').click({ force: true });
    cy.get('@ctWrapper', { timeout: 8000 }).should((wrapper: any) => {
      const found = wrapper.fixture.nativeElement.querySelector(selector);
      if (exists) {
        // eslint-disable-next-line no-unused-expressions
        expect(found, `${selector} present`).to.exist;
      } else {
        // eslint-disable-next-line no-unused-expressions
        expect(found, `${selector} absent`).to.not.exist;
      }
    });
  };

  it('keeps the pipeline alive after a 404 zero-match search, so a later different valid query still renders results (LCP-AC-1)', () => {
    mountCFHost(TEMPLATE, { editable: true, componentProperties: { body: emptyBody() } }).then(wrapper => {
      const api = wrapper.fixture.debugElement.injector.get(ResultsApiService);
      cy.stub(api, 'GET_adUsersSearch').callsFake((query: string) => {
        if (query === 'ogutu') {
          return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }));
        }
        if (query === 'cadavid') {
          return of({ response: [matchedUser] });
        }
        return of({ response: [] });
      });
    });

    // Step 1: a zero-match (404) search — must not crash and must not get stuck "Searching…".
    cy.get('input').type('ogutu');
    settle('.search-loading', false);
    settle('.search-results-container', false);

    // Step 2: a DIFFERENT valid query in the SAME mounted instance — this is what the dead
    // pipeline used to drop silently. Clear first so the query actually changes (debounced,
    // distinctUntilChanged).
    cy.get('input').clear();
    cy.get('input').type('cadavid');
    settle('.search-results');
    cy.get('.search-result-item').should('contain.text', 'Ana Cadavid');

    // Selectable — proves the result is not just rendered but usable.
    cy.get('.search-result-item').click();
    cy.get('.selected-user-name').should('contain.text', 'Ana Cadavid');
  });

  it('keeps working after several consecutive zero-match searches, not just one (LCP-AC-2)', () => {
    mountCFHost(TEMPLATE, { editable: true, componentProperties: { body: emptyBody() } }).then(wrapper => {
      const api = wrapper.fixture.debugElement.injector.get(ResultsApiService);
      cy.stub(api, 'GET_adUsersSearch').callsFake((query: string) => {
        if (query === 'cadavid') {
          return of({ response: [matchedUser] });
        }
        return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }));
      });
    });

    cy.get('input').type('ogutu');
    settle('.search-results-container', false);

    cy.get('input').clear();
    cy.get('input').type('nomatch');
    settle('.search-results-container', false);

    cy.get('input').clear();
    cy.get('input').type('another');
    settle('.search-results-container', false);

    cy.get('input').clear();
    cy.get('input').type('cadavid');
    settle('.search-results');
    cy.get('.search-result-item').should('contain.text', 'Ana Cadavid');
  });

  it('renders the standard empty-result UX (no crash, no stuck spinner) on a transient request error (LCP-AC-3)', () => {
    mountCFHost(TEMPLATE, { editable: true, componentProperties: { body: emptyBody() } }).then(wrapper => {
      const api = wrapper.fixture.debugElement.injector.get(ResultsApiService);
      cy.stub(api, 'GET_adUsersSearch').returns(throwError(() => new Error('network error')));
    });

    cy.get('input').type('ogutu');
    settle('.search-loading', false);
    settle('.search-results-container', false);
  });
});
