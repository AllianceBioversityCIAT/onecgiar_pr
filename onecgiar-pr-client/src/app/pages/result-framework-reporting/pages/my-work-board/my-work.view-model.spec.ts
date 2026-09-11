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
      expect(columnForStatus(2)).toBe('inQa');
      expect(columnForStatus(6)).toBe('approved');
      expect(columnForStatus(4)).toBe('discontinued');
      expect(columnForStatus(7)).toBe('rejected');
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
    it('is the fixed order with the right group ids', () => {
      expect(MY_WORK_COLUMN_DEFS.map(def => [def.key, def.group])).toEqual([
        ['editing', 'action'],
        ['pending', 'waiting'],
        ['submitted', 'waiting'],
        ['inQa', 'done'],
        ['approved', 'done'],
        ['discontinued', 'closed'],
        ['rejected', 'closed'],
        ['other', 'closed']
      ]);
    });

    it('labels columns to match Overview W1/W2 + W3 status meters', () => {
      expect(MY_WORK_COLUMN_DEFS.map(def => [def.key, def.label])).toEqual([
        ['editing', 'Editing'],
        ['pending', 'Pending review'],
        ['submitted', 'Submitted'],
        ['inQa', 'In QA'],
        ['approved', 'Approved'],
        ['discontinued', 'Discontinued'],
        ['rejected', 'Rejected'],
        ['other', 'Other']
      ]);
    });
  });

  describe('groupByColumn() + totals() — MWB-R-2 (14-row canonical fixture)', () => {
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

    it('splits into the seven fixed columns plus a non-empty Other rail', () => {
      const columns = groupByColumn(rows);
      const byKey = new Map(columns.map(column => [column.key, column]));

      expect(columns.map(column => column.key)).toEqual([
        'editing',
        'pending',
        'submitted',
        'inQa',
        'approved',
        'discontinued',
        'rejected',
        'other'
      ]);
      expect(byKey.get('inQa')?.rows).toHaveLength(3);
      expect(byKey.get('approved')?.rows).toHaveLength(1);
      expect(byKey.get('discontinued')?.rows).toHaveLength(1);
      expect(byKey.get('rejected')?.rows).toHaveLength(1);
    });

    it('counts all rows in the totals', () => {
      expect(totals(rows)).toEqual({
        editing: 4,
        pending: 1,
        submitted: 2,
        inQa: 3,
        approved: 1,
        discontinued: 1,
        rejected: 1,
        other: 1,
        all: 14
      });
    });

    it('computes badgeCount 4 under Mine and leaves it unchanged under All', () => {
      const columns = groupByColumn(rows);
      expect(badgeCount(columns, 'mine')).toBe(4);
      expect(badgeCount(columns, 'all')).toBeNull();
    });

    it('reports readyCount 1 for the Editing column', () => {
      const editing = groupByColumn(rows).find(column => column.key === 'editing');
      expect(readyCount(editing?.rows ?? [])).toBe(1);
    });
  });

  describe('orderEditing()', () => {
    it('orders null first, then ascending ratio, ties broken by newest created first', () => {
      const ready = row({ statusId: 1, completeness: { complete: 5, total: 5, missing: [] }, created: '2026-02-01T00:00:00.000Z' });
      const highOlder = row({ statusId: 1, completeness: { complete: 4, total: 5, missing: ['evidences'] }, created: '2026-01-10T00:00:00.000Z' });
      const highNewer = row({ statusId: 1, completeness: { complete: 4, total: 5, missing: ['evidences'] }, created: '2026-01-20T00:00:00.000Z' });
      const noCompleteness = row({ statusId: 8, completeness: null, created: '2026-01-01T00:00:00.000Z' });

      const ordered = orderEditing([ready, highOlder, noCompleteness, highNewer]);
      expect(ordered.map(candidate => candidate.id)).toEqual([noCompleteness.id, highNewer.id, highOlder.id, ready.id]);
    });
  });

  describe('orderByCreatedDesc()', () => {
    it('orders newest created first', () => {
      const oldest = row({ created: '2026-01-01T00:00:00.000Z' });
      const middle = row({ created: '2026-02-01T00:00:00.000Z' });
      const newest = row({ created: '2026-03-01T00:00:00.000Z' });
      expect(orderByCreatedDesc([oldest, newest, middle]).map(candidate => candidate.id)).toEqual([newest.id, middle.id, oldest.id]);
    });
  });

  describe('filterByPhase()', () => {
    it('keeps only the rows whose phaseName matches the label', () => {
      const reporting2026 = row({ phaseName: 'Reporting 2026' });
      const reporting2025 = row({ phaseName: 'Reporting 2025' });
      expect(filterByPhase([reporting2026, reporting2025], 'Reporting 2025')).toEqual([reporting2025]);
    });
  });

  describe('resolveDefaultPhase()', () => {
    const options = ['Reporting 2026', 'Reporting 2025'];

    it('prefers the URL label when it names a loaded option', () => {
      expect(resolveDefaultPhase(options, 'Reporting 2025', 'Reporting 2026')).toBe('Reporting 2026');
    });

    it('returns null when there are no options at all', () => {
      expect(resolveDefaultPhase([], null, null)).toBeNull();
    });
  });
});
