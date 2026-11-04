/**
 * Innovation Use — unit and nature of the number reported for Farmers actor rows.
 *
 * @akili-spec changes/innovation-use-farmer-count-nature (IFC-T-2, design.md §5/§6, IFC-DD-3/DD-4)
 *
 * Stored as `varchar(32)` + this whitelist, not a MySQL ENUM: adding a value is a code change,
 * never an ALTER on `result_actors`.
 */

/**
 * `actor_type.actor_type_id` of "Farmers" (first row of `1679588387039-insertActorsType`),
 * verified in test and prod by IFC-T-1. Pinned by id on purpose (IFC-DD-4): the catalogue name
 * differs between sources.
 */
export const FARMERS_ACTOR_TYPE_ID = 1;

export const COUNT_UNIT_CODES = ['households', 'individuals'] as const;
export type CountUnitCode = (typeof COUNT_UNIT_CODES)[number];

export const USE_NATURE_CODES = [
  'information_received',
  'innovation_applied',
] as const;
export type UseNatureCode = (typeof USE_NATURE_CODES)[number];

/** The code itself when it is one of the allowed ones, otherwise NULL (IFC-R-7, IFC-DD-3). */
export const toCountUnit = (value: unknown): CountUnitCode | null =>
  (COUNT_UNIT_CODES as readonly unknown[]).includes(value)
    ? (value as CountUnitCode)
    : null;

/** The code itself when it is one of the allowed ones, otherwise NULL (IFC-R-7, IFC-DD-3). */
export const toUseNature = (value: unknown): UseNatureCode | null =>
  (USE_NATURE_CODES as readonly unknown[]).includes(value)
    ? (value as UseNatureCode)
    : null;
