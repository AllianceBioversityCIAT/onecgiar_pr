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
  it('the "AI job running" chip renders alongside all four tabs at 375px without overflowing the tab strip (APF-R-10, requirements.md §9 D7)', () => {
    cy.viewport(375, 800);
    mountHeaderWithChip();

    cy.get('[data-testid="bilateral-ai-job-chip"]', { timeout: 10000 }).should('exist').and('contain.text', 'AI job running');

    const tabLabels = ['Overview', 'Reporting', 'Results', 'AI Draft Results'];
    cy.get('nav[aria-label="Center sections"] a').then($links => {
      const texts = Cypress._.map($links.toArray(), el => el.textContent?.replace(/\s+/g, ' ').trim() ?? '');
      tabLabels.forEach(label => {
        expect(texts.some(t => t.includes(label)), `tab strip contains "${label}"`).to.be.true;
      });
    });

    cy.get('nav[aria-label="Center sections"]').then($nav => {
      const el = $nav[0];
      const navOverflow = el.scrollWidth - el.clientWidth;
      horizontalScrollExcess().then(docOverflow => {
        // Full geometry report BEFORE the assertion — a failure still leaves the numbers in the
        // log/CI output (mirrors `bilateral-overview.cy.ts`'s pattern). `cy.log` only reaches the
        // Cypress runner UI, not headless stdout — the widths are folded into the assertion
        // message itself so a headless CI run still prints them.
        cy.get('nav[aria-label="Center sections"] > *').then($children => {
          const itemWidths = Cypress._.map($children.toArray(), c => ({
            item: c.getAttribute('data-testid') || c.textContent?.replace(/\s+/g, ' ').trim().slice(0, 24) || c.tagName,
            width: Math.round(c.getBoundingClientRect().width),
          }));
          const geometry =
            `nav clientWidth=${el.clientWidth}, nav scrollWidth=${el.scrollWidth}, ` +
            `nav scrollWidth-clientWidth=${navOverflow}, document scrollWidth-clientWidth=${docOverflow}, ` +
            `item widths=${JSON.stringify(itemWidths)}`;
          cy.log(geometry);
          expect(navOverflow, `tab strip nav scrollWidth - clientWidth at 375px (chip must not push it into overflow) — ${geometry}`).to.be.at
            .most(0);
          expect(docOverflow, `documentElement scrollWidth - clientWidth at 375px — ${geometry}`).to.be.at.most(0);
        });
      });
    });
  });
});
