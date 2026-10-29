// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-10: normalizers are a CLOSED, keyed list applied after typing and before projection. The only entry is
// `capacity_sharing.length_of_training` (contract known gap 17): the form stores ONE id, `capdev_term_id`, for two controls.
// A stored 1 / 2 is length 4 (Long-term) plus that degree; a stored 3 / 4 is that length with no degree.

type Obj = Record<string, unknown>;
export type Normalizer = (typed: unknown) => unknown;

const LONG_TERM = 4;
const DEGREE_IDS: ReadonlySet<unknown> = new Set([1, 2]);

const lengthOfTraining: Normalizer = (typed) => {
  const stored = (typed as Obj | null)?.value;
  const id = stored === null || stored === undefined ? null : Number(stored);
  if (DEGREE_IDS.has(id)) return { value: LONG_TERM, degree: id };
  return { value: id, degree: null };
};

export const NORMALIZERS: Readonly<Record<string, Normalizer>> = {
  'capacity_sharing.length_of_training': lengthOfTraining,
};

export function normalize(fieldKey: string, typed: unknown): unknown {
  const normalizer = NORMALIZERS[fieldKey];
  return normalizer ? normalizer(typed) : typed;
}
