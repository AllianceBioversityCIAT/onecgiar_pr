import { DataControlService } from '../../shared/services/data-control.service';
import { mountCFHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-detail-section-title`.
 *
 * Source of truth
 * ---------------
 * `master` — BYTE-IDENTICAL there
 * (`git diff master -- src/app/custom-fields/detail-section-title/*` -> empty).
 *
 * Consumer count: ZERO template consumers today
 * (`grep -rl --include='*.html' '<app-detail-section-title' src/` -> no matches; it was used by
 * Result Detail sections before the header was reworked). Per design.md non-goals, a component
 * with no consumers gets smoke-level coverage only.
 *
 * That said, this one is NOT purely presentational — `ngOnInit` writes to two places outside
 * itself, and those side effects are the only reason to keep it. They are locked here so that a
 * future reuse (or a deletion) is a conscious decision:
 *   - `Title.setTitle(...)`                       -> the browser tab title
 *   - `DataControlService.currentSectionName`     -> read elsewhere for breadcrumbs/telemetry
 * Both fall back from `title` to `sectionName`, while the VISIBLE text is always `sectionName`.
 */

describe('DetailSectionTitleComponent — contract', () => {
  it('[contract] renders the section name', () => {
    mountCFHost(`<app-detail-section-title sectionName="General Information"></app-detail-section-title>`);
    cy.get('.section_detail_title').should('have.text', 'General Information');
  });

  it('[contract] renders the section name even when a different document title is supplied', () => {
    mountCFHost(`<app-detail-section-title sectionName="General Information" title="PRMS — General Info"></app-detail-section-title>`);
    cy.get('.section_detail_title').should('have.text', 'General Information');
  });

  it('[contract] sets the document title from the section name when no title override is given', () => {
    mountCFHost(`<app-detail-section-title sectionName="Evidence"></app-detail-section-title>`);
    cy.document().its('title').should('eq', 'Evidence');
  });

  it('[contract] lets an explicit [title] win for the document title', () => {
    mountCFHost(`<app-detail-section-title sectionName="Evidence" title="PRMS — Evidence"></app-detail-section-title>`);
    cy.document().its('title').should('eq', 'PRMS — Evidence');
  });

  it('[contract] publishes the current section name on DataControlService', () => {
    mountCFHost(`<app-detail-section-title sectionName="Partners"></app-detail-section-title>`).then((w: any) => {
      const dc = w.fixture.debugElement.injector.get(DataControlService);
      expect(dc.currentSectionName).to.eq('Partners');
    });
  });

  it('[contract] publishes the title override as the current section name when present', () => {
    mountCFHost(`<app-detail-section-title sectionName="Partners" title="Contributors & Partners"></app-detail-section-title>`).then(
      (w: any) => {
        const dc = w.fixture.debugElement.injector.get(DataControlService);
        expect(dc.currentSectionName).to.eq('Contributors & Partners');
      }
    );
  });
});
