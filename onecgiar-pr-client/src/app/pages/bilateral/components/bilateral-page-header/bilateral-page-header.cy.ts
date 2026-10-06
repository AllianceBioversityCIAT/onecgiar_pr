// @akili-spec bilateral/ai-processing-queue (AIQ-T-9, AIQ-R-10, AIQ-R-12)
//
// CT smoke gate: mounts the REAL `BilateralPageHeaderComponent` (`variant="band"`,
// `activeTab="reporting"`) at 375 px with `app-ai-processes-trigger` forced into its `working`
// state (an active job on `BilateralAiService.jobs()`) and proves it renders visibly alongside the
// tab strip in a real layout engine — the old chip's `data-testid` selector is fully retired from
// this file (`AIQ-T-9` Done criteria).
//
// Disqualifier (`tasks.md` `AIQ-T-9`): a strict zero-horizontal-overflow assertion at 375 px cannot
// be proven in Jest, but re-asserting it HERE without first measuring the tab strip's OWN baseline
// overflow would silently attribute pre-existing overflow to this trigger. That baseline measurement
// is `AIQ-T-11`'s job (`KZ L1`) — this file only proves the trigger renders and stays reachable,
// it does not re-litigate the zero-overflow gate.
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BilateralPageHeaderComponent } from './bilateral-page-header.component';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { normalizeListJob } from '../../bilateral-ai-job.model';
import { rawListJob } from '../../bilateral-ai-job.fixtures';

const CENTER_ACRONYM = 'AfricaRice';
const CENTER_NAME = 'Africa Rice Center';

/** Mounts the real header with an active job so the trigger renders its `working` state
 * (spinning ring + badge) — deliberately for a DIFFERENT center than the job's own
 * (`AIQ-R-10` A: the trigger must not depend on the Center). */
function mountHeaderWithActiveJob() {
  return cy
    .mount(BilateralPageHeaderComponent, {
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      componentProperties: { activeTab: 'reporting' },
    })
    .then(wrapper => {
      const ctx = wrapper.fixture.debugElement.injector.get(BilateralContextService);
      ctx.setCenter(CENTER_ACRONYM, CENTER_NAME, CENTER_ACRONYM, 1);

      const aiService = wrapper.fixture.debugElement.injector.get(BilateralAiService);
      aiService.jobs.set([normalizeListJob(rawListJob({ job_id: 'job-1', status: 'PROCESSING', center_id: '999' }))]);

      wrapper.fixture.detectChanges();
      return cy.wrap(wrapper);
    });
}

describe('BilateralPageHeaderComponent — CT smoke gate (AIQ-T-9)', () => {
  it('the "AI processes" trigger renders visibly at 375px alongside the tab strip (AIQ-R-10, AIQ-R-12)', () => {
    cy.viewport(375, 800);
    mountHeaderWithActiveJob();

    cy.get('[data-testid="ai-processes-trigger"]').filter(':visible', { timeout: 10000 }).should('exist').and('contain.text', 'AI processes');
    cy.get('[data-testid="ai-processes-trigger-badge"]').filter(':visible').should('contain.text', '1');

    const tabLabels = ['Overview', 'Reporting', 'Results', 'My Drafts'];
    cy.get('nav[aria-label="Center sections"] a').then($links => {
      const texts = Cypress._.map($links.toArray(), el => el.textContent?.replace(/\s+/g, ' ').trim() ?? '');
      tabLabels.forEach(label => {
        expect(texts.some(t => t.includes(label)), `tab strip contains "${label}"`).to.be.true;
      });
    });
  });
});
