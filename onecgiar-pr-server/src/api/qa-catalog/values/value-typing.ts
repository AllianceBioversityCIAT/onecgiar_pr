// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-9 / QRF-R-7: the value a catalog field type puts on the wire, from what the MySQL driver returns.
// tinyint -> boolean, DECIMAL string -> number, DATETIME -> ISO-8601 UTC, DATE -> YYYY-MM-DD; no stored value -> null.
import { CatalogFieldType } from '../definitions/types';
import { Temporal } from './table-metadata';

/** Field types whose value is one scalar read from one cell. */
export type ScalarFieldType = Extract<
  CatalogFieldType,
  'text' | 'number' | 'boolean' | 'date' | 'single_select'
>;

const SCALAR_TYPES: ReadonlySet<string> = new Set([
  'text',
  'number',
  'boolean',
  'date',
  'single_select',
]);

export function isScalarType(type: CatalogFieldType): type is ScalarFieldType {
  return SCALAR_TYPES.has(type);
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/**
 * The driver builds a `Date` from the stored wall-clock text in the process time zone (TypeORM `timezone: 'local'`),
 * so its LOCAL components are the stored text. The database runs in UTC, so that wall clock is UTC: the components are
 * re-read as UTC and the result does not depend on the time zone of the process.
 */
function wallClock(d: Date) {
  return {
    y: d.getFullYear(),
    mo: d.getMonth() + 1,
    d: d.getDate(),
    h: d.getHours(),
    mi: d.getMinutes(),
    s: d.getSeconds(),
    ms: d.getMilliseconds(),
  };
}

function formatTemporal(
  c: ReturnType<typeof wallClock>,
  temporal: Temporal,
): string {
  const date = `${pad(c.y, 4)}-${pad(c.mo)}-${pad(c.d)}`;
  if (temporal === 'date') return date;
  return `${date}T${pad(c.h)}:${pad(c.mi)}:${pad(c.s)}.${pad(c.ms, 3)}Z`;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/;

function toDate(raw: unknown, temporal: Temporal): string | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime())
      ? null
      : formatTemporal(wallClock(raw), temporal);
  }
  if (typeof raw !== 'string') return null;
  const dateOnly = DATE_ONLY.exec(raw);
  if (dateOnly) {
    return formatTemporal(
      {
        y: +dateOnly[1],
        mo: +dateOnly[2],
        d: +dateOnly[3],
        h: 0,
        mi: 0,
        s: 0,
        ms: 0,
      },
      temporal,
    );
  }
  const dateTime = DATE_TIME.exec(raw);
  if (dateTime) {
    return formatTemporal(
      {
        y: +dateTime[1],
        mo: +dateTime[2],
        d: +dateTime[3],
        h: +dateTime[4],
        mi: +dateTime[5],
        s: +dateTime[6],
        ms: dateTime[7] ? +dateTime[7].padEnd(3, '0').slice(0, 3) : 0,
      },
      temporal,
    );
  }
  const parsed = new Date(raw); // an ISO string that carries its own zone
  return Number.isNaN(parsed.getTime())
    ? null
    : temporal === 'date'
      ? parsed.toISOString().slice(0, 10)
      : parsed.toISOString();
}

function toText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') return raw;
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  if (raw instanceof Date) return toDate(raw, 'datetime');
  return String(raw);
}

function toNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toBoolean(raw: unknown): boolean | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return Number.isNaN(raw) ? null : raw !== 0;
  if (typeof raw === 'bigint') return raw !== BigInt(0);
  if (Buffer.isBuffer(raw)) return raw.length > 0 ? raw[0] !== 0 : null; // BIT(1)
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    if (v === '1' || v === 'true') return true;
    if (v === '0' || v === 'false') return false;
  }
  return null;
}

/** An option id: the stored id as is (number or string), never reinterpreted. */
function toOption(raw: unknown): string | number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number' || typeof raw === 'string') return raw;
  if (typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  return null;
}

export interface TypingHint {
  /** Storage kind of a `date` field's column (default `datetime`). */
  temporal?: Temporal;
}

/** The wire value of one cell for a scalar field type; `null` is "no stored value". */
export function typeScalar(
  type: ScalarFieldType,
  raw: unknown,
  hint: TypingHint = {},
): string | number | boolean | null {
  switch (type) {
    case 'text':
      return toText(raw);
    case 'number':
      return toNumber(raw);
    case 'boolean':
      return toBoolean(raw);
    case 'date':
      return toDate(raw, hint.temporal ?? 'datetime');
    case 'single_select':
      return toOption(raw);
  }
}

/**
 * What a field with no stored value holds (QRF-R-7): `[]` for `multi_select` / `list`, `null` for the rest —
 * present, never omitted.
 */
export function emptyValue(type: CatalogFieldType): null | [] {
  return type === 'multi_select' || type === 'list' ? [] : null;
}
