// @akili-spec changes/portfolio-typology-bar-chart (TBC-T-2, design 6.3, TBC-DD-3)
//
// Pure click resolver of the typology bar chart. One resolver for the mouse (echarts `click`) and for the
// keyboard (table actions emit the same payload through `chartClick`), so the two paths cannot drift.
import { EMPTY_SELECTION, type PortfolioFilterSelection } from '../../services/portfolio-filters';
import { PORTFOLIO_STATUS_SLOTS } from '../../services/portfolio-status-slot';
import type { StatusBucket } from './typology.aggregate';

export type TypologyBucket = StatusBucket;

/**
 * The subset of the wrapper's click payload this resolver reads (`ECElementEvent` and
 * `VizChartTableActionEvent` are both assignable to it). Segment: `seriesId = bucket|typeKey`, `name` = P/A key.
 * Axis label: `componentType: 'yAxis'`, `value` = the P/A key (the category value, not the formatted label).
 */
export interface TypologyClickEvent {
  componentType?: string;
  seriesId?: string;
  name?: string;
  value?: unknown;
}

const SEPARATOR = '|';
const AXIS_COMPONENT = 'yAxis';
const UNCLASSIFIED = 'unclassified';

/** Same rule `portfolio-filters.ts` applies to type names (trim, single space, lower-case); it is not exported there. */
const normalizeType = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

export const encodeSeriesId = (bucket: TypologyBucket, typeKey: string): string => `${bucket}${SEPARATOR}${typeKey}`;

/** Splits at the FIRST separator; null when the id is not `submitted|…` / `editing|…`. */
export function decodeSeriesId(id: unknown): { bucket: TypologyBucket; typeKey: string } | null {
  if (typeof id !== 'string') return null;
  const at = id.indexOf(SEPARATOR);
  if (at < 0) return null;
  const bucket = id.slice(0, at);
  if (bucket !== 'submitted' && bucket !== 'editing') return null;
  return { bucket, typeKey: id.slice(at + 1) };
}

/** Payload of a segment click (and of its keyboard table action). */
export const segmentPayload = (bucket: TypologyBucket, typeKey: string, programKey: string): TypologyClickEvent => ({
  seriesId: encodeSeriesId(bucket, typeKey),
  name: programKey
});

/** Payload of a P/A axis-label click (and of its keyboard table action). */
export const axisLabelPayload = (programKey: string): TypologyClickEvent => ({ componentType: AXIS_COMPONENT, value: programKey });

/** Editing = `{editing}`; Submitted = every other status slot (TBC-DD-2). */
export const bucketSlots = (bucket: TypologyBucket): string[] =>
  bucket === 'editing' ? ['editing'] : PORTFOLIO_STATUS_SLOTS.map(slot => slot.key).filter(key => key !== 'editing');

const sameSet = (set: ReadonlySet<string>, values: readonly string[]): boolean => set.size === values.length && values.every(v => set.has(v));

/**
 * The next global selection for a click, or `null` for a no-op (catch-all P/A, unknown event, malformed id).
 * Always built from the CURRENT selection so Project / Center / Funding survive (TBC-R-4); the caller makes one
 * `setSelection(next)` write (TBC-DD-3).
 */
export function resolveTypologyClick(event: TypologyClickEvent | null | undefined, selection: PortfolioFilterSelection): PortfolioFilterSelection | null {
  if (!event) return null;

  if (event.componentType === AXIS_COMPONENT) {
    const code = typeof event.value === 'string' ? event.value.trim() : '';
    if (code === '') return null;
    const program = new Set(selection.program);
    if (!program.delete(code)) program.add(code);
    return { ...selection, program };
  }

  const series = decodeSeriesId(event.seriesId);
  const program = typeof event.name === 'string' ? event.name.trim() : '';
  if (!series || program === '') return null;

  const typology = series.typeKey === '' ? UNCLASSIFIED : normalizeType(series.typeKey);
  const status = bucketSlots(series.bucket);

  const isToggleOff = sameSet(selection.program, [program]) && sameSet(selection.typology, [typology]) && sameSet(selection.status, status);
  if (isToggleOff) {
    return { ...selection, program: new Set(EMPTY_SELECTION.program), typology: new Set(EMPTY_SELECTION.typology), status: new Set(EMPTY_SELECTION.status) };
  }
  return { ...selection, program: new Set([program]), typology: new Set([typology]), status: new Set(status) };
}
