// @akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-2 attempt 2 — RECORDED GAP closure)
//
// Cypress Component Test — mounts the REAL `BilateralReviewTableComponent` directly (no page, no
// stubs, no HTTP) and measures LAYOUT that jsdom (Jest) cannot produce: border-radius, box-shadow,
// computed overflow, real pixel heights, chip containment inside the card, and scrollWidth vs
// clientWidth. Jest already proves the CLASS STRINGS and the collapse/filter ARITHMETIC — this
// suite exists solely to close the "class-string presence is not layout" gap the Leader flagged
// after the live authenticated-page check came back blocked (no PRMS session in a reachable
// browser).
//
// `BilateralReviewTableComponent` is standalone with ZERO injected services (`groups`, `view`,
// `narrow`, `groupMode`, `expandAllNonce`, `allExpanded`, `canReview`, `loading`, `actionsDisabled`
// are all plain `input()`s; `openResult` is an `output()`) — so it mounts directly via
// `cy.mount(BilateralReviewTableComponent, { componentProperties: {...} })` with no providers, no
// TestBed overrides, and none of `bilateral-review.cy.ts`'s stub components. `@cypress/angular`'s
// `mount()` converts a plain value assigned to an `input()`-backed property into a `signal(value)`
// for us (`convertPropertyToSignalIfApplicable`, `node_modules/cypress/angular/dist/index.js`), so
// passing raw arrays/booleans/strings in `componentProperties` — never a hand-built `signal(...)` —
// is the correct, supported shape here.
//
// Per the task brief: do NOT "fix" the primeicons webpack noise or the `ct-utils.ts` `TS2322` —
// both are known non-blocking (this spec does not even import `ct-utils.ts`, so the TS2322 does
// not apply to it, but neither is touched regardless).
import { BilateralReviewTableComponent, BilateralReviewGroup } from './bilateral-review-table.component';
import { ResultToReview } from '../result-review-drawer/result-review-drawer.interfaces';

function row(partial: Partial<ResultToReview> & { id: string }): ResultToReview {
  return {
    project_id: 'p1',
    project_name: 'P1',
    result_code: 'BR-000',
    result_title: 'Untitled result',
    indicator_category: 'Policy',
    status_name: 'Pending Review',
    status_id: 5,
    acronym: '',
    toc_title: 'ToC',
    indicator: 'Indicator',
    submission_date: '2026-01-01',
    lead_center: 'CIP',
    ...partial
  } as ResultToReview;
}

// Group 1 (BRH-T-2 follow-up fixture spec): 6 CIMMYT + 1 IRRI + 1 CIP = 8 results, pendingCount > 0
// — exercises the in-card quick-filter toolbar (multi-center) AND the wide/narrow center chips.
// Label carries the `T-PJ-003262` prefix the follow-up's mono-badge gate measures.
const MONO_CENTERS = ['CIMMYT', 'CIMMYT', 'CIMMYT', 'CIMMYT', 'CIMMYT', 'CIMMYT', 'IRRI', 'CIP'];
const MONO_GROUP_LABEL = 'T-PJ-003262-An innovative approach to agribusiness';
const MONO_GROUP: BilateralReviewGroup = {
  key: MONO_GROUP_LABEL,
  label: MONO_GROUP_LABEL,
  caption: null,
  center: null,
  results: MONO_CENTERS.map((center, i) =>
    row({
      id: `m${i + 1}`,
      project_id: 'p1',
      project_name: MONO_GROUP_LABEL,
      result_code: `BR-1${i + 1}`,
      result_title: `Mono fixture result ${i + 1}`,
      lead_center: center,
      status_id: i < 2 ? 5 : 6 // 2 pending, 6 approved — pendingCount > 0
    })
  )
};

// Group 2: 0 pending — cold-mount smart-collapse gate.
const ZERO_GROUP_LABEL = 'P2-000000-Zero Pending Project';
const ZERO_GROUP: BilateralReviewGroup = {
  key: ZERO_GROUP_LABEL,
  label: ZERO_GROUP_LABEL,
  caption: null,
  center: null,
  results: [
    row({ id: 'z1', project_id: 'p2', project_name: ZERO_GROUP_LABEL, result_code: 'BR-201', lead_center: 'CIAT', status_id: 6 }),
    row({ id: 'z2', project_id: 'p2', project_name: ZERO_GROUP_LABEL, result_code: 'BR-202', lead_center: 'IITA', status_id: 7 })
  ]
};

// Group 3: 5 distinct centers — narrow-header "+N" overflow-cap gate (cap is 3 + one "+2" chip).
const MANY_CENTERS = ['CIMMYT', 'IRRI', 'CIP', 'CIAT', 'IITA'];
const MANY_CENTERS_GROUP_LABEL = 'P3-300000-Many Centers Project';
const MANY_CENTERS_GROUP: BilateralReviewGroup = {
  key: MANY_CENTERS_GROUP_LABEL,
  label: MANY_CENTERS_GROUP_LABEL,
  caption: null,
  center: null,
  results: MANY_CENTERS.map((center, i) =>
    row({
      id: `n${i + 1}`,
      project_id: 'p3',
      project_name: MANY_CENTERS_GROUP_LABEL,
      result_code: `BR-3${i + 1}`,
      result_title: `Many-centers fixture result ${i + 1}`,
      lead_center: center,
      status_id: i === 0 ? 5 : 6
    })
  )
};

const GROUPS = [MONO_GROUP, ZERO_GROUP, MANY_CENTERS_GROUP];

function mountTable(overrides: Record<string, unknown> = {}) {
  return cy.mount(BilateralReviewTableComponent, {
    componentProperties: {
      groups: GROUPS,
      view: 'grouped',
      groupMode: 'project',
      canReview: true,
      loading: false,
      ...overrides
    }
  });
}

/** AC-14-style disqualifier guard (same discipline as `bilateral-review.cy.ts`): measure and LOG
 *  the effective CSS width instead of assuming the requested `cy.viewport(...)` landed exactly —
 *  a root `zoom` (design.md DD-11's `--pr-font-scale`) could in principle skew it. */
function assertEffectiveWidth(label: string, expected: number): void {
  cy.document().should(doc => {
    const measured = doc.documentElement.clientWidth;
    expect(measured, `${label}: requested ${expected} -> measured documentElement.clientWidth ${measured}`).to.be.closeTo(expected, 4);
  });
}

describe('BilateralReviewTableComponent — real layout (BRH-T-2 RECORDED GAP closure)', () => {
  describe('Wide (1280x800) — Gate 1: card geometry, header height, chip containment, no h-scroll', () => {
    beforeEach(() => {
      cy.viewport(1280, 800);
      mountTable();
      assertEffectiveWidth('wide mount', 1280);
    });

    it('every grouped card is a 12px-radius, elevated, clipped container (rounded-[12px] / shadow-xs / overflow-hidden measured, not asserted from class strings)', () => {
      cy.get('[data-testid="bilateral-review-group-card"]').should('have.length', 3);
      cy.get('[data-testid="bilateral-review-group-card"]').each($section => {
        const el = $section[0];
        const style = getComputedStyle(el);
        expect(style.borderRadius, 'border-radius').to.equal('12px');
        expect(style.boxShadow, 'box-shadow').to.not.equal('none');
        expect(style.overflow, 'overflow').to.equal('hidden');
      });
    });

    it('the header toggle is exactly 52px tall (offsetHeight)', () => {
      cy.get('[data-testid="bilateral-review-group-toggle"]').each($btn => {
        expect(($btn[0] as HTMLElement).offsetHeight, 'header toggle offsetHeight').to.equal(52);
      });
    });

    it('every contributing-center chip stays inside its own card (right edge never exceeds the card right edge)', () => {
      cy.get('[data-testid="bilateral-review-group-card"]').each($section => {
        const sectionRect = ($section[0] as HTMLElement).getBoundingClientRect();
        cy.wrap($section)
          .find('[data-testid="bilateral-review-center-chip"]')
          .each($chip => {
            const chipRect = ($chip[0] as HTMLElement).getBoundingClientRect();
            expect(chipRect.right, `chip right (${chipRect.right}) <= card right (${sectionRect.right})`).to.be.at.most(sectionRect.right + 0.5);
          });
      });
    });

    it('no card overflows horizontally at 1280 (scrollWidth <= clientWidth)', () => {
      cy.get('[data-testid="bilateral-review-group-card"]').each($section => {
        const el = $section[0] as HTMLElement;
        expect(el.scrollWidth, `scrollWidth (${el.scrollWidth}) <= clientWidth (${el.clientWidth}) at 1280`).to.be.at.most(el.clientWidth);
      });
    });

    it('no card overflows horizontally at 1000 (scrollWidth <= clientWidth, same mount, resized viewport)', () => {
      cy.viewport(1000, 800);
      assertEffectiveWidth('resized to 1000', 1000);
      cy.get('[data-testid="bilateral-review-group-card"]').each($section => {
        const el = $section[0] as HTMLElement;
        expect(el.scrollWidth, `scrollWidth (${el.scrollWidth}) <= clientWidth (${el.clientWidth}) at 1000`).to.be.at.most(el.clientWidth);
      });
    });
  });

  describe('Gate 2: smart progressive disclosure on cold mount (BRH-R-4)', () => {
    it('the pending group (Group 1, MONO) is expanded and the zero-pending group (Group 2) is collapsed', () => {
      cy.viewport(1280, 800);
      mountTable();
      cy.get('[data-testid="bilateral-review-group-toggle"]').eq(0).should('have.attr', 'aria-expanded', 'true');
      cy.get('[data-testid="bilateral-review-group-toggle"]').eq(1).should('have.attr', 'aria-expanded', 'false');
      // Group 3 (MANY_CENTERS) also has a pending row — expanded too.
      cy.get('[data-testid="bilateral-review-group-toggle"]').eq(2).should('have.attr', 'aria-expanded', 'true');
    });
  });

  describe('Narrow (700x900) — Gate 3: narrow header height, chip cap + overflow, containment, no h-scroll', () => {
    beforeEach(() => {
      cy.viewport(700, 900);
      mountTable({ narrow: true });
    });

    it('measures the effective CSS width and matchMedia(min-width:900px) — logs the reality, does not assume it', () => {
      cy.window().then(win => {
        const measuredWidth = win.document.documentElement.clientWidth;
        const isAtLeast900 = win.matchMedia('(min-width: 900px)').matches;
        cy.log(`measured documentElement.clientWidth=${measuredWidth}, matchMedia(min-width:900px).matches=${isAtLeast900}`);
        // Disqualifier guard only — `narrow` is fed to this component as an explicit INPUT (there
        // is no internal matchMedia in `BilateralReviewTableComponent`; the real page's `isNarrow`
        // drives it), so the narrow branch below is reached regardless of this measurement. This
        // assertion exists to catch an environment surprise (e.g. an unexpected root zoom) that
        // would make the "at 700px CSS width" framing of the rest of this describe block false.
        expect(isAtLeast900, 'expected the requested 700px viewport to measure below the 900px breakpoint').to.equal(false);
      });
    });

    it('the narrow toggle is at least 44px tall (offsetHeight >= 44)', () => {
      cy.get('[data-testid="bilateral-review-group-toggle"]').each($btn => {
        expect(($btn[0] as HTMLElement).offsetHeight, 'narrow toggle offsetHeight').to.be.at.least(44);
      });
    });

    it('the narrow header renders a chips row (Reviewer FAIL #2 — center info must not disappear below 900px)', () => {
      cy.get('[data-testid="bilateral-review-group-card"]').eq(0).find('[data-testid="bilateral-review-center-chip"]').should('have.length.greaterThan', 0);
    });

    it('the 5-center group caps at 3 chips plus one "+2" overflow chip (never a bare comma-separated run, never unbounded)', () => {
      const manyCentersCard = () => cy.get('[data-testid="bilateral-review-group-card"]').eq(2);
      manyCentersCard().find('[data-testid="bilateral-review-center-chip"]').should('have.length', 3);
      manyCentersCard().should('contain.text', '+2');
    });

    it('every chip stays inside its own card on the narrow header too', () => {
      cy.get('[data-testid="bilateral-review-group-card"]').each($section => {
        const sectionRect = ($section[0] as HTMLElement).getBoundingClientRect();
        cy.wrap($section)
          .find('[data-testid="bilateral-review-center-chip"]')
          .each($chip => {
            const chipRect = ($chip[0] as HTMLElement).getBoundingClientRect();
            expect(chipRect.right, `narrow chip right (${chipRect.right}) <= card right (${sectionRect.right})`).to.be.at.most(sectionRect.right + 0.5);
          });
      });
    });

    it('no narrow card overflows horizontally (scrollWidth <= clientWidth)', () => {
      cy.get('[data-testid="bilateral-review-group-card"]').each($section => {
        const el = $section[0] as HTMLElement;
        expect(el.scrollWidth, `narrow scrollWidth (${el.scrollWidth}) <= clientWidth (${el.clientWidth})`).to.be.at.most(el.clientWidth);
      });
    });
  });

  describe('Gate 4: monospace project-code badge (BRH-R-2, BRH-DD-3)', () => {
    it('the element rendering "T-PJ-003262" is font-mono and font-weight >= 700 (measured, not class-string)', () => {
      cy.viewport(1280, 800);
      mountTable();
      cy.contains('[data-testid="bilateral-review-project-code"]', 'T-PJ-003262').then($el => {
        const style = getComputedStyle($el[0]);
        expect(style.fontFamily.toLowerCase(), `font-family "${style.fontFamily}" should contain "mono"`).to.include('mono');
        expect(Number(style.fontWeight), `font-weight "${style.fontWeight}" should be >= 700`).to.be.at.least(700);
      });
    });
  });
});
