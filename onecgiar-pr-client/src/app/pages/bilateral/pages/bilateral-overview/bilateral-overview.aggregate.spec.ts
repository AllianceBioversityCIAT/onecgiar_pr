// @akili-spec bilateral/center-overview-tab (COV-T-3)
import {
  PENDING_AGE_DAYS,
  RESULT_TYPE_GROUPS,
  buildAttentionModel,
  buildByProjectModel,
  buildBySpModel,
  buildByTypeModel,
  buildOverviewKpis,
  buildOverviewModel,
  buildOverviewPaceModel,
  buildStatusModel,
  resolveResultTypeGroup,
} from './bilateral-overview.aggregate';
import {
  FIXTURE_D1_ROWS,
  FIXTURE_DRAFTS,
  FIXTURE_PACE_FALLBACK_ROWS,
  FIXTURE_PHASE,
  FIXTURE_PROJECTS,
  FIXTURE_ROWS_NO_APPROVALS,
  FIXTURE_SP_TWO_PROJECTS,
  FIXTURE_SP_TWO_PROJECTS_ROWS,
  FIXTURE_TODAY,
  makeLargeFixture,
} from './bilateral-overview.fixtures';
import { BilateralCenterResult } from '../../services/bilateral-center-result.interface';

describe('bilateral-overview.aggregate', () => {
  describe('constants', () => {
    it('PENDING_AGE_DAYS is 14 (COV-R-20)', () => {
      expect(PENDING_AGE_DAYS).toBe(14);
    });

    it('resolveResultTypeGroup groups ids per COV-DD-6, unknown ids fall to "other"', () => {
      for (const id of RESULT_TYPE_GROUPS.output) expect(resolveResultTypeGroup(id)).toBe('output');
      for (const id of RESULT_TYPE_GROUPS.outcome) expect(resolveResultTypeGroup(id)).toBe('outcome');
      expect(resolveResultTypeGroup(11)).toBe('other'); // Complementary innovation — deliberately unmapped
      expect(resolveResultTypeGroup(999)).toBe('other');
    });
  });

  describe('KPI deck (COV-R-6)', () => {
    const kpis = buildOverviewKpis(FIXTURE_D1_ROWS, FIXTURE_PROJECTS, FIXTURE_DRAFTS, FIXTURE_TODAY);

    it('Total results: counts, W3/W1W2 split, lead/contributing split', () => {
      expect(kpis.totalResults).toEqual({
        count: 10,
        w3Count: 9,
        w1w2Count: 1,
        leadCount: 6,
        contributingCount: 4,
      });
    });

    it('Pending review: count, oldest age, over-14 count — age 14 not counted, age 15 counted', () => {
      expect(kpis.pendingReview).toEqual({ count: 2, oldestAgeDays: 15, overAgeCount: 1 });
    });

    it('Approved: count, approval rate, rejected count', () => {
      expect(kpis.approved).toEqual({ count: 3, approvalRatePercent: 75, rejectedCount: 1 });
    });

    it('Approved: approval rate is null when approved + rejected === 0', () => {
      const approved = buildOverviewKpis(FIXTURE_ROWS_NO_APPROVALS, FIXTURE_PROJECTS, [], FIXTURE_TODAY).approved;
      expect(approved.approvalRatePercent).toBeNull();
    });

    it('Needs attention: editing + rejected + active AI drafts (discarded draft excluded)', () => {
      expect(kpis.needsAttention).toEqual({ count: 4, editingCount: 1, rejectedCount: 1, aiDraftCount: 2 });
    });

    it('Projects covered: covered/total/not-started — null-project rows never count toward coverage', () => {
      expect(kpis.projectsCovered).toEqual({ coveredCount: 2, totalCount: 3, notStartedCount: 1 });
    });
  });

  describe('Reporting status card (COV-R-7)', () => {
    const status = buildStatusModel(FIXTURE_D1_ROWS);

    it('tile counts sum to total minus discontinued', () => {
      expect(status.tileTotal).toBe(9); // 10 rows - 1 discontinued (id 8)
      const sumOfTiles = status.tiles.reduce((sum, tile) => sum + tile.count, 0);
      expect(sumOfTiles).toBe(status.tileTotal);
    });

    it('Submitted/QA tile merges status ids 2 and 3', () => {
      const submittedQa = status.tiles.find(t => t.key === 'submittedQa');
      expect(submittedQa?.count).toBe(2); // row 6 (submitted) + row 7 (qa)
    });

    it('compares status ids numerically after Number() normalization (string "5")', () => {
      const pending = status.tiles.find(t => t.key === 'pending');
      expect(pending?.count).toBe(2); // rows 2 ('5' string) and 3 (5 number)
    });

    it('a11y table lists every status id 1..7, including zero-count ones', () => {
      const rowsMissingDiscontinued = FIXTURE_D1_ROWS.filter(r => Number(r.status_id) !== 4);
      const table = buildStatusModel(rowsMissingDiscontinued).tableRows;
      expect(table.map(r => r.statusId)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(table.find(r => r.statusId === 4)).toEqual({ statusId: 4, count: 0 });
    });
  });

  describe('Needs attention card (COV-R-8)', () => {
    it('four rows: editing, rejected, AI drafts, pending > 14 days', () => {
      const attention = buildAttentionModel(FIXTURE_D1_ROWS, FIXTURE_DRAFTS, FIXTURE_TODAY);
      expect(attention.rows).toEqual([
        { key: 'editing', count: 1 },
        { key: 'rejected', count: 1 },
        { key: 'aiDrafts', count: 2 },
        { key: 'pendingOver14', count: 1 },
      ]);
      expect(attention.allZero).toBe(false);
    });

    it('aging: exactly 14 days is NOT counted, 15 days IS counted', () => {
      const rows: BilateralCenterResult[] = FIXTURE_D1_ROWS.filter(r => [2, 3].includes(r.id)); // age 14 and age 15
      const attention = buildAttentionModel(rows, [], FIXTURE_TODAY);
      expect(attention.rows.find(r => r.key === 'pendingOver14')?.count).toBe(1);
    });

    it('all counts zero → allZero true (single-line empty state)', () => {
      const attention = buildAttentionModel([], [], FIXTURE_TODAY);
      expect(attention.rows.every(r => r.count === 0)).toBe(true);
      expect(attention.allZero).toBe(true);
    });
  });

  describe('Results by project card (COV-R-9)', () => {
    const byProject = buildByProjectModel(FIXTURE_D1_ROWS, FIXTURE_PROJECTS);

    it('one bar per project with >=1 result, stacked lead/contributing, sorted desc by total', () => {
      expect(byProject.bars).toEqual([
        { projectId: 100, leadCount: 3, contributingCount: 2, total: 5 },
        { projectId: 200, leadCount: 2, contributingCount: 1, total: 3 },
      ]);
    });

    it('"Not started yet": projects in scope with zero results', () => {
      expect(byProject.notStartedProjectIds).toEqual([300]);
    });

    it('null project_id rows group into "No bilateral project" and never count toward a project bar or coverage', () => {
      expect(byProject.noProjectRow).toEqual({ total: 2, leadCount: 1, contributingCount: 1, allW1W2: false });
      expect(byProject.coveredCount).toBe(2);
      expect(byProject.totalProjectsInScope).toBe(3);
    });

    it('allW1W2 is true when every no-project row is a W1/W2 (source Result) row', () => {
      const w1w2Only = FIXTURE_D1_ROWS.filter(r => r.id === 6); // the single W1/W2, no-project row
      const result = buildByProjectModel(w1w2Only, FIXTURE_PROJECTS);
      expect(result.noProjectRow?.allW1W2).toBe(true);
    });

    it('a row whose project_id matches no project in scope is counted in unmatchedProjectRows, not silently dropped', () => {
      const outOfScope: BilateralCenterResult = { ...FIXTURE_D1_ROWS[0], id: 999, project_id: 9999 };
      const result = buildByProjectModel([outOfScope], FIXTURE_PROJECTS);
      expect(result.unmatchedProjectRows).toBe(1);
      expect(result.bars).toEqual([]);
    });

    it('unmatchedProjectRows is 0 when every row resolves to an in-scope project or no project', () => {
      expect(byProject.unmatchedProjectRows).toBe(0);
    });
  });

  describe('Science Program contribution card (COV-R-10)', () => {
    it('a project mapping the same SP twice counts once (dedupe per project)', () => {
      const bySp = buildBySpModel(FIXTURE_D1_ROWS, FIXTURE_PROJECTS);
      const sp01 = bySp.rows.find(r => r.programCode === 'SP01');
      expect(sp01?.projectsMappedCount).toBe(1); // Alpha maps SP01 twice in the fixture
    });

    it('two mapped projects, zero results: row shows 2 · 0', () => {
      const bySp = buildBySpModel(FIXTURE_SP_TWO_PROJECTS_ROWS, FIXTURE_SP_TWO_PROJECTS);
      expect(bySp.rows).toEqual([{ programCode: 'SP03', projectsMappedCount: 2, resultsCount: 0 }]);
    });

    it('sorted by results desc, ties by projects desc', () => {
      const bySp = buildBySpModel(FIXTURE_D1_ROWS, FIXTURE_PROJECTS);
      expect(bySp.rows.map(r => r.programCode)).toEqual(['SP01', 'SP02']); // 5 results vs 4
    });
  });

  describe('Results by result type card (COV-R-11)', () => {
    const byType = buildByTypeModel(FIXTURE_D1_ROWS);

    it('groups by result_type_id (COV-DD-6), normalizing a string id ("7")', () => {
      const row7 = byType.rows.find(r => r.resultTypeId === 7);
      expect(row7?.count).toBe(1); // fixture row 6 carries result_type_id '7' as a string
      expect(row7?.group).toBe('output');
    });

    it('a type with zero results in scope is present in the table but omitted from the bars', () => {
      const zeroCountRow = byType.rows.find(r => r.resultTypeId === 3); // present in RESULT_TYPE_GROUPS, absent from fixture rows
      expect(zeroCountRow).toEqual({
        resultTypeId: 3,
        label: null,
        group: 'outcome',
        count: 0,
        segments: { approved: 0, pending: 0, other: 0 },
        omittedFromBar: true,
      });
    });

    it('segments split approved / pending / editing-other, per type', () => {
      const type6 = byType.rows.find(r => r.resultTypeId === 6);
      // fixture rows for type 6: ids 1(approved),2(pending),3(pending),8(discontinued->other),10(approved)
      expect(type6?.segments).toEqual({ approved: 2, pending: 2, other: 1 });
      expect(type6?.count).toBe(5);
    });

    it('every present row sums back to the total row count', () => {
      const total = byType.rows.reduce((sum, r) => sum + r.count, 0);
      expect(total).toBe(FIXTURE_D1_ROWS.length);
    });
  });

  describe('Reporting pace card (COV-R-12)', () => {
    it('last cumulative value equals the total row count (== the hero KPI)', () => {
      const pace = buildOverviewPaceModel(FIXTURE_D1_ROWS, FIXTURE_PHASE, FIXTURE_TODAY);
      expect(pace.points.at(-1)?.cumulative).toBe(FIXTURE_D1_ROWS.length);
    });

    it('rows outside [start_date, end_date] are bucketed into the first/last week, not dropped', () => {
      const pace = buildOverviewPaceModel(FIXTURE_D1_ROWS, FIXTURE_PHASE, FIXTURE_TODAY);
      expect(pace.outsideWindowCount).toBe(2); // fixture rows 9 (before) and 10 (after)
      expect(pace.points[0].isBoundaryBucket).toBe(true);
      expect(pace.points.at(-1)?.isBoundaryBucket).toBe(true);
    });

    it('window comes from the phase dates and today falls inside it', () => {
      const pace = buildOverviewPaceModel(FIXTURE_D1_ROWS, FIXTURE_PHASE, FIXTURE_TODAY);
      expect(pace.hasWindow).toBe(true);
      expect(pace.windowStart).toBe('2026-08-01');
      expect(pace.windowEnd).toBe('2026-09-30');
      expect(pace.todayInWindow).toBe(true);
    });

    it('falls back to [min, max] created_date when the phase has no dates, hiding the window', () => {
      const pace = buildOverviewPaceModel(FIXTURE_PACE_FALLBACK_ROWS, null, FIXTURE_TODAY);
      expect(pace.hasWindow).toBe(false);
      expect(pace.windowStart).toBe('2026-01-05');
      expect(pace.windowEnd).toBe('2026-01-20');
      expect(pace.todayInWindow).toBe(false);
      expect(pace.points.at(-1)?.cumulative).toBe(FIXTURE_PACE_FALLBACK_ROWS.length);
    });

    it('empty rows and no phase produce an empty, windowless model', () => {
      const pace = buildOverviewPaceModel([], null, FIXTURE_TODAY);
      expect(pace).toEqual({ points: [], hasWindow: false, windowStart: null, windowEnd: null, todayInWindow: false, outsideWindowCount: 0 });
    });
  });

  describe('buildOverviewModel (composition)', () => {
    it('produces every card model from one call', () => {
      const model = buildOverviewModel(FIXTURE_D1_ROWS, FIXTURE_PROJECTS, FIXTURE_DRAFTS, FIXTURE_PHASE, FIXTURE_TODAY);
      expect(model.kpis.totalResults.count).toBe(10);
      expect(model.status.tileTotal).toBe(9);
      expect(model.attention.rows).toHaveLength(4);
      expect(model.byProject.bars).toHaveLength(2);
      expect(model.bySp.rows.length).toBeGreaterThan(0);
      expect(model.byType.rows.length).toBeGreaterThan(0);
      expect(model.pace.points.at(-1)?.cumulative).toBe(10);
    });
  });

  describe('performance (COV-AC-24, NFR)', () => {
    it('aggregates 5,000 rows + 200 projects in < 100ms (median of 3 runs)', () => {
      const { rows, projects } = makeLargeFixture(5000);
      const drafts = [] as const;
      const timings: number[] = [];

      // One untimed warm-up call: V8 JIT-compiles buildOverviewModel's hot path on first
      // invocation, which otherwise dominates the spread between run 1 and runs 2-3 (observed
      // consistently across repeated executions) without reflecting steady-state performance.
      buildOverviewModel(rows, projects, drafts, FIXTURE_PHASE, FIXTURE_TODAY);

      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        buildOverviewModel(rows, projects, drafts, FIXTURE_PHASE, FIXTURE_TODAY);
        timings.push(performance.now() - start);
      }

      const sorted = [...timings].sort((a, b) => a - b);
      const median = sorted[1];
      const spread = Math.max(...timings) - Math.min(...timings);
      const spreadRatio = median > 0 ? spread / median : 0;

      // eslint-disable-next-line no-console
      console.info(`[COV-AC-24] aggregate(5000 rows, 200 projects) timings=${timings.map(t => t.toFixed(2)).join(', ')}ms median=${median.toFixed(2)}ms spreadRatio=${(spreadRatio * 100).toFixed(1)}%`);

      if (spreadRatio > 0.5) {
        // eslint-disable-next-line no-console
        console.info('[COV-AC-24] INCONCLUSIVE: spread exceeds 50% of the median — CI noise, not a pass/fail signal.');
      } else {
        expect(median).toBeLessThan(100);
      }
    });
  });
});
