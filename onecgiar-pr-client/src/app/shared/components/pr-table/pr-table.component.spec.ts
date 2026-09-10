import { PrTableComponent } from './pr-table.component';

/**
 * PrTableComponent is a pure state holder (no DI, no template logic in the class),
 * so it is exercised directly instead of through TestBed.
 */
describe('PrTableComponent', () => {
  let table: PrTableComponent;

  beforeEach(() => {
    table = new PrTableComponent();
  });

  // ---------------------------------------------------------------- value input
  describe('value', () => {
    it('accepts an array and ignores anything else', () => {
      table.value = [{ a: 1 }];
      expect(table.value).toEqual([{ a: 1 }]);

      table.value = null;
      expect(table.value).toEqual([]);

      table.value = undefined;
      expect(table.value).toEqual([]);

      table.value = 'nope' as any;
      expect(table.value).toEqual([]);
    });

    it('snaps back to the first page when the new data is shorter', () => {
      table.paginator = true;
      table.rows = 2;
      table.value = [1, 2, 3, 4, 5];
      table.goToPage(2);
      expect(table.page()).toBe(2);

      table.value = [1, 2];
      expect(table.page()).toBe(0);
    });

    it('keeps the current page when the data still covers it', () => {
      table.paginator = true;
      table.rows = 2;
      table.value = [1, 2, 3, 4, 5, 6];
      table.goToPage(1);
      table.value = [1, 2, 3, 4, 5, 6, 7];
      expect(table.page()).toBe(1);
    });
  });

  // ----------------------------------------------------------------- sort inputs
  describe('sort inputs', () => {
    it('sortField tolerates null', () => {
      table.sortField = null as any;
      expect(table.activeSortField()).toBe('');

      table.sortField = 'code';
      expect(table.activeSortField()).toBe('code');
    });

    it('sortOrder only accepts 1 or -1', () => {
      table.sortOrder = -1;
      expect(table.activeSortOrder()).toBe(-1);

      table.sortOrder = 1;
      expect(table.activeSortOrder()).toBe(1);

      table.sortOrder = 7;
      expect(table.activeSortOrder()).toBe(1);
    });

    it('rows falls back to 0 for a non numeric value', () => {
      table.rows = 5;
      expect(table.effectiveRows()).toBe(5);

      table.rows = 'x' as any;
      expect(table.effectiveRows()).toBe(0);
    });
  });

  // ----------------------------------------------------------------- first input
  describe('first', () => {
    it('jumps to the page holding the given record index', () => {
      table.paginator = true;
      table.rows = 5;
      table.value = Array.from({ length: 20 }, (_v, i) => i);

      table.first = 12;
      expect(table.page()).toBe(2);
    });

    it('treats a null / non numeric first as page 0', () => {
      table.rows = 5;
      table.first = null;
      expect(table.page()).toBe(0);

      table.first = 'abc';
      expect(table.page()).toBe(0);
    });

    it('falls back to a page size of 1 when no rows are configured', () => {
      table.first = 3;
      expect(table.page()).toBe(3);
    });

    it('uses the page-size override when one is set', () => {
      table.setPageSize(4);
      table.first = 9;
      expect(table.page()).toBe(2);
    });
  });

  // -------------------------------------------------------------------- sorting
  describe('sorting', () => {
    const rows = [{ code: 'B' }, { code: 'A' }, { code: 'C' }];

    it('keeps the source order when there is no sort field', () => {
      table.value = rows;
      expect(table.pagedValue()).toEqual(rows);
    });

    it('sorts ascending and descending', () => {
      table.value = rows;
      table.sortField = 'code';
      table.sortOrder = 1;
      expect((table.pagedValue() as any[]).map(r => r.code)).toEqual(['A', 'B', 'C']);

      table.sortOrder = -1;
      expect((table.pagedValue() as any[]).map(r => r.code)).toEqual(['C', 'B', 'A']);
    });

    it('pushes nullish values to one end and keeps equal values stable', () => {
      table.value = [{ code: 'B' }, { code: null }, { code: 'B' }, {}];
      table.sortField = 'code';
      table.sortOrder = 1;

      const codes = (table.pagedValue() as any[]).map(r => r.code);
      expect(codes.slice(0, 2)).toEqual([null, undefined]);
      expect(codes.slice(2)).toEqual(['B', 'B']);
    });

    it('resolves nested fields and null rows', () => {
      table.value = [{ meta: { code: 'B' } }, null, { meta: null }, { meta: { code: 'A' } }];
      table.sortField = 'meta.code';
      table.sortOrder = 1;

      const sorted = table.pagedValue() as any[];
      expect(sorted[sorted.length - 1].meta.code).toBe('B');
      expect(sorted[sorted.length - 2].meta.code).toBe('A');
    });

    it('sort() ignores an empty field, toggles the same field and resets a new one', () => {
      table.value = rows;
      table.sortField = 'code';
      table.sortOrder = 1;

      table.sort('');
      expect(table.activeSortField()).toBe('code');

      table.sort('code');
      expect(table.activeSortOrder()).toBe(-1);
      table.sort('code');
      expect(table.activeSortOrder()).toBe(1);

      table.sort('name');
      expect(table.activeSortField()).toBe('name');
      expect(table.activeSortOrder()).toBe(1);
      expect(table.page()).toBe(0);
    });

    it('reset() restores the bound defaults', () => {
      table.sortField = 'code';
      table.sortOrder = -1;
      table.sort('name');
      table.paginator = true;
      table.rows = 1;
      table.value = [1, 2, 3];
      table.goToPage(2);

      table.reset();
      expect(table.activeSortField()).toBe('code');
      expect(table.activeSortOrder()).toBe(-1);
      expect(table.page()).toBe(0);
    });
  });

  // ------------------------------------------------------------------ pagination
  describe('pagination', () => {
    beforeEach(() => {
      table.value = Array.from({ length: 7 }, (_v, i) => ({ i }));
    });

    it('returns everything when the paginator is off', () => {
      expect(table.pagedValue()).toHaveLength(7);
      expect(table.lastPage()).toBe(0);
      expect(table.totalRecords()).toBe(7);
    });

    it('returns everything when the paginator is on but no page size is set', () => {
      table.paginator = true;
      expect(table.pagedValue()).toHaveLength(7);
      expect(table.lastPage()).toBe(0);
    });

    it('slices the current page', () => {
      table.paginator = true;
      table.rows = 3;
      expect(table.pagedValue()).toHaveLength(3);
      expect(table.lastPage()).toBe(2);

      table.goToPage(2);
      expect(table.pagedValue()).toHaveLength(1);
    });

    it('goToPage clamps to the available range', () => {
      table.paginator = true;
      table.rows = 3;

      table.goToPage(-4);
      expect(table.page()).toBe(0);

      table.goToPage(99);
      expect(table.page()).toBe(2);
    });

    it('setPageSize overrides the bound rows and returns to page 0', () => {
      table.paginator = true;
      table.rows = 3;
      table.goToPage(2);

      table.setPageSize(5);
      expect(table.effectiveRows()).toBe(5);
      expect(table.page()).toBe(0);
      expect(table.pagedValue()).toHaveLength(5);
    });
  });

  // -------------------------------------------------------------- pageRangeLabel
  describe('pageRangeLabel', () => {
    it('reports zero when there is no page size or no data', () => {
      table.value = [1, 2, 3];
      expect(table.pageRangeLabel()).toBe('0 of 3');

      table.rows = 5;
      table.value = [];
      expect(table.pageRangeLabel()).toBe('0 of 0');
    });

    it('reports the current window', () => {
      table.paginator = true;
      table.rows = 3;
      table.value = Array.from({ length: 7 }, (_v, i) => i);
      expect(table.pageRangeLabel()).toBe('1 – 3 of 7');

      table.goToPage(2);
      expect(table.pageRangeLabel()).toBe('7 – 7 of 7');
    });
  });

  it('exposes the API-parity inputs without side effects', () => {
    table.rowsPerPageOptions = [5, 10];
    table.styleClass = 'my-table';
    table.selectionMode = 'single';
    table.loading = true;
    table.dataKey = 'id';
    table.scrollable = true;
    table.scrollHeight = 'calc(100vh - 300px)';

    expect(table.rowsPerPageOptions).toEqual([5, 10]);
    expect(table.styleClass).toBe('my-table');
    expect(table.selectionMode).toBe('single');
    expect(table.loading).toBe(true);
    expect(table.dataKey).toBe('id');
    expect(table.scrollable).toBe(true);
    expect(table.scrollHeight).toBe('calc(100vh - 300px)');
  });
});
