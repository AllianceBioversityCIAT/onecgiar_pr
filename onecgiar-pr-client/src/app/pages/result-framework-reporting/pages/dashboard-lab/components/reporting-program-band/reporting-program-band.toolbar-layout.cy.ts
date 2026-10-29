import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ReportingProgramBandComponent } from './reporting-program-band.component';
import { BilateralReviewCountService } from '../../../bilateral-review/services/bilateral-review-count.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';

/**
 * Toolbar layout gate — at ~1024px the "With Progress Tracker activity" switch used to run under the
 * Video Guide button because the filter group could not wrap. Measured in a real layout engine
 * (jsdom cannot): no two toolbar controls may intersect, and the short label takes over below 1280px.
 */
const mountBand = () =>
  cy.mount(ReportingProgramBandComponent, {
    imports: [HttpClientTestingModule, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: BilateralReviewCountService, useValue: { count: () => signal<number | null>(null), ensure: () => undefined } },
      { provide: DataControlService, useValue: { reportingCurrentPhase: { phaseId: 36 }, reportingPhaseVersion: signal(0) } }
    ],
    componentProperties: {
      programCode: 'SP01',
      programName: 'Breeding for Tomorrow',
      showToolbar: true,
      compactFilters: false,
      favoritesCount: 12,
      ptActivityAvailable: true,
      showInsightsToggle: true,
      canExpandAll: true,
      viewMode: 'grouped'
    } as never
  });

type Box = { name: string; rect: DOMRect };

const controlBoxes = ($root: JQuery<HTMLElement>): Box[] => {
  const row = $root[0].querySelector('[data-testid="reporting-toolbar-primary"]')!;
  const selector = ':scope [data-testid="reporting-filter-group"] > *, :scope [data-testid="reporting-view-controls"] > *';
  return Array.from(row.querySelectorAll<HTMLElement>(selector))
    .map(el => ({ name: el.getAttribute('data-testid') || el.getAttribute('aria-label') || el.tagName, rect: el.getBoundingClientRect() }))
    .filter(b => b.rect.width > 0 && b.rect.height > 0);
};

const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;

describe('ReportingProgramBandComponent — toolbar layout', () => {
  for (const width of [1024, 1280, 1440]) {
    it(`no toolbar control overlaps another at ${width}px`, () => {
      cy.viewport(width, 800);
      mountBand();
      cy.get('[data-testid="pt-activity-switch"]').should('be.visible');
      cy.get('[data-testid="reporting-toolbar-primary"]').then($row => {
        const boxes = controlBoxes($row.parent() as JQuery<HTMLElement>);
        expect(boxes.length, 'measured controls').to.be.greaterThan(5);
        const clashes: string[] = [];
        boxes.forEach((a, i) => boxes.slice(i + 1).forEach(b => intersects(a.rect, b.rect) && clashes.push(`${a.name} × ${b.name}`)));
        expect(clashes, 'overlapping controls').to.deep.equal([]);

        const row = $row[0].getBoundingClientRect();
        boxes.forEach(b => expect(b.rect.right, `${b.name} stays inside the row`).to.be.at.most(row.right + 0.5));
      });
    });
  }

  it('shows the short label below 1280px and the full label from 1280px', () => {
    cy.viewport(1024, 800);
    mountBand();
    cy.get('[data-testid="pt-activity-label-short"]').should('be.visible').and('have.text', 'PT activity');
    cy.get('[data-testid="pt-activity-label-full"]').should('not.be.visible');
    cy.get('[data-testid="pt-activity-switch"]').should('have.attr', 'title', 'With Progress Tracker activity');

    cy.viewport(1280, 800);
    cy.get('[data-testid="pt-activity-label-full"]').should('be.visible');
    cy.get('[data-testid="pt-activity-label-short"]').should('not.be.visible');
  });
});
