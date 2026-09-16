// @akili-spec bilateral/ai-processing-feedback (APF-T-9, APF-R-10, requirements.md §9 D7)
//
// CT layout gate: mounts the REAL `BilateralPageHeaderComponent` (`variant="band"`,
// `activeTab="reporting"`) at 375 px with the "AI job running" chip forced alive
// (`BilateralAiService.uploadState`/`activeJob`, same technique as
// `bilateral-page-header.component.spec.ts`'s "AI job running chip" describe block) and proves,
// in a real layout engine, that the chip does NOT push the tab strip into overflow — the
// disqualifier `design.md §6.3`/`requirements.md §9 D7` names explicitly ("the chip pushing the
// tab strip past `clientWidth` at 375"). Everything else about the header (tabs, breadcrumb,
// identity strip) is already covered by the Jest spec; this file is layout-only.
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BilateralPageHeaderComponent } from './bilateral-page-header.component';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';

const CENTER_ACRONYM = 'AfricaRice';
const CENTER_NAME = 'Africa Rice Center';

/** Mounts the real header with an alive, current-center AI job so the chip renders. */
function mountHeaderWithChip() {
  return cy
    .mount(BilateralPageHeaderComponent, {
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      componentProperties: { activeTab: 'reporting' },
    })
    .then(wrapper => {
      const ctx = wrapper.fixture.debugElement.injector.get(BilateralContextService);
      ctx.setCenter(CENTER_ACRONYM, CENTER_NAME, CENTER_ACRONYM, 1);

      const aiService = wrapper.fixture.debugElement.injector.get(BilateralAiService);
      aiService.uploadState.set({ jobId: 'job-1', status: 'processing', uploadProgress: 100 });
      // `activeJob` is a private field — same escape hatch the Jest spec uses to fake a
      // resumed/tracked job without driving the real upload flow.
      (aiService as unknown as { activeJob: unknown }).activeJob = {
        jobId: 'job-1',
        centerAcronym: CENTER_ACRONYM,
        startedAt: Date.now() - 90_000,
      };

      wrapper.fixture.detectChanges();
      return cy.wrap(wrapper);
    });
}

function horizontalScrollExcess(): Cypress.Chainable<number> {
  return cy.document().then(doc => {
    const root = doc.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
}

describe('BilateralPageHeaderComponent — CT layout gate (APF-T-9)', () => {
  it('the "AI job running" chip renders fully visible at 375px without horizontal scroll (APF-R-10, requirements.md §9 D7, Pivot Option A)', () => {
    cy.viewport(375, 800);
    mountHeaderWithChip();

    cy.get('[data-testid="bilateral-ai-job-chip"]').filter(':visible', { timeout: 10000 }).should('exist').and('contain.text', 'AI job running');

    const tabLabels = ['Overview', 'Reporting', 'Results', 'AI Draft Results'];
    cy.get('nav[aria-label="Center sections"] a').then($links => {
      const texts = Cypress._.map($links.toArray(), el => el.textContent?.replace(/\s+/g, ' ').trim() ?? '');
      tabLabels.forEach(label => {
        expect(texts.some(t => t.includes(label)), `tab strip contains "${label}"`).to.be.true;
      });
    });

    cy.get('[data-testid="bilateral-ai-job-chip"]').filter(':visible').then($chip => {
      const el = $chip[0];
      const rect = el.getBoundingClientRect();
      horizontalScrollExcess().then(docOverflow => {
        const geometry =
          `chip rect.left=${Math.round(rect.left)}, chip rect.right=${Math.round(rect.right)}, ` +
          `document scrollWidth-clientWidth=${docOverflow}`;
        cy.log(geometry);
        expect(rect.right, `chip right boundary ≤ 375px without scroll — ${geometry}`).to.be.at.most(375);
        expect(rect.left, `chip left boundary ≥ 0 — ${geometry}`).to.be.at.least(0);
        expect(docOverflow, `documentElement scrollWidth - clientWidth at 375px — ${geometry}`).to.be.at.most(0);
      });
    });
  });
});
