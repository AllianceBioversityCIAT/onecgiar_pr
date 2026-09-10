/**
 * P2-3166 — the `result` columns that record which external platform a result came from.
 *
 * Shaped with the column names on purpose so it can be spread straight into a `save`/`update`
 * without a mapping step. `null` is meaningful: it means the result did not arrive through an
 * authenticated external platform, and must not be turned into an empty string.
 */
export interface ExternalPlatformIdentity {
  external_platform_id: number | null;
  external_platform_code: string | null;
  external_reference: string | null;
}
