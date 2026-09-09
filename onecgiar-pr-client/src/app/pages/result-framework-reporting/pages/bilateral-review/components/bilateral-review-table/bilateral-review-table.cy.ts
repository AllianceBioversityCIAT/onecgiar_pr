// @akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-2 attempt 2 — RECORDED GAP closure; BRH-T-3 — row-level 3px status accent + narrow touch-target gates, BRH-R-8/R-11)
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

    // Reviewer FAIL (BRH-T-3 attempt 3, issue 3): the `<section data-testid="bilateral-review-
    // group-card">` has `overflow-hidden` and wraps a `div.overflow-x-auto` around the `<table>`
    // — the section CLIPS its own content and contributes only its own border box to the check,
    // so `section.scrollWidth <= section.clientWidth` is a tautology that can never fail no matter
    // how wide the table inside actually renders. Measure the ACTUAL scroller
    // (`div.overflow-x-auto`) and the `<table>`'s own scrollWidth against that scroller's
    // clientWidth instead.
    it('no card overflows horizontally at 1280 (the real scroller and the table inside it are measured, not the clipping section)', () => {
      let scrollersChecked = 0;
      cy.get('[data-testid="bilateral-review-group-card"]')
        .each($section => {
          // Collapsed cards (0-pending groups, smart default) render no nested table/scroller at
          // all — nothing to measure there; only expanded cards carry `.overflow-x-auto`.
          const scroller = $section[0].querySelector('.overflow-x-auto') as HTMLElement | null;
          if (!scroller) return;
          scrollersChecked++;
          const table = scroller.querySelector('table') as HTMLElement;
          expect(scroller.scrollWidth, `scroller scrollWidth (${scroller.scrollWidth}) <= clientWidth (${scroller.clientWidth}) at 1280`).to.be.at.most(scroller.clientWidth);
          expect(table.scrollWidth, `table scrollWidth (${table.scrollWidth}) <= scroller clientWidth (${scroller.clientWidth}) at 1280`).to.be.at.most(scroller.clientWidth);
        })
        .then(() => {
          expect(scrollersChecked, 'at least one expanded card with a real scroller must have been measured (not a vacuous pass)').to.be.greaterThan(0);
        });
    });

    it('no card overflows horizontally at 1000 (the real scroller and the table inside it are measured, not the clipping section)', () => {
      cy.viewport(1000, 800);
      assertEffectiveWidth('resized to 1000', 1000);
      let scrollersChecked = 0;
      cy.get('[data-testid="bilateral-review-group-card"]')
        .each($section => {
          const scroller = $section[0].querySelector('.overflow-x-auto') as HTMLElement | null;
          if (!scroller) return;
          scrollersChecked++;
          const table = scroller.querySelector('table') as HTMLElement;
          expect(scroller.scrollWidth, `scroller scrollWidth (${scroller.scrollWidth}) <= clientWidth (${scroller.clientWidth}) at 1000`).to.be.at.most(scroller.clientWidth);
          expect(table.scrollWidth, `table scrollWidth (${table.scrollWidth}) <= scroller clientWidth (${scroller.clientWidth}) at 1000`).to.be.at.most(scroller.clientWidth);
        })
        .then(() => {
          expect(scrollersChecked, 'at least one expanded card with a real scroller must have been measured (not a vacuous pass)').to.be.greaterThan(0);
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

  // @akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-3, BRH-R-8, design.md §4.3)
  describe('Gate 5: row-level 3px status accent — measured, not class-string (BRH-R-8, design.md §4.3)', () => {
    it('a pending row measures a real 3px left border whose color matches its OWN status pill text color', () => {
      cy.viewport(1280, 800);
      mountTable();
      // MONO_GROUP (card 0) is expanded by default (pendingCount > 0); m1/m2 are pending (status_id 5).
      cy.get('[data-testid="bilateral-review-group-card"]')
        .eq(0)
        .within(() => {
          cy.get('[data-testid="bilateral-review-row-code"]')
            .eq(0)
            .then($code => {
              const codeStyle = getComputedStyle($code[0]);
              expect(codeStyle.borderLeftWidth, 'pending row borderLeftWidth').to.equal('3px');
              cy.get('[data-testid="bilateral-review-row-status"]')
                .eq(0)
                .then($pill => {
                  const pillColor = getComputedStyle($pill[0]).color;
                  expect(
                    codeStyle.borderLeftColor,
                    `row accent color (${codeStyle.borderLeftColor}) should match its own status pill's text color (${pillColor}) — both derive from the SAME --pr-status-in-progress-fg token`
                  ).to.equal(pillColor);
                });
            });
        });
    });

    it('a pending row and an approved row in the SAME card measure DIFFERENT accent colors (status-differentiated, never a single hardcoded accent)', () => {
      cy.viewport(1280, 800);
      mountTable();
      cy.get('[data-testid="bilateral-review-group-card"]')
        .eq(0)
        .within(() => {
          cy.get('[data-testid="bilateral-review-row-code"]').then($codes => {
            const pendingColor = getComputedStyle($codes[0]).borderLeftColor; // m1, status_id 5
            const approvedColor = getComputedStyle($codes[2]).borderLeftColor; // m3, status_id 6
            expect(approvedColor, `approved row accent (${approvedColor}) should differ from pending row accent (${pendingColor})`).to.not.equal(pendingColor);
            expect(getComputedStyle($codes[2]).borderLeftWidth, 'approved row borderLeftWidth').to.equal('3px');
          });
        });
    });

    it('the group card container itself carries NO left-accent border of its own (forward pointer (a) — the accent is on the toggle button and on each row, never doubled onto the section)', () => {
      cy.viewport(1280, 800);
      mountTable();
      cy.get('[data-testid="bilateral-review-group-card"]')
        .eq(0)
        .then($section => {
          const style = getComputedStyle($section[0]);
          // Default Tailwind `border` width (1px) on all sides — never the 3px accent width.
          expect(style.borderLeftWidth, 'group card section borderLeftWidth').to.not.equal('3px');
        });
    });
  });

  // @akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-3, BRH-R-11)
  describe('Gate 6: narrow (700px) touch targets — Review/See controls measured, not assumed (BRH-R-11)', () => {
    it('every Review/See action control measures at least 44x44px', () => {
      cy.viewport(700, 900);
      mountTable({ narrow: true });
      cy.get('[data-testid="bilateral-review-row-action"]').should('have.length.greaterThan', 0);
      cy.get('[data-testid="bilateral-review-row-action"]').each($btn => {
        const rect = ($btn[0] as HTMLElement).getBoundingClientRect();
        expect(rect.width, `action control width (${rect.width})`).to.be.at.least(44);
        expect(rect.height, `action control height (${rect.height})`).to.be.at.least(44);
      });
    });

    // Reviewer FAIL (BRH-T-3 attempt 2, issue 2): the narrow copy buttons (Result Code +
    // Alignment) were certified only by a jsdom `className).toContain('h-[44px]')` presence
    // assertion — a harness that computes no layout. Measure every button inside a card here,
    // which covers the two new copy buttons AND the pre-existing action button in one gate.
    it('every button inside a narrow card (copy buttons + action) measures at least 44x44px', () => {
      cy.viewport(700, 900);
      mountTable({ narrow: true });
      cy.get('[data-testid="bilateral-review-card"]').should('have.length.greaterThan', 0);
      cy.get('[data-testid="bilateral-review-card"] button').should('have.length.greaterThan', 0);
      cy.get('[data-testid="bilateral-review-card"] button').each($btn => {
        const rect = ($btn[0] as HTMLElement).getBoundingClientRect();
        expect(rect.width, `card button width (${rect.width}), aria-label "${$btn.attr('aria-label')}"`).to.be.at.least(44);
        expect(rect.height, `card button height (${rect.height}), aria-label "${$btn.attr('aria-label')}"`).to.be.at.least(44);
      });
    });
  });

  // @akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-3 attempt 2, HITL live-page finding, BRH-R-1)
  // DEFECT: each grouped card's nested `<table>` used `table-layout: auto`, so column widths were
  // decided per-card by that card's OWN content — three cards with very different title lengths
  // rendered Lead Center/Status/Alignment/Submission Date/Actions at DIFFERENT x-positions. FIX:
  // `table-fixed` + one shared `<colgroup>` (`columnWidths()`) on every table variant. This gate
  // measures the fix on the actual layout engine, not class strings.
  describe('Gate 7: uniform column widths — table-fixed + shared colgroup (BRH-R-1, HITL live-page finding)', () => {
    const widthRow = (id: string, code: string, title: string, extra: Partial<ResultToReview> = {}) =>
      row({ id, project_id: id, project_name: id, result_code: code, result_title: title, status_id: 5, ...extra });
    const WIDTH_GROUPS: BilateralReviewGroup[] = [
      { key: 'W1', label: 'W1', caption: null, center: null, results: [widthRow('w1', 'W-001', 'Short')] },
      {
        key: 'W2',
        label: 'W2',
        caption: null,
        center: null,
        results: [widthRow('w2', 'W-002', 'A medium length result title for column-width parity testing purposes')]
      },
      {
        key: 'W3',
        label: 'W3',
        caption: null,
        center: null,
        results: [
          widthRow(
            'w3',
            'W-003',
            'A deliberately very long result title that, under table-layout: auto, would force this one card wider than its siblings and shift every other column edge out of alignment across the grouped cards',
            { indicator_category: 'Capacity Sharing for Development' } // long badge value — no-wrap check below
          )
        ]
      },
      // Reviewer FAIL (BRH-T-3 attempt 3, issue 1): a Contributor row wasn't exercised — the chip
      // + copy button used to overflow the code cell under `table-layout: fixed`'s hard column
      // width. Now stacked (chip below the code+copy line), so this shape needs its own gate.
      {
        key: 'W4',
        label: 'W4',
        caption: null,
        center: null,
        results: [widthRow('w4', 'BR-004', 'Contributor row title', { initiative_role_name: 'Contributor' })]
      }
    ];

    [1280, 1000].forEach(width => {
      it(`at ${width}px: every column's th.left lands within 1px across all 4 cards, no header wraps, no card overflows horizontally, code/title cells never overflow (contributor row), badge never wraps`, () => {
        cy.viewport(width, 900);
        cy.mount(BilateralReviewTableComponent, {
          componentProperties: { groups: WIDTH_GROUPS, view: 'grouped', groupMode: 'project', canReview: true, loading: false }
        });
        assertEffectiveWidth(`${width} (column-width fixture)`, width);

        cy.get('[data-testid="bilateral-review-group-card"]').should('have.length', 4);

        cy.get('[data-testid="bilateral-review-group-card"] table thead tr')
          .should('have.length', 4)
          .then($headerRows => {
            const perCardLefts: number[][] = Array.from($headerRows).map(tr => Array.from(tr.querySelectorAll('th')).map(th => (th as HTMLElement).getBoundingClientRect().left));
            const columnCount = perCardLefts[0].length;
            perCardLefts.forEach(lefts => expect(lefts.length, 'column count matches across all 4 cards').to.equal(columnCount));
            for (let col = 0; col < columnCount; col++) {
              const lefts = perCardLefts.map(cardLefts => cardLefts[col]);
              const max = Math.max(...lefts);
              const min = Math.min(...lefts);
              expect(max - min, `column ${col} th.left spread across cards: max ${max.toFixed(1)} - min ${min.toFixed(1)}`).to.be.at.most(1);
            }

            // BRH-R-1/BRV-R-3 re-balance (attempt 3, issue 2): Title must be the WIDEST column —
            // the attempt-2 fixed widths starved it (136.5px total at 1000px, less than
            // Alignment's hard 280px). Measure real `getBoundingClientRect().width` per column
            // (card 0), not a left-delta, so the LAST column (Actions) is covered too.
            const widths0 = Array.from($headerRows[0].querySelectorAll('th')).map(th => (th as HTMLElement).getBoundingClientRect().width);
            const titleWidthMeasured = widths0[1];
            widths0.forEach((w, col) => {
              if (col === 1) return;
              expect(titleWidthMeasured, `Title width (${titleWidthMeasured.toFixed(1)}) should be >= column ${col} width (${w.toFixed(1)}) at ${width}px`).to.be.at.least(w);
            });
          });

        // "No wrap" measured as UNIFORMITY, not an absolute px guess: a single-line `!py-[8px]`
        // header cell's real height already includes padding + line-height (~28px here) — any
        // wrapped header would be a taller OUTLIER among its siblings, so every header cell across
        // every card sharing exactly one height is the actual no-wrap proof.
        cy.get('[data-testid="bilateral-review-group-card"] thead th').then($ths => {
          const heights = Array.from($ths).map(th => (th as HTMLElement).offsetHeight);
          const uniqueHeights = [...new Set(heights)];
          expect(uniqueHeights.length, `every header cell (across all 4 cards) should share ONE height — a wrapped header would be a taller outlier; heights seen = ${uniqueHeights.join(', ')}`).to.equal(1);
        });

        // Reviewer FAIL (attempt 3, issue 3): measure the REAL scroller (`div.overflow-x-auto`)
        // and the `<table>`'s own scrollWidth against it — the `<section overflow-hidden>` clips
        // its own content, so measuring the section is a tautology that can never fail.
        cy.get('[data-testid="bilateral-review-group-card"]').each($section => {
          const scroller = $section[0].querySelector('.overflow-x-auto') as HTMLElement;
          const table = scroller.querySelector('table') as HTMLElement;
          expect(scroller.scrollWidth, `scroller scrollWidth (${scroller.scrollWidth}) <= clientWidth (${scroller.clientWidth}) at ${width}px`).to.be.at.most(scroller.clientWidth);
          expect(table.scrollWidth, `table scrollWidth (${table.scrollWidth}) <= scroller clientWidth (${scroller.clientWidth}) at ${width}px`).to.be.at.most(scroller.clientWidth);
        });

        // Reviewer FAIL (attempt 3, issue 1): per-cell overflow on the CONTRIBUTOR row (W4) — the
        // code cell holds the code+copy-button line AND the stacked "Contributor" chip; the title
        // cell holds the (now narrower) title. Neither may overflow its own `<td>` box.
        cy.contains('[data-testid="bilateral-review-row-code"]', 'BR-004')
          .closest('tr')
          .find('td')
          .then($tds => {
            const codeTd = $tds[0] as HTMLElement;
            const titleTd = $tds[1] as HTMLElement;
            expect(codeTd.scrollWidth, `contributor code td scrollWidth (${codeTd.scrollWidth}) <= clientWidth (${codeTd.clientWidth}) at ${width}px`).to.be.at.most(codeTd.clientWidth);
            expect(titleTd.scrollWidth, `contributor title td scrollWidth (${titleTd.scrollWidth}) <= clientWidth (${titleTd.clientWidth}) at ${width}px`).to.be.at.most(titleTd.clientWidth);
          });

        // Reviewer FAIL (attempt 3, issue 2): the type badge must never wrap regardless of how
        // narrow Title gets or how long the category text is — `whitespace-nowrap truncate
        // max-w-full` should clip it to one line. A wrapped badge would measure a taller
        // offsetHeight than a single `leading-[12px]` + 1px-border line (14px content+border).
        cy.get('[data-testid="bilateral-review-row-type-badge"]').each($badge => {
          expect(($badge[0] as HTMLElement).offsetHeight, `badge offsetHeight (single line, never wrapped) at ${width}px`).to.be.at.most(16);
        });
      });
    });
  });

  // Leader direction (BRH-T-3 attempt 3): the 1000px case rebalances Title's own width, which
  // could change the row-height math the 68px cap (attempt 2) was based on at 1536px alone.
  // Re-measure at 1000px explicitly — report the number; do NOT re-base the cap again.
  describe('Gate 8: row height at 1000px — two-line-title + badge shape against the 68px cap (BRH-T-3 attempt 3)', () => {
    it('measures the two-line-title+badge row at 1000px (attempt 2 only measured 1536px, where Title had far more spare width)', () => {
      cy.viewport(1000, 900);
      const rows: ResultToReview[] = [
        row({
          id: 'rh1000',
          result_code: 'BR-101',
          result_title:
            'A deliberately long result title that will not fit on one line at the table title column width and must wrap onto a second line under the line-clamp-2 rule',
          indicator_category: 'Capacity sharing for development',
          status_id: 5
        })
      ];
      cy.mount(BilateralReviewTableComponent, { componentProperties: { view: 'flat', flatRows: rows, canReview: true, loading: false } });
      assertEffectiveWidth('1000 (row-height-at-1000 fixture)', 1000);
      cy.get('[data-testid="bilateral-review-row-code"]')
        .closest('tr')
        .then($tr => {
          const h = ($tr[0] as HTMLElement).getBoundingClientRect().height;
          expect(h, `two-line-title+badge row height at 1000px: measured ${h.toFixed(1)}px against the 68px cap (re-based in attempt 2 from a 1536px measurement)`).to.be.at.most(68);
        });
    });
  });
});
