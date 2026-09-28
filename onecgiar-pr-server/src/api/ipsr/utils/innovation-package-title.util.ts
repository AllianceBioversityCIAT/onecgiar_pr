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

/**
 * P2-3427 (PO review, 25-Sep-2026): the General information form caps the title at 30 words and
 * paints the counter when it is exceeded, yet the title we GENERATE here routinely exceeded it
 * (package 9638 was born with 35 words), so the reporter was asked to fix something the system
 * wrote. The prefix and the geographic suffix are fixed wording; the core innovation part is the
 * only piece that can be shortened, so it is trimmed at a word boundary until the whole title fits.
 */
export const INNOVATION_PACKAGE_TITLE_MAX_WORDS = 30;

const countWords = (text: string): number =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

/** Trims `core` (at a word boundary) so `prefix + core + suffix` stays within the word cap. */
export const fitCoreTitleToCap = (
  prefix: string,
  core: string,
  suffix: string,
  cap: number = INNOVATION_PACKAGE_TITLE_MAX_WORDS,
): string => {
  const fixed = countWords(prefix) + countWords(suffix);
  const room = Math.max(cap - fixed, 1);
  const words = core.trim().split(/\s+/).filter(Boolean);
  return words.length <= room ? core.trim() : words.slice(0, room).join(' ');
};

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
    const suffix = `in ${joinGeoScopeNames(regionNames)}`;
    return `${INNOVATION_PACKAGE_TITLE_PREFIX} ${fitCoreTitleToCap(
      INNOVATION_PACKAGE_TITLE_PREFIX,
      coreTitle,
      suffix,
    )} ${suffix}`;
  }

  if (
    GEO_SCOPE_WITH_COUNTRIES.includes(Number(geoScopeId)) &&
    countryNames?.length
  ) {
    const suffix = `in ${joinGeoScopeNames(countryNames)}`;
    return `${INNOVATION_PACKAGE_TITLE_PREFIX} ${fitCoreTitleToCap(
      INNOVATION_PACKAGE_TITLE_PREFIX,
      coreTitle.toLocaleLowerCase(),
      suffix,
    )} ${suffix}`;
  }

  return `${INNOVATION_PACKAGE_TITLE_PREFIX} ${fitCoreTitleToCap(
    INNOVATION_PACKAGE_TITLE_PREFIX,
    coreTitle.toLocaleLowerCase().trim(),
    '',
  )}.`;
}
