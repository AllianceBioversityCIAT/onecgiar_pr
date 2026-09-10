import { PrGroupTableComponent } from './pr-group-table.component';

/**
 * PrGroupTableComponent is a pure state holder (no DI), so it is exercised
 * directly instead of through TestBed.
 */
describe('PrGroupTableComponent', () => {
  let table: PrGroupTableComponent;

  beforeEach(() => {
    table = new PrGroupTableComponent();
  });

  // ---------------------------------------------------------------- value input
  describe('value', () => {
    it('accepts an array and ignores anything else', () => {
      table.value = [{ key: 'a' }];
      expect(table.value).toEqual([{ key: 'a' }]);

      table.value = null;
      expect(table.value).toEqual([]);

      table.value = undefined;
      expect(table.value).toEqual([]);

      table.value = 42 as any;
      expect(table.value).toEqual([]);
    });

    it('snaps back to the first page when the new data is shorter', () => {
      table.paginator = true;
      table.rows = 2;
      table.value = [1, 2, 3, 4, 5];
      table.goToPage(2);
      expect(table.page()).toBe(2);

      table.value = [1];
      expect(table.page()).toBe(0);
    });
  });

  // ----------------------------------------------------------------- sort inputs
  describe('sort inputs', () => {
    it('sortField tolerates null and sortOrder is normalised', () => {
      table.sortField = null as any;
      expect(table.activeSortField()).toBe('');

      table.sortField = 'key';
      table.sortOrder = -1;
      expect(table.activeSortField()).toBe('key');
      expect(table.activeSortOrder()).toBe(-1);

      table.sortOrder = 0;
      expect(table.activeSortOrder()).toBe(1);
    });

    it('rows falls back to 0 for a non numeric value', () => {
      table.rows = 3;
      expect(table.effectiveRows()).toBe(3);

      table.rows = null as any;
      expect(table.effectiveRows()).toBe(0);
    });

    it('sort() ignores an empty field, toggles the same field and resets a new one', () => {
      table.sortField = 'key';
      table.sort('');
      expect(table.activeSortField()).toBe('key');

      table.sort('key');
      expect(table.activeSortOrder()).toBe(-1);
      table.sort('key');
      expect(table.activeSortOrder()).toBe(1);

      table.sort('other');
      expect(table.activeSortField()).toBe('other');
      expect(table.activeSortOrder()).toBe(1);
    });

    it('reset() restores the bound defaults', () => {
      table.sortField = 'key';
      table.sortOrder = -1;
      table.sort('other');
      table.reset();

      expect(table.activeSortField()).toBe('key');
      expect(table.activeSortOrder()).toBe(-1);
      expect(table.page()).toBe(0);
    });
  });

  // ----------------------------------------------------------------- first input
  describe('first', () => {
    it('jumps to the page holding the record, with the documented fallbacks', () => {
      table.paginator = true;
      table.rows = 5;
      table.first = 12;
      expect(table.page()).toBe(2);

      table.first = null;
      expect(table.page()).toBe(0);

      const fresh = new PrGroupTableComponent();
      fresh.first = 4;
      expect(fresh.page()).toBe(4);
    });
  });

  // -------------------------------------------------------------------- sorting
  describe('sorting', () => {
    it('keeps the source order when no sort field is set', () => {
      const rows = [{ key: 'B' }, { key: 'A' }];
      table.value = rows;
      expect(table.pagedValue()).toEqual(rows);
    });

    it('sorts ascending / descending and pushes nullish values to one end', () => {
      table.value = [{ key: 'B' }, { key: null }, { key: 'A' }, {}];
      table.sortField = 'key';
      table.sortOrder = 1;
      expect((table.pagedValue() as any[]).map(r => r.key)).toEqual([null, undefined, 'A', 'B']);

      table.sortOrder = -1;
      expect((table.pagedValue() as any[]).map(r => r.key)).toEqual(['B', 'A', null, undefined]);
    });

    it('resolves nested fields and null rows', () => {
      table.value = [{ meta: { key: 'B' } }, null, { meta: { key: 'A' } }];
      table.sortField = 'meta.key';
      table.sortOrder = 1;

      const sorted = table.pagedValue() as any[];
      expect(sorted[0]).toBeNull();
      expect(sorted[1].meta.key).toBe('A');
    });

    it('keeps equal values together', () => {
      table.value = [{ key: 'A' }, { key: 'A' }];
      table.sortField = 'key';
      expect(table.pagedValue()).toHaveLength(2);
    });
  });

  // ------------------------------------------------------------------ pagination
  describe('pagination', () => {
    beforeEach(() => {
      table.value = Array.from({ length: 5 }, (_v, i) => ({ key: `k${i}` }));
    });

    it('returns everything without a paginator or a page size', () => {
      expect(table.pagedValue()).toHaveLength(5);
      expect(table.lastPage()).toBe(0);

      table.paginator = true;
      expect(table.pagedValue()).toHaveLength(5);
      expect(table.lastPage()).toBe(0);
    });

    it('slices the current page and clamps goToPage', () => {
      table.paginator = true;
      table.rows = 2;
      expect(table.pagedValue()).toHaveLength(2);
      expect(table.lastPage()).toBe(2);
      expect(table.totalRecords()).toBe(5);

      table.goToPage(-1);
      expect(table.page()).toBe(0);
      table.goToPage(50);
      expect(table.page()).toBe(2);
      expect(table.pagedValue()).toHaveLength(1);
    });

    it('setPageSize overrides the bound rows', () => {
      table.paginator = true;
      table.rows = 2;
      table.goToPage(2);
      table.setPageSize(5);

      expect(table.effectiveRows()).toBe(5);
      expect(table.page()).toBe(0);
    });

    it('pageRangeLabel covers the empty and populated cases', () => {
      expect(table.pageRangeLabel()).toBe('0 of 5');

      table.paginator = true;
      table.rows = 2;
      expect(table.pageRangeLabel()).toBe('1 – 2 of 5');
      table.goToPage(2);
      expect(table.pageRangeLabel()).toBe('5 – 5 of 5');

      table.value = [];
      expect(table.pageRangeLabel()).toBe('0 of 0');
    });
  });

  // -------------------------------------------------------------------- grouping
  describe('group expansion', () => {
    it('keyField falls back from dataKey to groupRowsBy', () => {
      expect(table.keyField).toBe('');

      table.groupRowsBy = 'group';
      expect(table.keyField).toBe('group');

      table.dataKey = 'key';
      expect(table.keyField).toBe('key');
    });

    it('keyOf resolves plain, nested and unresolvable keys', () => {
      table.dataKey = 'key';
      expect(table.keyOf({ key: 'A' })).toBe('A');

      table.dataKey = 'meta.key';
      expect(table.keyOf({ meta: { key: 'B' } })).toBe('B');

      expect(table.keyOf(null)).toBe('null');

      table.dataKey = '';
      table.groupRowsBy = '';
      expect(table.keyOf({ key: 'A' })).toBe('null');
    });

    it('seeds the expansion from expandedRowKeys, keeping only truthy keys', () => {
      table.dataKey = 'key';
      table.expandedRowKeys = { A: true, B: false };

      expect(table.isExpanded('A')).toBe(true);
      expect(table.isExpanded('B')).toBe(false);

      table.expandedRowKeys = null;
      expect(table.isExpanded('A')).toBe(false);

      table.expandedRowKeys = undefined;
      expect(table.isExpanded('A')).toBe(false);
    });

    it('toggle adds and removes a group', () => {
      table.dataKey = 'key';
      const item = { key: 'A' };

      table.toggle(item);
      expect(table.isExpanded('A')).toBe(true);

      table.toggle(item);
      expect(table.isExpanded('A')).toBe(false);
    });
  });

  it('exposes the API-parity inputs without side effects', () => {
    table.rowsPerPageOptions = [10, 20];
    table.styleClass = 'grouped';
    table.loading = true;

    expect(table.rowsPerPageOptions).toEqual([10, 20]);
    expect(table.styleClass).toBe('grouped');
    expect(table.loading).toBe(true);
  });
});
