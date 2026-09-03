import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ProgramOverviewComponent, TocAchievement } from './program-overview.component';
import type { OverviewAowProgressRowRich } from '../../dashboard-lab.component';

/**
 * AIS-T-1 — container-sweep CT spec + track measurement (`docs/specs/changes/aow-identity-column-starvation`).
 *
 * Bug-Mode regression gate (`AIS-R-6`, `design.md` `AIS-DD-5`): mounts the REAL `ProgramOverviewComponent`
 * in a real Chromium layout engine and sweeps the row LIST WRAPPER's inline `width`. The wrapper's
 * container-query width `Q` (= inline width − 40px of `p-[20px]`) is the value the ladder will read once
 * `@container` lands (`AIS-T-2`); today the row has NO container query, so `Q` is reported purely as the
 * row's own rendered content-box width. `cy.viewport(1500, 900)` keeps every VIEWPORT media query
 * (`min-[900px]`, `max-[900px]`, `max-[1101px]`, `max-[1280px]`) pinned to their wide-viewport branch for
 * the whole sweep — this is deliberate: it is exactly what proves `AIS-R-3` ("must NOT be satisfied by
 * class names, scrollWidth alone" is the requirement; the viewport ladder never sheds a track at a fixed
 * 1500px viewport no matter how far `Q` shrinks, so today's row keeps 5 rigid tracks throughout and the
 * `minmax(0,1fr)` identity track starves).
 *
 * Mounts the class directly (`cy.mount(ProgramOverviewComponent, …)`) rather than the `mountComponent`
 * helper — `tasks.md` §2 pre-flight notes a `TS2322` on `ct-utils.ts:54` between `mountComponent`'s
 * `componentProperties` typing and this component's signal inputs; `cy.mount` (the same `cypress/angular`
 * primitive `mountComponent` wraps) takes the class's inputs untyped and avoids the fight. `ct-utils.ts`
 * is out of scope for this task.
 */

const LONG_NAME = 'Accelerated Genetic Gains for Climate-Resilient, Nutrient-Dense Staple Crop Systems'; // 83 chars
if (LONG_NAME.length < 60) throw new Error('fixture guard: AIS-T-1 long name must be ≥ 60 chars');

function achievement(over: Partial<TocAchievement>): TocAchievement {
  return {
    progress_percentage: '42.50',
    preliminary_progress_percentage: '38.10',
    progress_value: 0.425,
    preliminary_value: 0.381,
    counted: 17,
    total: 25,
    indicators_counted: 5,
    indicators_total: 6,
    ...over
  };
}

/** ≥ 3 rows, every row carries a non-null `achievement` (so the achievement cell / ⓘ fallback both
 *  exist to be swept — `AIS-AC-6`). One row's `reported/total` is 999/999 (100%) to size the widest
 *  mono-figures content; one row's `name` is ≥ 60 chars to size the ellipsis assertion. */
const FIXTURE_ROWS: OverviewAowProgressRowRich[] = [
  {
    code: 'AOW01',
    name: LONG_NAME,
    complete: 12,
    inProgress: 5,
    notStarted: 8,
    zeroTarget: 0,
    reported: 17,
    total: 25,
    remaining: 8,
    achievement: achievement({})
  },
  {
    code: 'AOW02',
    name: 'Digital Advisory Services for Smallholder Value Chains',
    complete: 999,
    inProgress: 0,
    notStarted: 0,
    zeroTarget: 0,
    reported: 999,
    total: 999,
    remaining: 0,
    achievement: achievement({
      progress_percentage: '100.00',
      preliminary_progress_percentage: '100.00',
      progress_value: 1,
      preliminary_value: 1,
      counted: 999,
      total: 999,
      indicators_counted: 20,
      indicators_total: 20
    })
  },
  {
    code: 'AOW03',
    name: 'Livestock and Fisheries Value Chains Transformation Program',
    complete: 3,
    inProgress: 1,
    notStarted: 6,
    zeroTarget: 1,
    reported: 4,
    total: 10,
    remaining: 6,
    achievement: achievement({
      progress_percentage: '15.00',
      preliminary_progress_percentage: '10.00',
      progress_value: 0.15,
      preliminary_value: 0.1,
      counted: 4,
      total: 10,
      indicators_counted: 2,
      indicators_total: 3
    })
  }
];

/** Q sweep: 336 → 1000 step 8 (`design.md` `AIS-DD-5`: absolute floor ≈330 rounded up to the next
 *  multiple of 8). Wrapper inline width = Q + 40 (`p-[20px]` × 2). */
const Q_VALUES: number[] = [];
for (let q = 336; q <= 1000; q += 8) Q_VALUES.push(q);
const WRAPPER_PAD = 40;

const MOUNT_CONFIG = {
  imports: [HttpClientTestingModule, NoopAnimationsModule],
  providers: [provideRouter([])]
};

function trackCount(gridTemplateColumns: string): number {
  return gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length;
}

interface RowMeasurement {
  nameClientWidth: number;
  nameScrollWidth: number;
  nameTextOverflow: string;
  chipRight: number;
  identityRight: number;
  rowScrollWidth: number;
  rowClientWidth: number;
  achievementDisplayed: boolean;
  infoButtonDisplayed: boolean;
}

/** Row's direct grid children, in template order: [identity, bar, figures, achievement, actions]. */
function measureRow(rowEl: HTMLElement): RowMeasurement {
  const identityCell = rowEl.children[0] as HTMLElement;
  const achievementCell = rowEl.children[3] as HTMLElement;
  const identityButton = identityCell.children[0] as HTMLElement;
  const chip = identityButton.children[1] as HTMLElement; // [0] sr-only, [1] code chip, [2] name wrap
  const nameSpan = (identityButton.children[2] as HTMLElement).children[0] as HTMLElement;
  const infoButton = identityCell.children[1] as HTMLElement | undefined;

  const identityRect = identityCell.getBoundingClientRect();
  const chipRect = chip.getBoundingClientRect();
  const nameStyle = getComputedStyle(nameSpan);

  return {
    nameClientWidth: nameSpan.clientWidth,
    nameScrollWidth: nameSpan.scrollWidth,
    nameTextOverflow: nameStyle.textOverflow,
    chipRight: chipRect.right,
    identityRight: identityRect.right,
    rowScrollWidth: rowEl.scrollWidth,
    rowClientWidth: rowEl.clientWidth,
    achievementDisplayed: getComputedStyle(achievementCell).display !== 'none',
    infoButtonDisplayed: !!infoButton && getComputedStyle(infoButton).display !== 'none'
  };
}

describe('ProgramOverviewComponent — AoW row container-width sweep (AIS-T-1, Bug-Mode red gate)', () => {
  beforeEach(() => cy.viewport(1500, 900));

  it('AIS-AC-1/2/6: name ≥ 80px, chip never spills, ellipsis on overflow, row never overflows, exactly one of {achievement, ⓘ} — richLoading=false', () => {
    cy.mount(ProgramOverviewComponent, {
      ...MOUNT_CONFIG,
      componentProperties: { richRows: FIXTURE_ROWS, richLoading: false }
    });

    cy.get('[data-testid="aow-rows"]').then($wrapper => {
      const wrapperEl = $wrapper[0] as HTMLElement;
      const failures: string[] = [];
      let steps = 0;

      for (const q of Q_VALUES) {
        steps++;
        wrapperEl.style.width = `${q + WRAPPER_PAD}px`;
        const rows = Array.from(wrapperEl.children) as HTMLElement[];
        if (rows.length === 0) throw new Error(`Q=${q}: no rows rendered — harness bug`);

        rows.forEach((rowEl, idx) => {
          if (rowEl.querySelector('.animate-pulse')) {
            throw new Error(`Q=${q} row${idx}: animate-pulse present in the non-loading sweep — harness bug`);
          }
          const m = measureRow(rowEl);
          if (m.nameClientWidth < 80) {
            failures.push(`Q=${q} row${idx}: name clientWidth ${m.nameClientWidth}px < 80px`);
          }
          if (m.chipRight > m.identityRight + 0.5) {
            failures.push(`Q=${q} row${idx}: chip right ${m.chipRight.toFixed(1)} > identity cell right ${m.identityRight.toFixed(1)} (chip spills)`);
          }
          if (m.nameScrollWidth > m.nameClientWidth && m.nameTextOverflow !== 'ellipsis') {
            failures.push(`Q=${q} row${idx}: name overflows (scrollWidth ${m.nameScrollWidth} > clientWidth ${m.nameClientWidth}) but text-overflow=${m.nameTextOverflow}`);
          }
          if (m.rowScrollWidth !== m.rowClientWidth) {
            failures.push(`Q=${q} row${idx}: row overflow scrollWidth=${m.rowScrollWidth} clientWidth=${m.rowClientWidth}`);
          }
          const shownCount = Number(m.achievementDisplayed) + Number(m.infoButtonDisplayed);
          if (shownCount !== 1) {
            failures.push(`Q=${q} row${idx}: exclusivity broken (achievement displayed=${m.achievementDisplayed}, ⓘ displayed=${m.infoButtonDisplayed})`);
          }
        });
      }

      expect(steps, 'sweep step count').to.equal(84);
      expect(Q_VALUES.length, 'Q_VALUES length').to.equal(84);

      if (failures.length) {
        const failingQs = Array.from(new Set(failures.map(f => f.split(' ')[0])));
        throw new Error(
          `${failures.length} failing measurements across ${failingQs.length}/${steps} steps ` +
            `(first Q=${failingQs[0]}, last Q=${failingQs[failingQs.length - 1]}).\n` +
            failures.join('\n')
        );
      }
    });
  });

  it('AIS-AC-3: skeleton row track count equals real row track count at every step — richLoading=true', () => {
    let realTrackCounts: number[] = [];

    cy.mount(ProgramOverviewComponent, {
      ...MOUNT_CONFIG,
      componentProperties: { richRows: FIXTURE_ROWS, richLoading: false }
    });
    cy.get('[data-testid="aow-rows"]').then($wrapper => {
      const wrapperEl = $wrapper[0] as HTMLElement;
      realTrackCounts = Q_VALUES.map(q => {
        wrapperEl.style.width = `${q + WRAPPER_PAD}px`;
        // All 3 fixture rows share the same static class list, so track COUNT (not px values) is
        // structurally identical across rows at a given width — the first row is representative.
        const rowEl = wrapperEl.children[0] as HTMLElement;
        return trackCount(getComputedStyle(rowEl).gridTemplateColumns);
      });
    });

    cy.mount(ProgramOverviewComponent, {
      ...MOUNT_CONFIG,
      componentProperties: { richRows: FIXTURE_ROWS, richLoading: true }
    });
    cy.get('[data-testid="aow-rows-skeleton"]').then($wrapper => {
      const wrapperEl = $wrapper[0] as HTMLElement;
      const failures: string[] = [];
      let steps = 0;

      Q_VALUES.forEach((q, i) => {
        steps++;
        wrapperEl.style.width = `${q + WRAPPER_PAD}px`;
        const rowEl = wrapperEl.children[0] as HTMLElement;
        if (!rowEl || !rowEl.querySelector('.animate-pulse')) {
          throw new Error(`Q=${q}: skeleton row missing or not pulsing — harness bug`);
        }
        const skeletonTracks = trackCount(getComputedStyle(rowEl).gridTemplateColumns);
        if (skeletonTracks !== realTrackCounts[i]) {
          failures.push(`Q=${q}: skeleton tracks=${skeletonTracks} real row tracks=${realTrackCounts[i]}`);
        }
      });

      expect(steps, 'sweep step count').to.equal(84);
      if (failures.length) {
        throw new Error(`${failures.length}/${steps} track-count mismatches.\n${failures.join('\n')}`);
      }
    });
  });

  it('[log only, never fails] max-content maxima at Q=1000 (A_wide, A_narrow) + overflow-locator on the row that actually overflows — inputs to AIS-T-2 / AIS-DD-3 thresholds (attempt 2, Reviewer remediation)', () => {
    // --- figures / actions / A_wide, and the overflow-locator: viewport 1500 (today's ladder never
    // sheds here — see the describe-level docblock), same fixture/mount as the other two `it`s. ---
    cy.mount(ProgramOverviewComponent, {
      ...MOUNT_CONFIG,
      componentProperties: { richRows: FIXTURE_ROWS, richLoading: false }
    });

    cy.get('[data-testid="aow-rows"]').then($wrapper => {
      const wrapperEl = $wrapper[0] as HTMLElement;
      wrapperEl.style.width = `${1000 + WRAPPER_PAD}px`; // Q = 1000
      const rows = Array.from(wrapperEl.children) as HTMLElement[];

      const figuresMax = Math.max(...rows.map(r => (r.children[2] as HTMLElement).getBoundingClientRect().width));
      const actionsMax = Math.max(...rows.map(r => (r.children[4] as HTMLElement).getBoundingClientRect().width));
      const achievementWideMax = Math.max(...rows.map(r => (r.children[3] as HTMLElement).getBoundingClientRect().width));

      cy.log(
        `AIS-DD-3 inputs @ Q=1000, viewport 1500 — figures max-content=${figuresMax.toFixed(1)}px, ` +
          `actions max-content=${actionsMax.toFixed(1)}px, achievement A_wide max-content=${achievementWideMax.toFixed(1)}px`
      );

      // Overflow-locator (attempt 2, Reviewer ask): which child track's right edge actually exceeds
      // the row's content-box right edge at Q=1000, on the row that overflows there. The exact pair
      // (scrollWidth=1012, clientWidth=996) belongs to AOW01/AOW03 (the "not complete" two-button
      // actions branch) — NOT AOW02 (999/999, `isRowComplete`, single "View results" button, a
      // narrower actions cell that does NOT overflow at Q=1000). Corrected from the brief's label;
      // AOW01 and AOW03 are structurally identical here (same actions/achievement branch), so AOW01
      // is measured as the representative.
      const overflowRowIdx = FIXTURE_ROWS.findIndex(r => r.code === 'AOW01');
      const rowEl = rows[overflowRowIdx];
      const rowRect = rowEl.getBoundingClientRect();
      const rowCs = getComputedStyle(rowEl);
      const paddingRight = parseFloat(rowCs.paddingRight);
      const borderRightWidth = parseFloat(rowCs.borderRightWidth);
      const columnGap = parseFloat(rowCs.columnGap);
      const contentBoxRight = rowRect.right - borderRightWidth - paddingRight;
      const CHILD_NAMES = ['identity', 'bar', 'figures', 'achievement', 'actions'];
      const overshoots = Array.from(rowEl.children)
        .map((c, i) => {
          const right = (c as HTMLElement).getBoundingClientRect().right;
          return `${CHILD_NAMES[i] ?? `child${i}`}=${(right - contentBoxRight).toFixed(2)}px`;
        })
        .join(', ');

      cy.log(
        `Overflow-locator @ Q=1000, viewport 1500, row=${FIXTURE_ROWS[overflowRowIdx].code}: ` +
          `row scrollWidth=${rowEl.scrollWidth} clientWidth=${rowEl.clientWidth} ` +
          `gridTemplateColumns="${rowCs.gridTemplateColumns}" columnGap=${columnGap}px paddingRight=${paddingRight}px ` +
          `borderRightWidth=${borderRightWidth}px gapEquals16=${columnGap === 16} contentBoxRight=${contentBoxRight.toFixed(2)} ` +
          `child right-edge overshoot vs contentBoxRight: ${overshoots}`
      );
    });

    // --- A_narrow: the achievement cell's RESTACKED max-content. Reachable at a viewport that keeps
    // the cell VISIBLE (`max-[1101px]:hidden` needs viewport < 1101 — must stay ≥ 1101) but RESTACKS
    // its inner QA/Prel span (`max-[1280px]:flex-col` needs viewport < 1280) — i.e. 1101 ≤ viewport <
    // 1280. Remounts fresh at viewport 1200 rather than reusing the mount above (attempt 2, Reviewer
    // remediation — was recorded "not measurable pre-fix" in attempt 1; that was wrong, it is
    // reachable this way). ---
    cy.viewport(1200, 900);
    cy.mount(ProgramOverviewComponent, {
      ...MOUNT_CONFIG,
      componentProperties: { richRows: FIXTURE_ROWS, richLoading: false }
    });
    cy.get('[data-testid="aow-rows"]').then($wrapper => {
      const wrapperEl = $wrapper[0] as HTMLElement;
      wrapperEl.style.width = `${1000 + WRAPPER_PAD}px`; // Q = 1000
      const rows = Array.from(wrapperEl.children) as HTMLElement[];
      const achievementCells = rows.map(r => r.children[3] as HTMLElement);

      // Guard: confirm the restack actually fired (viewport-gated `max-[1280px]:flex-col` on the
      // achievement cell's own first child) — else "A_narrow" would silently just be A_wide again.
      const restacked = achievementCells.every(cell => getComputedStyle(cell.children[0] as Element).flexDirection === 'column');
      if (!restacked) throw new Error('A_narrow guard: achievement cell did not restack at viewport 1200 — harness assumption wrong');

      const achievementNarrowMax = Math.max(...achievementCells.map(c => c.getBoundingClientRect().width));
      cy.log(`AIS-DD-3 input — achievement A_narrow max-content @ viewport 1200, Q=1000 = ${achievementNarrowMax.toFixed(1)}px`);

      // Never an assertion that can fail on measured content — this test's job is the log lines above.
      expect(rows.length, 'fixture rows present').to.be.greaterThan(0);
    });
  });
});
