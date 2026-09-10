import { ReportingAowTableComponent, ReportingAowGroup, ReportingIndicator } from './reporting-aow-table.component';

/**
 * AIS-T-4 — measure `reporting-aow-table`'s row under the AIS-T-1 container-sweep pattern
 * (`docs/specs/changes/aow-identity-column-starvation`). REPORT ONLY: every assertion below is a
 * harness guard (rows present, sweep completed); no assertion is made on a measured layout value —
 * the evidence is the logged table, written to `cypress/results/ais-t4-reporting-aow-table.txt` and
 * copied into `execution.md` §2 `AIS-T-4`. No template change (`AIS-DD-6`).
 *
 * Unlike `program-overview`'s AoW row (identity track `minmax(0,1fr)`, no floor — that's *why* it
 * starves), this row's name track is `minmax(280px, 1fr)` (`.pr-reporting-row`,
 * `reporting-aow-table.component.scss:51`) — a HARD 280px floor, already far above the 80px bar
 * `AIS-AC-1` uses. So the candidate defect here is not "the name shrinks below 80px" but "the row's
 * grid never sheds a track (no `@container`, no viewport variant at all), so once the sum of its
 * fixed tracks + the 280px floor + gaps exceeds the container, something has to give" — measured
 * below as row/scroller overflow rather than identity starvation.
 */

const LONG_NAMES = [
  'Number of climate-resilient staple crop varieties released and adopted by smallholder farmers',
  'Digital advisory services reaching women-led smallholder value chain actors across target regions',
  'Livestock and fisheries value chain interventions transforming program-level food security outcomes'
];
if (LONG_NAMES.some(n => n.length < 60)) throw new Error('fixture guard: AIS-T-4 names must be ≥ 60 chars');

function indicator(over: Partial<ReportingIndicator>): ReportingIndicator {
  return {
    indicator_id: 1,
    indicator_description: LONG_NAMES[0],
    target_value_sum: '25',
    actual_achieved_value_sum: 17,
    progress_percentage: '68.00',
    preliminary_achieved_value_sum: 20,
    preliminary_progress_percentage: '80.00',
    unit_messurament: 'Number',
    result_type_name: 'Knowledge product',
    type_name: 'Number of knowledge products published and quality-assured',
    center_acronym: 'CIAT',
    __hlo: 'HLO4.AOW1.IO1 Foster motivations',
    __aowCode: 'AOW01',
    ...over
  };
}

const FIXTURE_GROUPS: ReportingAowGroup[] = [
  {
    aow: { id: 1, code: 'AOW01', name: 'Market Intelligence' },
    indicators: [
      indicator({ indicator_id: 1, indicator_description: LONG_NAMES[0] }),
      indicator({
        indicator_id: 2,
        indicator_description: LONG_NAMES[1],
        target_value_sum: '999',
        actual_achieved_value_sum: 999,
        progress_percentage: '100.00'
      }),
      indicator({ indicator_id: 3, indicator_description: LONG_NAMES[2], target_value_sum: '10', actual_achieved_value_sum: 1, progress_percentage: '10.00' })
    ],
    count: 3,
    loading: false,
    kind: 'aow'
  }
];

/** `Q` sweep: 336 → 1000 step 8 — same absolute floor as `AIS-T-1` (`design.md` `AIS-DD-5`). */
const Q_VALUES: number[] = [];
for (let q = 336; q <= 1000; q += 8) Q_VALUES.push(q);

interface RowMeasurement {
  nameClientWidth: number;
  nameScrollWidth: number;
  nameTruncated: boolean; // literal brief: horizontal scrollWidth > clientWidth
  nameClampOverflow: boolean; // this row 2-line-clamps (`.pr-clamp-2`) rather than 1-line-truncates
  gridTemplateColumns: string;
  rowScrollWidth: number;
  rowClientWidth: number;
  scrollerOverflow: boolean; // the `.overflow-x-auto` ancestor scrolling — the REAL overflow signal
}

function measureRow(rowEl: HTMLElement): RowMeasurement {
  const nameEl = (rowEl.children[1] as HTMLElement).querySelector('p') as HTMLElement;
  const scroller = rowEl.closest('.overflow-x-auto') as HTMLElement | null;
  return {
    nameClientWidth: nameEl.clientWidth,
    nameScrollWidth: nameEl.scrollWidth,
    nameTruncated: nameEl.scrollWidth > nameEl.clientWidth,
    nameClampOverflow: nameEl.scrollHeight > nameEl.clientHeight,
    gridTemplateColumns: getComputedStyle(rowEl).gridTemplateColumns,
    rowScrollWidth: rowEl.scrollWidth,
    rowClientWidth: rowEl.clientWidth,
    scrollerOverflow: !!scroller && scroller.scrollWidth > scroller.clientWidth
  };
}

describe('ReportingAowTableComponent — row container-width sweep (AIS-T-4, report only)', () => {
  it('[log only, never fails on a measured value] name column + row overflow across Q=336..1000', () => {
    cy.mount(ReportingAowTableComponent, {
      componentProperties: { groups: FIXTURE_GROUPS, expandAll: true }
    });

    cy.get('section').then($section => {
      const sectionEl = $section[0] as HTMLElement;
      // Kill the disclosure transition so the very first read isn't caught mid-animation — the
      // card/HLO collapse both start `is-open` at mount, and `.pr-collapse`'s `grid-template-rows`
      // transition is a height concern, but this removes any doubt for width reads too.
      sectionEl.querySelectorAll<HTMLElement>('.pr-collapse').forEach(el => {
        el.style.transition = 'none';
      });
      void sectionEl.offsetHeight; // force reflow

      const lines: string[] = [];
      lines.push('Q,row,name.clientWidth,name.scrollWidth,name.truncated(horiz),name.clampOverflow,row.scrollWidth,row.clientWidth,scroller.overflow,gridTemplateColumns');

      let steps = 0;
      for (const q of Q_VALUES) {
        steps++;
        sectionEl.style.width = `${q}px`;
        const rows = Array.from(
          sectionEl.querySelectorAll<HTMLElement>('.pr-collapse.is-open .pr-collapse.is-open .pr-reporting-row')
        );
        if (rows.length === 0) throw new Error(`Q=${q}: no rows rendered — harness bug (fixture/disclosure wrong)`);
        if (rows.length !== 3) throw new Error(`Q=${q}: expected 3 rows, got ${rows.length} — harness bug`);

        rows.forEach((rowEl, idx) => {
          const m = measureRow(rowEl);
          lines.push(
            `${q},${idx},${m.nameClientWidth},${m.nameScrollWidth},${m.nameTruncated},${m.nameClampOverflow},` +
              `${m.rowScrollWidth},${m.rowClientWidth},${m.scrollerOverflow},"${m.gridTemplateColumns}"`
          );
        });
      }

      expect(steps, 'sweep step count').to.equal(84);
      expect(Q_VALUES.length, 'Q_VALUES length').to.equal(84);

      cy.writeFile('cypress/results/ais-t4-reporting-aow-table.txt', lines.join('\n') + '\n');
    });
  });
});
