/**
 * Single source of truth for the Innovation Package title.
 *
 * The title is derived from the linked core innovation plus the geographic
 * scope, and it is rebuilt in three places: when the package is created, when
 * the geographic scope is saved in step one of the pathway, and when the
 * package is replicated into a new phase (where the core innovation link is
 * re-pointed to its latest version). Keep this the only place that knows the
 * wording.
 */

export const INNOVATION_PACKAGE_TITLE_PREFIX =
  'Innovation Package and Scaling Readiness assessment for';

/** `geographic_scope_id` for a regional package (title lists regions). */
export const GEO_SCOPE_REGIONAL = 2;

/** `geographic_scope_id` values whose title lists countries. */
export const GEO_SCOPE_WITH_COUNTRIES = [3, 4, 5];

export interface InnovationPackageTitleInput {
  /** Title of the linked core innovation (`ipsr_role_id = 1`). */
  coreInnovationTitle: string;
  geoScopeId: number;
  regionNames?: string[];
  countryNames?: string[];
}

const stripTrailingPeriod = (title: string): string =>
  title?.endsWith('.') ? title.replace(/\.$/, '') : (title ?? '');

/** Renders `a`, `a and b`, `a, b and c`. */
export const joinGeoScopeNames = (names: string[]): string =>
  `${names.slice(0, -1).join(', ')}${names.length > 1 ? ' and ' : ''}${
    names[names.length - 1]
  }`;

export function buildInnovationPackageTitle({
  coreInnovationTitle,
  geoScopeId,
  regionNames,
  countryNames,
}: InnovationPackageTitleInput): string {
  const coreTitle = stripTrailingPeriod(coreInnovationTitle);

  if (Number(geoScopeId) === GEO_SCOPE_REGIONAL && regionNames?.length) {
    return `${INNOVATION_PACKAGE_TITLE_PREFIX} ${coreTitle} in ${joinGeoScopeNames(
      regionNames,
    )}`;
  }

  if (
    GEO_SCOPE_WITH_COUNTRIES.includes(Number(geoScopeId)) &&
    countryNames?.length
  ) {
    return `${INNOVATION_PACKAGE_TITLE_PREFIX} ${coreTitle.toLocaleLowerCase()} in ${joinGeoScopeNames(
      countryNames,
    )}`;
  }

  return `${INNOVATION_PACKAGE_TITLE_PREFIX} ${coreTitle
    .toLocaleLowerCase()
    .trim()}.`;
}
