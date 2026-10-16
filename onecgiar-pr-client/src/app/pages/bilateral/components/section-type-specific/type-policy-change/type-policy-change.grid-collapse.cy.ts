import { mountCF } from 'cypress/support/ct-utils';

/**
 * `FCT-T-1` (field-card-save-pill-truncation) — Cypress CT regression for the Policy Change grid's
 * `minmax()` floor (`type-policy-change.component.html:47`).
 *
 * Root cause (`requirements.md` §2, `design.md` P-1/P-2/P-3): `PCP-T-1` grouped Policy type / USD
 * amount / Status into one shared CSS grid row floored at `minmax(190px,1fr)`. `app-field-card`'s
 * own `@container` rules (`field-card.scss:368-392`) hide `.fch_save`'s trailing text below 380px
 * and collapse `.fch_required` to icon-only below 240px — a deliberate last-resort fallback for
 * genuinely narrow fields elsewhere, but `190px` floors EVERY column in this row below the first
 * threshold, making the fallback this row's everyday state.
 *
 * REWORK HISTORY (see `execution.md` for the full record):
 * - Attempt 1 (checkpoint): measured that NO `minmax()` value clears 380px while fitting 3 columns
 *   below ~1180px of content width.
 * - Attempt 2 (Reviewer FAIL): locked `minmax(360px,1fr)` from only 2 sampled widths (900px,
 *   1100px). The Reviewer found two squeeze zones the sampling missed — ~760px (2-column tight fit
 *   under `F=360`) and ~1120-1180px (3-column tight fit under `F=360`) — where a column still
 *   shrank to exactly the floor, below 380px. The Reviewer ALSO found the test itself invalid: both
 *   grid-class strings were hand-copied literals, so a revert of the production template would not
 *   have been caught, and the narrow-width fallback (`FCT-AC-2`) had no coverage at all.
 * - Attempt 3 (Reviewer FAIL): the robust fix needs no width sampling — CSS Grid's
 *   `auto-fit`/`minmax(F,1fr)` guarantees every rendered column is `≥ F`, so any `F > 380px` is
 *   collapse-free at EVERY content width (`design.md` P-6). Locked value: `minmax(390px,1fr)`. This
 *   rewrite fixed the first 2 Reviewer issues from attempt 2:
 *   1. The "fix" cases below source the grid class LIVE from the real `.html` file via
 *      `cy.readFile()` + a regex extraction (`productionGridClass()`), not a hand-copied literal —
 *      a revert of `type-policy-change.component.html:47` back to `190px` makes every one of them
 *      fail (the extracted class would carry `190px`, which collapses at every tested width). Only
 *      the clearly-labeled historical baseline below still hard-codes `190px`, deliberately, since
 *      the production template no longer contains that literal for Tailwind to generate from.
 *   2. The fix-side widths are retargeted to the ones that actually broke `360px` (~760px, ~1150px)
 *      plus a wide width (≥1210px) and a narrow width (<800px) — not arbitrary round numbers.
 *   3. A narrow-width case (600px) now asserts the single-column fallback (`FCT-AC-2`/`FCT-R-2`).
 *   But attempt 3's bare `minmax(390px,1fr)` FAILed on a NEW issue: a single-column track can't
 *   shrink below its own fixed minimum, so content narrower than 390px (e.g. phone widths) overflows
 *   horizontally instead of degrading — a real regression of the old `190px` floor's phone-width
 *   behavior.
 * - Attempt 4 (this file): final value `minmax(min(390px,100%),1fr)` — the `min(...,100%)` guard
 *   shrinks the floor to the container's own width once narrower than 390px, so sub-390px content
 *   legitimately falls through to `app-field-card`'s own 380px/240px collapse rules (its intended
 *   last-resort behavior) instead of overflowing. `GRID_CLASS_PATTERN` is widened to capture the
 *   whole `class="..."` attribute value rather than trying to balance the now-nested `min(...)`
 *   parens — this is the only `class="grid` occurrence in the file (confirmed by grep), so matching
 *   up to the closing quote is unambiguous and immune to further nesting. A new sub-390px case
 *   (300px) asserts NO horizontal overflow — the falsifier attempt 3 failed.
 *
 * Column-count arithmetic at `F=390`, `gap=20` (N = floor((W+gap)/(F+gap)), design.md §6.2/P-6):
 *   W=760  → N=1 (below the 800px 2-column threshold — `auto-fit` falls back to a single column,
 *            which is why this width is "formerly a 2-column squeeze under F=360" but is simply
 *            the narrow case under F=390: still the falsifier that matters, since it is the exact
 *            width that used to collapse).
 *   W=1150 → N=2, column width (1150-20)/2 = 565px (Policy type + USD amount row 1, Status row 2).
 *   W=1220 → N=3, column width (1220-40)/3 ≈ 393.3px — just above the 390px floor, the genuine
 *            tight-fit case that proves the margin over 380px holds even at its tightest packing.
 *            NOTE (Advisory fix, attempt 4): this width still PASSES under a bare `190px` revert too
 *            (3 columns of ~393px fit either way) — it is not, by itself, falsifying proof against
 *            `190px`; the collapse-side baseline above already documents that width independently.
 *   W=600  → N=1 (single column, `FCT-AC-2`).
 *   W=300  → N=1, below the 390px floor itself — the grid's own content box must shrink to fit
 *            (`min(390px,100%)` resolves to 100% here), not overflow (`FCT-R-2`, the new falsifier).
 */

const POLICY_TYPES = [{ id: 1, name: 'National policy' }];
const STATUS_OPTIONS = [{ id: 1, name: 'Approved' }];

const PRODUCTION_TEMPLATE_PATH = 'src/app/pages/bilateral/components/section-type-specific/type-policy-change/type-policy-change.component.html';

/** Matches the EXACT grid `class` attribute this spec's harness must mirror — the group that wraps
 *  Policy type / USD amount / Status (`type-policy-change.component.html:55`). Captures the class
 *  string only (not the surrounding `class="..."` quotes).
 *
 *  Attempt 4: widened from a paren-balancing pattern (`minmax\([^)]+\)\)\]`) to matching everything
 *  up to the closing `"` of the `class="..."` attribute instead. The paren-balancing form broke the
 *  moment `min(390px,100%)` nested an extra pair of parens before `minmax`'s own closing paren — the
 *  literal string is `grid grid-cols-[repeat(auto-fit,minmax(min(390px,100%),1fr))] gap-[20px]`,
 *  which has 3 opens (`repeat(`, `minmax(`, `min(`) before the first close. Rather than hand-balance
 *  parens again on the next CSS trick, this matches `class="(grid[^"]*)"` — safe because this is the
 *  ONLY `class="grid` occurrence in the file (confirmed: `grep -n 'class="grid'` returns one hit),
 *  so there is no ambiguity about which attribute is captured. Verified with a Node one-liner against
 *  the real file, the bare-`390px` revert, and the `190px` revert — all three extract correctly. */
const GRID_CLASS_PATTERN = /class="(grid[^"]*)"/;

/** Reads the REAL production template off disk and extracts its current grid class string. Called
 *  fresh inside each fix-side test (not cached), so a template edit is picked up immediately and a
 *  revert back to `minmax(190px,1fr)` makes every caller below fail on the collapse assertions. */
function productionGridClass(): Cypress.Chainable<string> {
  return cy.readFile(PRODUCTION_TEMPLATE_PATH).then(html => {
    const match = GRID_CLASS_PATTERN.exec(html as unknown as string);
    expect(match, 'production grid class string found in type-policy-change.component.html:47').to.not.equal(null);
    return match![1];
  });
}

/** Structurally byte-for-byte the production grid's three siblings (`type-policy-change.component.html:48-78`),
 *  minus the `@if (body.policy_type_id == 1)` gate (both fields are unconditionally present here) and
 *  plus `data-testid` hooks this harness needs to address each field independently. `gridClass` is
 *  always supplied by the caller — either sourced live from disk (fix-side tests) or a clearly-labeled
 *  historical literal (baseline test only). */
function gridTemplate(gridClass: string): string {
  return `
    <div class="${gridClass} w-full" data-testid="policy-grid">
      <app-pr-select
        [options]="policyTypes"
        label="Policy type"
        optionLabel="name"
        optionValue="id"
        placeholder="Select policy type"
        [required]="true"
        data-testid="field-policy-type">
      </app-pr-select>
      <app-pr-input
        label="USD amount"
        type="currency"
        placeholder="0"
        [required]="false"
        data-testid="field-usd-amount">
      </app-pr-input>
      <app-pr-select
        [options]="statusOptions"
        label="Status"
        optionLabel="name"
        optionValue="id"
        placeholder="Select status"
        [required]="false"
        data-testid="field-status">
      </app-pr-select>
    </div>`;
}

function mountGrid(gridClass: string) {
  return mountCF(gridTemplate(gridClass), {
    componentProperties: { policyTypes: POLICY_TYPES, statusOptions: STATUS_OPTIONS },
    editable: true
  });
}

/** Disqualifier guard: measure the grid's OWN rendered width (not the viewport) before any
 *  `@container` read — `field_card`'s container query reads the field's content box, which this
 *  spec controls directly via the grid's own width, decoupled from any body/root padding. */
function assertEffectiveGridWidth(expected: number): void {
  cy.get('[data-testid="policy-grid"]').should($grid => {
    const measured = ($grid[0] as HTMLElement).getBoundingClientRect().width;
    expect(measured, `grid content width: requested ${expected} -> measured ${measured}`).to.be.closeTo(expected, 4);
  });
}

/** `(click)="markEditedFromPointer($event)"` lives on `app-field-card`'s own host div and ignores
 *  only `.field_card_header` / `.field_card_desc` (`field-card.component.ts:171-176`) — clicking
 *  anywhere else in the projected control marks the field `edited`, which is what flips `saveState`
 *  from `'none'` to `'unsaved'` and renders `.fch_save` at all (`field-card.component.html:56`,
 *  `field-card.component.ts:145-150`). Without this, `.fch_save` never exists in the DOM to begin
 *  with — `saveState !== 'none'` gates it. The projected control's own root class differs by field
 *  type — `app-pr-select` renders `.pr-field`, `app-pr-input` renders `.pr-input` — so the caller
 *  supplies it rather than this helper guessing one selector for every field type. */
function markEdited(testid: string, controlSelector: string): void {
  cy.get(`[data-testid="${testid}"] ${controlSelector}`).click();
}

function assertSaveTextCollapsed(testid: string, label: string): void {
  cy.get(`[data-testid="${testid}"] .fch_save span:last-child`).should($span => {
    const display = getComputedStyle($span[0] as HTMLElement).display;
    expect(display, `${label}: ${testid} .fch_save span:last-child display`).to.equal('none');
  });
}

function assertSaveTextVisible(testid: string, label: string): void {
  cy.get(`[data-testid="${testid}"] .fch_save span:last-child`)
    .should($span => {
      const display = getComputedStyle($span[0] as HTMLElement).display;
      expect(display, `${label}: ${testid} .fch_save span:last-child display`).not.to.equal('none');
    })
    .should('contain.text', 'Unsaved changes');
}

function assertRequiredTextVisible(testid: string, label: string): void {
  cy.get(`[data-testid="${testid}"] .fch_required`)
    .should($tag => {
      const fontSize = getComputedStyle($tag[0] as HTMLElement).fontSize;
      expect(fontSize, `${label}: ${testid} .fch_required font-size`).not.to.equal('0px');
    })
    .should('contain.text', 'Required');
}

/** Top offset of a mounted field's host, for row-grouping assertions. */
function topOf(testid: string): Cypress.Chainable<number> {
  return cy.get(`[data-testid="${testid}"]`).then($el => cy.wrap(($el[0] as HTMLElement).getBoundingClientRect().top, { log: false }));
}

describe('TypePolicyChange grid — save-pill / REQUIRED-badge collapse (FCT-T-1)', () => {
  describe('historical baseline — NOT sourced from the production template (it no longer carries this literal)', () => {
    ([900, 1100] as const).forEach(width => {
      it(`pre-fix minmax(190px,1fr) at ${width}px: Policy type's save-pill text collapses — the bug this spec pins (documentary only, not the fix's gate)`, () => {
        cy.viewport(width, 800);
        mountGrid('grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[20px]');
        assertEffectiveGridWidth(width);

        markEdited('field-policy-type', '.pr-field');
        assertSaveTextCollapsed('field-policy-type', `${width}px/190px`);
        // The REQUIRED badge's own, lower 240px threshold does not fire at these widths even
        // pre-fix (design.md's measurement table) — asserted so this baseline documents exactly
        // what attempt 1 measured, not a stronger claim than the evidence supports.
        assertRequiredTextVisible('field-policy-type', `${width}px/190px`);
      });
    });
  });

  describe('fix verification — grid class sourced LIVE from the production template (a template revert fails every case here)', () => {
    it('re-walked squeeze width ~760px (formerly a 2-column tight fit under the rejected minmax(360px,1fr)): auto-fit now falls back to a single column under minmax(390px,1fr) — no collapse', () => {
      productionGridClass().then(gridClass => {
        cy.viewport(760, 800);
        mountGrid(gridClass);
        assertEffectiveGridWidth(760);

        markEdited('field-policy-type', '.pr-field');
        assertSaveTextVisible('field-policy-type', '760px/390px');
        assertRequiredTextVisible('field-policy-type', '760px/390px');

        // N=1 at this width (760 < 800) — all three fields stack, each strictly below the last.
        topOf('field-policy-type').then(policyTypeTop => {
          topOf('field-usd-amount').then(usdAmountTop => {
            expect(usdAmountTop - policyTypeTop, '760px: USD amount wraps below Policy type (single-column fallback)').to.be.greaterThan(10);
            topOf('field-status').then(statusTop => {
              expect(statusTop - usdAmountTop, '760px: Status wraps below USD amount (single-column fallback)').to.be.greaterThan(10);
            });
          });
        });
      });
    });

    it('re-walked squeeze width ~1150px (formerly a 3-column tight fit under the rejected minmax(360px,1fr)): renders 2 columns under minmax(390px,1fr) (Policy type + USD amount row 1, Status row 2) — no collapse', () => {
      productionGridClass().then(gridClass => {
        cy.viewport(1150, 800);
        mountGrid(gridClass);
        assertEffectiveGridWidth(1150);

        markEdited('field-policy-type', '.pr-field');
        assertSaveTextVisible('field-policy-type', '1150px/390px');
        assertRequiredTextVisible('field-policy-type', '1150px/390px');

        // Advisory (readability): USD amount's own pill, explicitly, not just geometrically implied
        // by Policy type's — makes FCT-AC-1's "each visible field's" claim explicit.
        markEdited('field-usd-amount', '.pr-input');
        assertSaveTextVisible('field-usd-amount', '1150px/390px');

        topOf('field-policy-type').then(policyTypeTop => {
          topOf('field-usd-amount').then(usdAmountTop => {
            expect(Math.abs(policyTypeTop - usdAmountTop), '1150px: Policy type and USD amount share row 1 (top offsets within 1px)').to.be.at.most(1);
            topOf('field-status').then(statusTop => {
              expect(statusTop - usdAmountTop, '1150px: Status wraps to row 2').to.be.greaterThan(10);
            });
          });
        });
      });
    });

    it('wide width ≥1210px (1220px): 3 columns share one row again — the original PCP-T-1 grouping restored, column width (~393px) just above the 390px floor — no collapse', () => {
      productionGridClass().then(gridClass => {
        cy.viewport(1220, 800);
        mountGrid(gridClass);
        assertEffectiveGridWidth(1220);

        markEdited('field-policy-type', '.pr-field');
        assertSaveTextVisible('field-policy-type', '1220px/390px');
        assertRequiredTextVisible('field-policy-type', '1220px/390px');

        topOf('field-policy-type').then(policyTypeTop => {
          topOf('field-usd-amount').then(usdAmountTop => {
            topOf('field-status').then(statusTop => {
              expect(Math.abs(policyTypeTop - usdAmountTop), '1220px: Policy type and USD amount share one row').to.be.at.most(1);
              expect(Math.abs(usdAmountTop - statusTop), '1220px: USD amount and Status share the SAME row (3-up restored)').to.be.at.most(1);
            });
          });
        });
      });
    });

    it('narrow width <800px (600px): the grid wraps to a single column (FCT-AC-2/FCT-R-2), each field stacked, still legible', () => {
      productionGridClass().then(gridClass => {
        cy.viewport(600, 800);
        mountGrid(gridClass);
        assertEffectiveGridWidth(600);

        markEdited('field-policy-type', '.pr-field');
        assertSaveTextVisible('field-policy-type', '600px/390px');
        assertRequiredTextVisible('field-policy-type', '600px/390px');

        topOf('field-policy-type').then(policyTypeTop => {
          topOf('field-usd-amount').then(usdAmountTop => {
            expect(usdAmountTop - policyTypeTop, '600px: USD amount wraps below Policy type').to.be.greaterThan(10);
            topOf('field-status').then(statusTop => {
              expect(statusTop - usdAmountTop, '600px: Status wraps below USD amount').to.be.greaterThan(10);
            });
          });
        });
      });
    });
  });

  describe('overflow guard — min(390px,100%) (attempt 4, the falsifier attempt 3 failed)', () => {
    it('sub-390px content width (300px): the single column shrinks to fit the container — NO horizontal overflow', () => {
      productionGridClass().then(gridClass => {
        cy.viewport(300, 800);
        mountGrid(gridClass);

        // Empirically confirmed (not guessed): the grid's OWN scrollWidth vs clientWidth already
        // registers the overflow directly at this width — a bare `minmax(390px,1fr)` measures
        // scrollWidth=390/clientWidth=300 here (the fixed `390px` track forces the box to hold
        // content wider than its own explicit `w-full` size), while `min(390px,100%)` measures
        // 300/300 (no overflow). No need to also check the parent/body — the grid itself is the
        // overflow boundary at this mount structure.
        cy.get('[data-testid="policy-grid"]').should($grid => {
          const grid = $grid[0] as HTMLElement;
          expect(
            grid.scrollWidth,
            `300px: grid scrollWidth (${grid.scrollWidth}) vs clientWidth (${grid.clientWidth}) — no horizontal overflow`
          ).to.be.at.most(grid.clientWidth + 1);
        });
        assertEffectiveGridWidth(300);

        // Below the 390px floor, app-field-card's OWN 380px collapse rule is the intended last
        // resort (FCT-R-2) — not an accidental omission. Documenting it here, rather than only
        // asserting "no overflow", closes the gap a pure-overflow check would leave: it is still
        // possible to pass "no overflow" while secretly failing to reach the single-column layout
        // this requirement actually describes.
        markEdited('field-policy-type', '.pr-field');
        assertSaveTextCollapsed('field-policy-type', '300px/min(390px,100%) — FCT-R-2 last-resort collapse');
      });
    });

    it('exactly at the 390px floor (1210px, 3 columns of exactly 390px each): still no collapse at the tightest possible packing', () => {
      productionGridClass().then(gridClass => {
        cy.viewport(1210, 800);
        mountGrid(gridClass);
        assertEffectiveGridWidth(1210);

        markEdited('field-policy-type', '.pr-field');
        assertSaveTextVisible('field-policy-type', '1210px/390px (exact floor)');
        assertRequiredTextVisible('field-policy-type', '1210px/390px (exact floor)');

        topOf('field-policy-type').then(policyTypeTop => {
          topOf('field-usd-amount').then(usdAmountTop => {
            topOf('field-status').then(statusTop => {
              expect(Math.abs(policyTypeTop - usdAmountTop), '1210px: Policy type and USD amount share one row').to.be.at.most(1);
              expect(Math.abs(usdAmountTop - statusTop), '1210px: USD amount and Status share the SAME row (3-up at exactly the floor)').to.be.at.most(
                1
              );
            });
          });
        });
      });
    });
  });
});
