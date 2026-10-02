import { BadRequestException } from '@nestjs/common';
import { FindOptionsWhere, LessThan } from 'typeorm';

/**
 * Keyset (a.k.a. seek) pagination helpers ordered by `(date DESC, id DESC)`.
 * Pure functions: no DB, no logging. Cursor values are never logged or echoed
 * in error messages (.cursorrules).
 */

/** Fixed, server-owned page size (PAGE-DD-2). Callers fetch `KEYSET_PAGE_SIZE + 1` rows. */
export const KEYSET_PAGE_SIZE = 200;

const MAX_CURSOR_LENGTH = 128;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const CURSOR_PAYLOAD_RE =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\|(\d{1,15})$/;
const INVALID_CURSOR_MESSAGE = 'Invalid cursor';

export interface KeysetFields {
  /** Entity property holding the ordering date (e.g. `requested_date`, `created_date`). */
  dateField: string;
  /** Entity property holding the tie-breaker id (e.g. `share_result_request_id`). */
  idField: string;
}

export interface KeysetCursor {
  date: Date;
  id: number;
}

export interface KeysetPage<T> {
  rows: T[];
  hasMore: boolean;
  /** Opaque cursor of the last returned row; `null` when there are no rows. */
  nextCursor: string | null;
}

/** Opaque cursor: base64url of `<ISO date>|<id>`. */
export const encodeCursor = (date: Date | string, id: number): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime()) || !Number.isSafeInteger(Number(id))) {
    throw new Error('Cannot encode keyset cursor from invalid row values');
  }
  return Buffer.from(`${d.toISOString()}|${Number(id)}`, 'utf8').toString(
    'base64url',
  );
};

/** Decodes and strictly validates a cursor. Malformed input -> `BadRequestException` (HTTP 400). */
export const decodeCursor = (cursor: string): KeysetCursor => {
  const invalid = () => new BadRequestException(INVALID_CURSOR_MESSAGE);
  if (
    typeof cursor !== 'string' ||
    !cursor.length ||
    cursor.length > MAX_CURSOR_LENGTH ||
    !BASE64URL_RE.test(cursor)
  ) {
    throw invalid();
  }
  const payload = Buffer.from(cursor, 'base64url').toString('utf8');
  const match = CURSOR_PAYLOAD_RE.exec(payload);
  if (!match) throw invalid();
  const date = new Date(match[1]);
  const id = Number(match[2]);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString() !== match[1] ||
    !Number.isSafeInteger(id)
  ) {
    throw invalid();
  }
  return { date, id };
};

/**
 * Expands a TypeORM `where` (object or array of objects) into the keyset OR:
 * `date < d` | `date = d AND id < i`, ANDed with every existing entry
 * (N entries -> 2N). Entries are spread, so nested keys (e.g. `obj_result`)
 * are preserved and inputs are never mutated. Without a cursor the where is
 * returned as an array unchanged.
 *
 * Assumption: entries do not already constrain `dateField`/`idField`
 * (the keyset keys would override them).
 */
export const applyKeysetCursor = <T extends object = Record<string, unknown>>(
  where: T | T[] | undefined | null,
  cursor: string | undefined | null,
  fields: KeysetFields,
): FindOptionsWhere<any>[] => {
  const base: T[] = Array.isArray(where)
    ? where.length
      ? where
      : [{} as T]
    : [(where ?? {}) as T];
  if (cursor === undefined || cursor === null || cursor === '') {
    return base as FindOptionsWhere<any>[];
  }
  const { date, id } = decodeCursor(cursor);
  const out: FindOptionsWhere<any>[] = [];
  for (const entry of base) {
    out.push({ ...entry, [fields.dateField]: LessThan(date) });
    out.push({
      ...entry,
      [fields.dateField]: date,
      [fields.idField]: LessThan(id),
    });
  }
  return out;
};

const rowKey = (row: any, fields: KeysetFields): [number, number] => [
  new Date(row[fields.dateField]).getTime(),
  Number(row[fields.idField]),
];

const buildPage = <T>(
  rows: T[],
  hasMore: boolean,
  fields: KeysetFields,
): KeysetPage<T> => {
  const last: any = rows[rows.length - 1];
  return {
    rows,
    hasMore,
    nextCursor: last
      ? encodeCursor(last[fields.dateField], last[fields.idField])
      : null,
  };
};

/**
 * Slices a fetch of up to `pageSize + 1` rows into a page. `hasMore` is true
 * when more than `pageSize` rows came back; `nextCursor` is the last returned row.
 */
export const sliceKeysetPage = <T>(
  fetched: T[],
  fields: KeysetFields,
  pageSize: number = KEYSET_PAGE_SIZE,
): KeysetPage<T> => {
  const list = fetched ?? [];
  return buildPage(list.slice(0, pageSize), list.length > pageSize, fields);
};

/**
 * Merges several already-fetched lists (each fetched with the same cursor and
 * `take = pageSize + 1`), sorts `(date DESC, id DESC)` and cuts to `pageSize`.
 * `hasMore` = merged > pageSize OR any list came back with more than `pageSize`.
 */
export const mergeKeysetLists = <T>(
  lists: T[][],
  fields: KeysetFields,
  pageSize: number = KEYSET_PAGE_SIZE,
): KeysetPage<T> => {
  const safe = (lists ?? []).map((l) => l ?? []);
  const merged = safe.flat().sort((a, b) => {
    const [da, ia] = rowKey(a, fields);
    const [db, ib] = rowKey(b, fields);
    return db - da || ib - ia;
  });
  const hasMore =
    merged.length > pageSize || safe.some((l) => l.length > pageSize);
  return buildPage(merged.slice(0, pageSize), hasMore, fields);
};
