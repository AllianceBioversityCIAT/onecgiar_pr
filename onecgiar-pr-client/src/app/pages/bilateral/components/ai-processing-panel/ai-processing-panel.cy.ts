// @akili-spec bilateral/ai-processing-feedback (APF-T-9, APF-R-10, APF-AC-19, requirements.md §9 D7/D10)
//
// CT layout gate: mounts the REAL `AiProcessingPanelComponent` (no host, no providers needed — it
// is purely input-driven, `ai-processing-panel.component.ts`) in a real Chromium/Electron layout
// engine and proves three things a Jest/jsdom spec cannot:
//
//   (a) the stepper's `min-[640px]:grid-cols-6` actually lays 6 boxes on one row at 1280/900 (a
//       shared `top`, 6 distinct `left`s) and stacks them into one column below 640 px (6 distinct
//       `top`s) — `design.md` §6.3, never asserted by a class-name check (`KZ-EVM-1`);
//   (b) `document.documentElement.scrollWidth <= clientWidth` at every viewport — nothing (a
//       `min-w` step box, a long stage label) forces a document-level horizontal scroll;
//   (c) every terminal-outcome block (`still running` / `failed` / `no candidates`) measures
//       `getBoundingClientRect().height <= 160` — `design.md` §6.3 "All ≤ 160 px tall blocks
//       except the stepper card";
//   (d) under `prefers-reduced-motion: reduce`, the active step's pulsing dot resolves to a REAL
//       computed `animation-name: none` (`requirements.md` §9 D10).
//
// (d) needs a note: Tailwind's `motion-reduce:` variant compiles to a genuine
// `@media (prefers-reduced-motion: reduce)` CSS rule (verified: `grep motion-reduce` across
// `src/app` — every hit is a template class, none is gated by a JS `matchMedia()` read in this
// component). Stubbing `window.matchMedia` from the spec never touches that rule — the CSS engine
// consults its own internal media-feature state, not the JS function object exposed on `window`.
// The only way to make `getComputedStyle(...).animationName` actually resolve to `'none'` is to
// flip that internal state, which requires Chromium's `Emulation.setEmulatedMedia` (CDP) — Cypress
// exposes it via `Cypress.automation('remote:debugger:protocol', ...)`, which works against both
// Chrome-family browsers and Cypress' own Electron runner (`npm run test:ct` defaults to Electron).
import { AiProcessingPanelComponent } from './ai-processing-panel.component';
import { normalizeJob } from '../../bilateral-ai-job.model';
import {
  FIXTURE_PROCESSING_EXTRACTING,
  FIXTURE_FAILED_HTTP_502,
  FIXTURE_COMPLETED,
  FIXTURE_COMPLETED_NO_CANDIDATES,
} from '../../bilateral-ai-job.fixtures';
import { BilateralAiUploadState } from '../../services/bilateral-ai.interfaces';

const NOW = new Date('2026-09-15T10:04:30.000Z').getTime();

interface MountPanelOptions {
  job?: ReturnType<typeof normalizeJob> | null;
  status: BilateralAiUploadState['status'];
  now?: number;
}

/** The component takes no providers/imports beyond `CommonModule` — purely input-driven. */
function mountPanel({ job = null, status, now = NOW }: MountPanelOptions) {
  return cy.mount(AiProcessingPanelComponent, {
    componentProperties: { job, status, expectation: null, now },
  });
}

function horizontalScrollExcess(): Cypress.Chainable<number> {
  return cy.document().then(doc => {
    const root = doc.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
}

function stepRects(): Cypress.Chainable<{ left: number; top: number }[]> {
  return cy.get('ol[aria-label="Processing stages"] > li').then($items =>
    Cypress._.map($items.toArray(), el => {
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), top: Math.round(r.top) };
    }),
  );
}

/**
 * Forces (or clears) the browser's real `prefers-reduced-motion` media feature via CDP —
 * see the file-header note on why a JS `matchMedia` stub cannot do this.
 */
function setPrefersReducedMotion(reduce: boolean): Cypress.Chainable<unknown> {
  return cy.wrap(
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }] },
    }),
    { log: false },
  );
}

interface ViewportCase {
  width: number;
  height: number;
  label: string;
  orientation: 'horizontal' | 'vertical';
}

/** `design.md` §6.3: vertical on `< 640 px`, horizontal `min-[640px]:` and up. */
const VIEWPORTS: ViewportCase[] = [
  { width: 1280, height: 800, label: '1280x800', orientation: 'horizontal' },
  { width: 900, height: 800, label: '900x800', orientation: 'horizontal' },
  { width: 375, height: 800, label: '375x800', orientation: 'vertical' },
];

describe('AiProcessingPanelComponent — CT layout gate (APF-T-9)', () => {
  it('stepper shares one row (6 distinct lefts, 1 top) at 1280/900 and stacks into one column (6 distinct tops) at 375, with no document horizontal scroll (APF-R-10, requirements.md §9 D7)', () => {
    mountPanel({ job: normalizeJob(FIXTURE_PROCESSING_EXTRACTING), status: 'processing' });
    cy.get('[data-testid="ai-panel-live"]', { timeout: 10000 }).should('exist');

    interface ViewportRecord {
      viewport: ViewportCase;
      rects: { left: number; top: number }[];
      scrollExcess: number;
    }
    const records: ViewportRecord[] = [];

    VIEWPORTS.forEach(viewport => {
      cy.viewport(viewport.width, viewport.height);
      stepRects().then(rects => {
        horizontalScrollExcess().then(scrollExcess => {
          records.push({ viewport, rects, scrollExcess });
        });
      });
    });

    // One combined report before any assertion — a failure at the first viewport still leaves the
    // full geometry table in the log (mirrors `bilateral-overview.cy.ts`'s pattern).
    cy.then(() => {
      expect(records, 'one record per viewport').to.have.length(VIEWPORTS.length);
      records.forEach(record => {
        cy.log(
          `${record.viewport.label} (${record.viewport.orientation}) → rects=${JSON.stringify(record.rects)}, ` +
            `scrollWidth-clientWidth=${record.scrollExcess}`,
        );
      });
    });

    cy.then(() => {
      for (const record of records) {
        expect(record.rects, `6 step boxes rendered at ${record.viewport.label}`).to.have.length(6);
        expect(record.scrollExcess, `documentElement.scrollWidth - clientWidth at ${record.viewport.label}`).to.be.at.most(0);

        const lefts = new Set(record.rects.map(r => r.left));
        const tops = new Set(record.rects.map(r => r.top));
        if (record.viewport.orientation === 'horizontal') {
          expect(lefts.size, `distinct left values (one row) at ${record.viewport.label}`).to.equal(6);
          expect(tops.size, `equal top values (one row) at ${record.viewport.label}`).to.equal(1);
        } else {
          expect(tops.size, `distinct top values (stacked column) at ${record.viewport.label}`).to.equal(6);
        }
      }
    });
  });

  it('terminal outcome blocks (still running / failed / no candidates) stay ≤160px tall at every viewport (design.md §6.3)', () => {
    interface OutcomeCase {
      status: BilateralAiUploadState['status'];
      testId: string;
      job: ReturnType<typeof normalizeJob>;
      label: string;
    }

    const OUTCOME_CASES: OutcomeCase[] = [
      { status: 'still_running', testId: 'ai-panel-still-running', job: normalizeJob(FIXTURE_COMPLETED), label: 'still running' },
      { status: 'failed', testId: 'ai-panel-failed', job: normalizeJob(FIXTURE_FAILED_HTTP_502), label: 'failed' },
      {
        status: 'completed_no_candidates',
        testId: 'ai-panel-no-candidates',
        job: normalizeJob(FIXTURE_COMPLETED_NO_CANDIDATES),
        label: 'no candidates',
      },
    ];

    interface HeightRecord {
      outcome: string;
      viewport: string;
      height: number;
    }
    const records: HeightRecord[] = [];

    OUTCOME_CASES.forEach(outcomeCase => {
      mountPanel({ job: outcomeCase.job, status: outcomeCase.status });
      cy.get(`[data-testid="${outcomeCase.testId}"]`, { timeout: 10000 }).should('exist');

      VIEWPORTS.forEach(viewport => {
        cy.viewport(viewport.width, viewport.height);
        cy.get(`[data-testid="${outcomeCase.testId}"]`).then($el => {
          records.push({
            outcome: outcomeCase.label,
            viewport: viewport.label,
            height: Math.round($el[0].getBoundingClientRect().height),
          });
        });
      });
    });

    cy.then(() => {
      expect(records, 'one record per outcome × viewport').to.have.length(OUTCOME_CASES.length * VIEWPORTS.length);
      records.forEach(record => cy.log(`${record.outcome} @ ${record.viewport} → height=${record.height}px`));
      for (const record of records) {
        expect(record.height, `${record.outcome} block height at ${record.viewport}`).to.be.at.most(160);
      }
    });
  });

  describe('reduced motion (requirements.md §9 D10)', () => {
    afterEach(() => {
      // Never leak the forced media feature into the rest of the CT run.
      setPrefersReducedMotion(false);
    });

    it('the active step dot carries no pulse animation under prefers-reduced-motion: reduce', () => {
      setPrefersReducedMotion(true);
      mountPanel({ job: normalizeJob(FIXTURE_PROCESSING_EXTRACTING), status: 'processing' });

      cy.get('ol[aria-label="Processing stages"] .animate-pulse', { timeout: 10000 }).should('exist');
      cy.window().then(win => {
        cy.get('ol[aria-label="Processing stages"] .animate-pulse').then($dot => {
          const computed = win.getComputedStyle($dot[0]);
          cy.log(`active step dot computed animation-name=${computed.animationName}`);
          expect(computed.animationName, 'active step dot animation-name under prefers-reduced-motion: reduce').to.equal('none');
        });
      });
    });
  });
});
