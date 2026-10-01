import { BadRequestException } from '@nestjs/common';
import { LessThan } from 'typeorm';
import {
  KEYSET_PAGE_SIZE,
  applyKeysetCursor,
  decodeCursor,
  encodeCursor,
  mergeKeysetLists,
  sliceKeysetPage,
} from './keyset-cursor.util';

interface Row {
  id: number;
  date: Date;
}

const fields = { dateField: 'date', idField: 'id' };

/** 450 rows, newest first; rows at positions 199..202 (0-based 198..201) share one timestamp. */
const buildRows = (): Row[] => {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0);
  const rows: Row[] = [];
  for (let n = 0; n < 450; n++) {
    const isTie = n >= 198 && n <= 201;
    const ts = isTie ? base - 198 * 1000 : base - n * 1000;
    rows.push({ id: 10000 - n, date: new Date(ts) });
  }
  return rows;
};

/** In-memory emulation of the keyset where produced by applyKeysetCursor (single entry, no extra keys). */
const fetchPage = (all: Row[], cursor: string | undefined, take: number) => {
  const where = applyKeysetCursor<Record<string, unknown>>(
    { is_active: true },
    cursor,
    fields,
  ) as Record<string, any>[];
  const matches = (r: Row) =>
    where.some((w) => {
      const d = w.date;
      if (d instanceof Date) {
        return r.date.getTime() === d.getTime() && r.id < w.id.value;
      }
      return r.date.getTime() < d.value.getTime();
    });
  const filtered = cursor ? all.filter(matches) : all;
  return filtered.slice(0, take);
};

describe('keyset-cursor.util', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('round-trips (date, id) through an opaque base64url string', () => {
      const date = new Date('2026-03-04T05:06:07.089Z');
      const cursor = encodeCursor(date, 4321);
      expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(cursor).not.toContain('4321');
      const decoded = decodeCursor(cursor);
      expect(decoded.date.toISOString()).toBe('2026-03-04T05:06:07.089Z');
      expect(decoded.id).toBe(4321);
    });

    it('encodes the documented literal <ISO date>|<id> as base64url', () => {
      expect(encodeCursor(new Date('2026-01-01T00:00:00.000Z'), 7)).toBe(
        Buffer.from('2026-01-01T00:00:00.000Z|7').toString('base64url'),
      );
    });

    it.each([
      ['plain text', 'abc'],
      ['empty', ''],
      ['non-base64url characters', 'a+b/c=='],
      [
        'wrong date',
        Buffer.from('2026-13-45T00:00:00.000Z|5').toString('base64url'),
      ],
      ['not a date', Buffer.from('yesterday|5').toString('base64url')],
      [
        'non-numeric id',
        Buffer.from('2026-01-01T00:00:00.000Z|abc').toString('base64url'),
      ],
      [
        'negative id',
        Buffer.from('2026-01-01T00:00:00.000Z|-5').toString('base64url'),
      ],
      [
        'decimal id',
        Buffer.from('2026-01-01T00:00:00.000Z|5.5').toString('base64url'),
      ],
      [
        'missing separator',
        Buffer.from('2026-01-01T00:00:00.000Z').toString('base64url'),
      ],
      ['oversized', 'A'.repeat(500)],
    ])('rejects malformed cursor (%s) with a 400', (_label, bad) => {
      expect(() => decodeCursor(bad)).toThrow(BadRequestException);
    });

    it('rejects non-string cursors with a 400', () => {
      expect(() => decodeCursor(undefined as any)).toThrow(BadRequestException);
      expect(() => decodeCursor(12 as any)).toThrow(BadRequestException);
    });

    it('does not leak the cursor value in the error message', () => {
      try {
        decodeCursor('abc');
        fail('should have thrown');
      } catch (e) {
        expect(
          JSON.stringify((e as BadRequestException).getResponse()),
        ).not.toContain('abc');
      }
    });
  });

  describe('applyKeysetCursor', () => {
    const cursor = encodeCursor(new Date('2026-01-01T00:00:00.000Z'), 50);

    it('returns the where untouched (as an array) when there is no cursor', () => {
      expect(applyKeysetCursor({ a: 1 }, undefined, fields)).toEqual([
        { a: 1 },
      ]);
      expect(applyKeysetCursor([{ a: 1 }, { b: 2 }], null, fields)).toEqual([
        { a: 1 },
        { b: 2 },
      ]);
      expect(applyKeysetCursor(undefined, undefined, fields)).toEqual([{}]);
    });

    it('expands one object into two entries: date < d | date = d AND id < i', () => {
      const out = applyKeysetCursor<Record<string, unknown>>(
        { a: 1 },
        cursor,
        fields,
      );
      expect(out).toHaveLength(2);
      expect(out[0]).toEqual({
        a: 1,
        date: LessThan(new Date('2026-01-01T00:00:00.000Z')),
      });
      expect(out[1]).toEqual({
        a: 1,
        date: new Date('2026-01-01T00:00:00.000Z'),
        id: LessThan(50),
      });
    });

    it('ANDs the keyset with every entry of an array where (2 entries -> 4)', () => {
      const out = applyKeysetCursor<Record<string, unknown>>(
        [{ a: 1 }, { b: 2 }],
        cursor,
        fields,
      );
      expect(out).toHaveLength(4);
      expect(out.filter((w) => 'a' in w)).toHaveLength(2);
      expect(out.filter((w) => 'b' in w)).toHaveLength(2);
    });

    it('preserves nested objects such as obj_result without mutating the input', () => {
      const entry = { obj_result: { version_id: 7, is_active: true }, x: 1 };
      const out = applyKeysetCursor<Record<string, unknown>>(
        entry,
        cursor,
        fields,
      );
      expect(out[0].obj_result).toEqual({ version_id: 7, is_active: true });
      expect(out[1].obj_result).toEqual({ version_id: 7, is_active: true });
      expect(entry).toEqual({
        obj_result: { version_id: 7, is_active: true },
        x: 1,
      });
    });

    it('uses an empty where as a single empty entry before expanding', () => {
      expect(
        applyKeysetCursor<Record<string, unknown>>(undefined, cursor, fields),
      ).toHaveLength(2);
      expect(
        applyKeysetCursor<Record<string, unknown>>([], cursor, fields),
      ).toHaveLength(2);
    });

    it('throws a 400 for a malformed cursor', () => {
      expect(() => applyKeysetCursor({}, 'abc', fields)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('sliceKeysetPage', () => {
    it('exposes the fixed page size 200', () => {
      expect(KEYSET_PAGE_SIZE).toBe(200);
    });

    it('returns everything and hasMore=false when rows <= 200', () => {
      const rows = buildRows().slice(0, 200);
      const page = sliceKeysetPage(rows, fields);
      expect(page.rows).toHaveLength(200);
      expect(page.hasMore).toBe(false);
    });

    it('cuts a 201-row fetch to 200, hasMore=true, nextCursor = last returned row', () => {
      const rows = buildRows().slice(0, 201);
      const page = sliceKeysetPage(rows, fields);
      expect(page.rows).toHaveLength(200);
      expect(page.hasMore).toBe(true);
      const last = page.rows[199];
      expect(decodeCursor(page.nextCursor).id).toBe(last.id);
      expect(decodeCursor(page.nextCursor).date.getTime()).toBe(
        last.date.getTime(),
      );
    });

    it('returns null cursor for an empty fetch', () => {
      expect(sliceKeysetPage([], fields)).toEqual({
        rows: [],
        hasMore: false,
        nextCursor: null,
      });
    });

    it('accepts string dates on rows (raw query results)', () => {
      const page = sliceKeysetPage(
        [{ id: 3, date: '2026-01-01T00:00:00.000Z' }],
        fields,
      );
      expect(decodeCursor(page.nextCursor).id).toBe(3);
    });
  });

  describe('paging 450 rows with a tie on the timestamp (PAGE-AC-3)', () => {
    it('yields 200/200/50 with 450 distinct ids, no duplicates or gaps', () => {
      const all = buildRows();
      // sanity: the tie really exists at rows 199..202 (1-based)
      expect(
        new Set(all.slice(198, 202).map((r) => r.date.getTime())).size,
      ).toBe(1);

      const sizes: number[] = [];
      const seen: number[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      let guard = 0;
      while (hasMore && guard++ < 10) {
        const fetched = fetchPage(all, cursor, KEYSET_PAGE_SIZE + 1);
        const page = sliceKeysetPage(fetched, fields);
        sizes.push(page.rows.length);
        seen.push(...page.rows.map((r) => r.id));
        hasMore = page.hasMore;
        cursor = page.nextCursor ?? undefined;
      }
      expect(sizes).toEqual([200, 200, 50]);
      expect(seen).toHaveLength(450);
      expect(new Set(seen).size).toBe(450);
      expect(new Set(seen)).toEqual(new Set(all.map((r) => r.id)));
    });
  });

  describe('mergeKeysetLists', () => {
    const mk = (id: number, sec: number): Row => ({
      id,
      date: new Date(Date.UTC(2026, 0, 1, 0, 0, sec)),
    });

    it('merges, sorts (date DESC, id DESC) and cuts to the page size', () => {
      const a = [mk(5, 30), mk(3, 10)];
      const b = [mk(9, 30), mk(4, 20)];
      const page = mergeKeysetLists([a, b], fields, 3);
      expect(page.rows.map((r) => r.id)).toEqual([9, 5, 4]);
      expect(page.hasMore).toBe(true); // merged 4 > 3
      expect(decodeCursor(page.nextCursor).id).toBe(4);
    });

    it('hasMore=false when merged <= page size and no list is saturated', () => {
      const page = mergeKeysetLists([[mk(1, 1)], [mk(2, 2)]], fields, 3);
      expect(page.rows.map((r) => r.id)).toEqual([2, 1]);
      expect(page.hasMore).toBe(false);
    });

    it('hasMore=true when any sub-list returned pageSize+1 rows', () => {
      const big = Array.from({ length: 4 }, (_, i) => mk(100 - i, 50 - i));
      const page = mergeKeysetLists([big, []], fields, 3);
      expect(page.rows).toHaveLength(3);
      expect(page.hasMore).toBe(true);
    });

    it('hasMore=true if a sub-list is saturated even when merged rows equal the page size', () => {
      // one list has 4 (=3+1) rows, merged is 4 -> cut to 3
      const page = mergeKeysetLists(
        [[mk(4, 4), mk(3, 3), mk(2, 2), mk(1, 1)]],
        fields,
        3,
      );
      expect(page.hasMore).toBe(true);
    });

    it('defaults to page size 200 and tolerates empty lists', () => {
      expect(mergeKeysetLists([[], []], fields)).toEqual({
        rows: [],
        hasMore: false,
        nextCursor: null,
      });
    });

    it('paging through 3 lists with a cross-list tie gives no duplicates or gaps', () => {
      const pageSize = 5;
      const all: Row[] = [];
      const listA: Row[] = [];
      const listB: Row[] = [];
      const listC: Row[] = [];
      for (let i = 0; i < 23; i++) {
        const row = mk(1000 - i, 100 - Math.floor(i / 3)); // groups of 3 share a timestamp
        all.push(row);
        [listA, listB, listC][i % 3].push(row);
      }
      const fetch = (list: Row[], cursor?: string) => {
        const lt = cursor ? decodeCursor(cursor) : null;
        return list
          .filter(
            (r) =>
              !lt ||
              r.date < lt.date ||
              (r.date.getTime() === lt.date.getTime() && r.id < lt.id),
          )
          .slice(0, pageSize + 1);
      };
      const seen: number[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      let guard = 0;
      while (hasMore && guard++ < 20) {
        const page = mergeKeysetLists(
          [fetch(listA, cursor), fetch(listB, cursor), fetch(listC, cursor)],
          fields,
          pageSize,
        );
        seen.push(...page.rows.map((r) => r.id));
        hasMore = page.hasMore;
        cursor = page.nextCursor ?? undefined;
      }
      expect(seen).toEqual(all.map((r) => r.id));
    });
  });
});
