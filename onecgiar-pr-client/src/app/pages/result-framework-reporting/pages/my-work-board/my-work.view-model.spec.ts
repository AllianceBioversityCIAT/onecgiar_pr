// @akili-spec changes/my-work-board (MWB-T-2, MWB-R-2, R-3, R-5, R-11)
import { ProgrammeResultRow } from '../programme-results/services/programme-results.service';
import {
  badgeCount,
  columnForStatus,
  filterByPhase,
  groupByColumn,
  MY_WORK_COLUMN_DEFS,
  orderByCreatedDesc,
  orderEditing,
  readyCount,
  resolveDefaultPhase,
  STATUS_COLUMN_MAP,
  totals
} from './my-work.view-model';

let nextId = 1;

/** Minimal, realistic `ProgrammeResultRow`. Every field a test cares about is passed explicitly;
 *  everything else gets an innocuous default so `toEqual`/shape checks never trip on noise. */
function row(partial: Partial<ProgrammeResultRow> = {}): ProgrammeResultRow {
  const id = nextId++;
  return {
    id,
    code: `R${id}`,
    title: `Result ${id}`,
    category: 'Knowledge product',
    statusId: 1,
    statusName: 'Editing',
    createdBy: 'Tester',
    created: '2026-01-01T00:00:00.000Z',
    origin: 'W1/W2',
    center: '',
    updated: '',
    indicator: '',
    section: '',
    versionId: '36',
    phaseName: 'Reporting 2026',
    phaseYear: 2026,
    submitterCode: 'SP01',
    resultTypeId: null,
    raw: {},
    ...partial
  };
}

describe('my-work.view-model', () => {
  describe('columnForStatus / STATUS_COLUMN_MAP', () => {
    it('maps every design.md §5 status id to its column', () => {
      expect(columnForStatus(1)).toBe('editing');
      expect(columnForStatus(8)).toBe('editing');
      expect(columnForStatus(5)).toBe('pending');
      expect(columnForStatus(3)).toBe('submitted');
      expect(columnForStatus(2)).toBe('approved');
      expect(columnForStatus(6)).toBe('approved');
      expect(columnForStatus(4)).toBe('discontinued');
      expect(columnForStatus(7)).toBe('discontinued');
    });

    it('sends an unmapped or missing id to Other', () => {
      expect(columnForStatus(42)).toBe('other');
      expect(columnForStatus(null)).toBe('other');
      expect(columnForStatus(undefined)).toBe('other');
    });

    it('keeps the map itself frozen', () => {
      expect(Object.isFrozen(STATUS_COLUMN_MAP)).toBe(true);
    });
  });

  describe('MY_WORK_COLUMN_DEFS', () => {
    // `MWB-T-10`: the `approved` column is labelled *Quality assessed* and belongs to the expanded
    // *Done* group — only Discontinued and Other stay in the collapsed *Closed* group.
    it('is the fixed order with the right group ids', () => {
      expect(MY_WORK_COLUMN_DEFS.map(def => [def.key, def.group])).toEqual([
        ['editing', 'action'],
        ['pending', 'waiting'],
        ['submitted', 'waiting'],
        ['approved', 'done'],
        ['discontinued', 'closed'],
        ['other', 'closed']
      ]);
    });

    it('labels the ids 2 + 6 column "Quality assessed" (MWB-T-10, user request 2026-09-05)', () => {
      expect(MY_WORK_COLUMN_DEFS.map(def => [def.key, def.label])).toEqual([
        ['editing', 'Editing'],
        ['pending', 'Pending review'],
        ['submitted', 'Submitted'],
        ['approved', 'Quality assessed'],
        ['discontinued', 'Discontinued'],
        ['other', 'Other']
      ]);
    });

    it('keeps exactly one expanded Done column and two collapsible Closed columns', () => {
      expect(MY_WORK_COLUMN_DEFS.filter(def => def.group === 'done').map(def => def.key)).toEqual(['approved']);
      expect(MY_WORK_COLUMN_DEFS.filter(def => def.group === 'closed').map(def => def.key)).toEqual(['discontinued', 'other']);
    });
  });

  describe('groupByColumn() + totals() — MWB-R-2 (14-row canonical fixture)', () => {
    // Exactly the breakdown the task names: 3×1, 1×8, 1×5, 2×3, 3×2, 1×6, 1×4, 1×7, 1×42.
    const rows: ProgrammeResultRow[] = [
      row({ statusId: 1, statusName: 'Editing', completeness: null }),
      row({ statusId: 1, statusName: 'Editing', completeness: { complete: 2, total: 5, missing: ['geographic-location'] } }),
      row({ statusId: 1, statusName: 'Editing', completeness: { complete: 4, total: 5, missing: ['evidences'] } }),
      row({ statusId: 8, statusName: 'Draft', completeness: { complete: 5, total: 5, missing: [] } }),
      row({ statusId: 5, statusName: 'Pending Review' }),
      row({ statusId: 3, statusName: 'Submitted' }),
      row({ statusId: 3, statusName: 'Submitted' }),
      row({ statusId: 2, statusName: 'Quality Assessed' }),
      row({ statusId: 2, statusName: 'Quality Assessed' }),
      row({ statusId: 2, statusName: 'Quality Assessed' }),
      row({ statusId: 6, statusName: 'Approved' }),
      row({ statusId: 4, statusName: 'Discontinued' }),
      row({ statusId: 7, statusName: 'Rejected' }),
      row({ statusId: 42, statusName: 'Mystery status' })
    ];

    it('splits into the five fixed columns plus a non-empty Other rail, with the real status_name kept on each row', () => {
      const columns = groupByColumn(rows);
      const byKey = new Map(columns.map(column => [column.key, column]));

      expect(columns.map(column => column.key)).toEqual(['editing', 'pending', 'submitted', 'approved', 'discontinued', 'other']);
      expect(byKey.get('editing')?.rows).toHaveLength(4);
      expect(byKey.get('pending')?.rows).toHaveLength(1);
      expect(byKey.get('submitted')?.rows).toHaveLength(2);
      expect(byKey.get('approved')?.rows).toHaveLength(4);
      expect(byKey.get('discontinued')?.rows).toHaveLength(2);
      expect(byKey.get('other')?.rows).toHaveLength(1);
      expect(byKey.get('other')?.rows[0].statusName).toBe('Mystery status');

      // Draft/Rejected keep their real chip even though they share a column with Editing/Discontinued.
      const draftRow = byKey.get('editing')?.rows.find(candidate => candidate.statusId === 8);
      expect(draftRow?.statusName).toBe('Draft');
      const rejectedRow = byKey.get('discontinued')?.rows.find(candidate => candidate.statusId === 7);
      expect(rejectedRow?.statusName).toBe('Rejected');
    });

    it('counts all merged and unmapped rows in the totals, equal to the number of rows loaded', () => {
      const result = totals(rows);
      expect(result).toEqual({ editing: 4, pending: 1, submitted: 2, approved: 4, discontinued: 2, other: 1, all: 14 });
    });

    it('keeps the five fixed columns in place even when a status has zero rows', () => {
      const noPending = rows.filter(candidate => candidate.statusId !== 5);
      const columns = groupByColumn(noPending);
      const pending = columns.find(column => column.key === 'pending');
      expect(pending).toBeDefined();
      expect(pending?.rows).toEqual([]);
    });

    it('omits the Other column entirely when nothing is unmapped', () => {
      const noUnmapped = rows.filter(candidate => candidate.statusId !== 42);
      const columns = groupByColumn(noUnmapped);
      expect(columns.some(column => column.key === 'other')).toBe(false);
    });

    it('computes badgeCount 4 under Mine and leaves it unchanged (null = no update) under All', () => {
      const columns = groupByColumn(rows);
      expect(badgeCount(columns, 'mine')).toBe(4);
      expect(badgeCount(columns, 'all')).toBeNull();
    });

    it('reports readyCount 1 for the Editing column (only the 5/5 row is ready, MWB-R-11)', () => {
      const editing = groupByColumn(rows).find(column => column.key === 'editing');
      expect(readyCount(editing?.rows ?? [])).toBe(1);
    });
  });

  describe('orderEditing() — MWB-R-5 (≥3 rows + one tie, per the task disqualifier)', () => {
    it('orders null first, then ascending ratio, ties broken by newest created first', () => {
      const ready = row({ statusId: 1, completeness: { complete: 5, total: 5, missing: [] }, created: '2026-02-01T00:00:00.000Z' });
      const highOlder = row({ statusId: 1, completeness: { complete: 4, total: 5, missing: ['evidences'] }, created: '2026-01-10T00:00:00.000Z' });
      const highNewer = row({ statusId: 1, completeness: { complete: 4, total: 5, missing: ['evidences'] }, created: '2026-01-20T00:00:00.000Z' });
      const noCompleteness = row({ statusId: 8, completeness: null, created: '2026-01-01T00:00:00.000Z' });

      const ordered = orderEditing([ready, highOlder, noCompleteness, highNewer]);

      expect(ordered.map(candidate => candidate.id)).toEqual([noCompleteness.id, highNewer.id, highOlder.id, ready.id]);
    });
  });

  describe('orderByCreatedDesc() — every non-Editing column', () => {
    it('orders newest created first', () => {
      const oldest = row({ created: '2026-01-01T00:00:00.000Z' });
      const middle = row({ created: '2026-02-01T00:00:00.000Z' });
      const newest = row({ created: '2026-03-01T00:00:00.000Z' });

      expect(orderByCreatedDesc([oldest, newest, middle]).map(candidate => candidate.id)).toEqual([newest.id, middle.id, oldest.id]);
    });
  });

  describe('filterByPhase()', () => {
    const reporting2026 = row({ phaseName: 'Reporting 2026' });
    const reporting2025 = row({ phaseName: 'Reporting 2025' });

    it('keeps only the rows whose phaseName matches the label', () => {
      expect(filterByPhase([reporting2026, reporting2025], 'Reporting 2025')).toEqual([reporting2025]);
    });

    it('passes every row through when the label is null/empty', () => {
      expect(filterByPhase([reporting2026, reporting2025], null)).toHaveLength(2);
      expect(filterByPhase([reporting2026, reporting2025], '')).toHaveLength(2);
    });
  });

  describe('resolveDefaultPhase() — design.md §6.6, three branches', () => {
    const options = ['Reporting 2026', 'Reporting 2025'];

    it('prefers the URL label when it names a loaded option', () => {
      expect(resolveDefaultPhase(options, 'Reporting 2025', 'Reporting 2026')).toBe('Reporting 2026');
    });

    it('falls back to the current reporting phase when the URL has none / an unknown one', () => {
      expect(resolveDefaultPhase(options, 'Reporting 2025', null)).toBe('Reporting 2025');
      expect(resolveDefaultPhase(options, 'Reporting 2025', 'Not Loaded')).toBe('Reporting 2025');
    });

    it('falls back to the newest option when neither the URL nor the current phase match', () => {
      expect(resolveDefaultPhase(options, null, null)).toBe('Reporting 2026');
      expect(resolveDefaultPhase(options, 'Unknown Phase', 'Also Unknown')).toBe('Reporting 2026');
    });

    it('returns null when there are no options at all', () => {
      expect(resolveDefaultPhase([], null, null)).toBeNull();
    });
  });
});
