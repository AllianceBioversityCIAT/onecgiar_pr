// @akili-spec results/impact-results-reporting/sp-reporting-entry
import { of } from 'rxjs';
import { ImpactResultsCardComponent } from './impact-results-card.component';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { IMPACT_AREAS } from '../../../../shared/report-result/impact-areas.constant';

/**
 * IRE-T-5 / IRE-NFR-2 — layout of the Impact results card at 1280 and 900 px (design.md §6.1).
 * Real component mount; `GET_impactLevelCounts` is stubbed. One area name is stretched to 200 chars
 * (restored after each test) so wrapping is actually exercised.
 */
const LONG_NAME =
  'Environmental Health and Biodiversity — a deliberately very long impact area name used only to prove that the name wraps inside its flexible track instead of pushing the count or the report button out of the card';

const original = IMPACT_AREAS.map(a => a.name);
const E6 = { response: { areas: [1, 2, 3, 4, 5].map(id => ({ impact_area_id: id, count: id * 7 })), total: 105 } };

function mountCard(canReport: boolean) {
  cy.mount(ImpactResultsCardComponent, {
    providers: [{ provide: ResultsApiService, useValue: { GET_impactLevelCounts: () => of(E6) } }],
    componentProperties: { initiativeId: 1, versionId: 36, canReport } as any
  });
  cy.get('[data-testid=impact-row]').should('have.length', 5);
  cy.get('[data-testid=impact-row-count]').first().should('contain.text', '7');
  // harness guard: utility CSS is loaded (rows are flex), otherwise the layout assertions prove nothing
  cy.get('[data-testid=impact-row]').first().should('have.css', 'display', 'flex');
}

describe('ImpactResultsCardComponent — layout (IRE-T-5)', () => {
  beforeEach(() => {
    IMPACT_AREAS[2].name = LONG_NAME;
  });
  afterEach(() => {
    IMPACT_AREAS.forEach((a, i) => (a.name = original[i]));
  });

  [1280, 900].forEach(width => {
    describe(`at ${width}px`, () => {
      beforeEach(() => cy.viewport(width, 900));

      it('has no horizontal overflow and keeps count + button visible and inside the card on every row', () => {
        mountCard(true);
        cy.get('[data-testid=impact-results-card]').then($card => {
          const card = $card[0];
          expect(card.scrollWidth, 'card scrollWidth <= clientWidth').to.be.at.most(card.clientWidth);
          const cardRight = card.getBoundingClientRect().right;
          cy.get('[data-testid=impact-row]').each($row => {
            const row = $row[0];
            expect(row.scrollWidth, 'row scrollWidth <= clientWidth').to.be.at.most(row.clientWidth);
            const btn = row.querySelector('[data-testid=impact-report-btn]') as HTMLElement;
            const count = row.querySelector('[data-testid=impact-row-count]') as HTMLElement;
            expect(btn.getBoundingClientRect().right, 'button right edge inside card').to.be.at.most(cardRight);
            cy.wrap(btn).should('be.visible');
            cy.wrap(count).should('be.visible');
          });
        });
      });

      it('wraps the long name (more than one line) while the count and button stay on the row', () => {
        mountCard(true);
        cy.get('[data-testid=impact-row-name]')
          .eq(2)
          .then($name => {
            const el = $name[0];
            const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
            expect(el.getBoundingClientRect().height, 'long name taller than one line').to.be.greaterThan(lineHeight * 1.5);
            expect(el.scrollWidth, 'name does not overflow horizontally').to.be.at.most(el.clientWidth);
          });
        cy.get('[data-testid=impact-row-name]').eq(0).then($n => {
          expect($n[0].getBoundingClientRect().height, 'short name stays single line').to.be.lessThan(parseFloat(getComputedStyle($n[0]).lineHeight) * 1.5);
        });
      });

      it('enables every button when canReport=true and disables all when canReport=false', () => {
        mountCard(true);
        cy.get('[data-testid=impact-report-btn]').should('have.length', 5).and('be.enabled');
        mountCard(false);
        cy.get('[data-testid=impact-report-btn]').should('have.length', 5).each($b => expect($b).to.have.prop('disabled', true));
      });
    });
  });
});
