// @akili-spec notifications/bilateral-contributor-tagging
import { ClarisaCenter } from '../../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ClarisaProject } from '../../../clarisa/clarisa-projects/entity/clarisa-projects.entity';
import { W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE } from '../constants/w3-center-alias.constants';

/** A preloaded, in-memory index of `clarisa_center` rows, keyed both ways the resolver needs. */
export interface CenterIndex {
  byInstitutionId: Map<number, ClarisaCenter>;
  byCode: Map<string, ClarisaCenter>;
}

/** The owning Center of a project: its code, plus the institution id when the Center is known. */
export interface ProjectOwnerCenter {
  code: string;
  institutionId: number | null;
}

/** The slice of `ClarisaProject` the resolver actually reads. */
export type ProjectOwnerCenterInput = Pick<
  ClarisaProject,
  'organizationCode' | 'sourceCenterAcronym'
>;

/**
 * Builds the small in-memory index (`clarisa_center` has ~15 rows) that
 * {@link resolveProjectOwnerCenter} reads from. Load it once per call site with one
 * `centerRepo.find()` — never per project.
 */
export function buildCenterIndex(centers: ClarisaCenter[]): CenterIndex {
  const byInstitutionId = new Map<number, ClarisaCenter>();
  const byCode = new Map<string, ClarisaCenter>();

  for (const center of centers ?? []) {
    if (center.institutionId != null) {
      byInstitutionId.set(Number(center.institutionId), center);
    }
    if (center.code) {
      byCode.set(center.code, center);
    }
  }

  return { byInstitutionId, byCode };
}

/**
 * `clarisa_projects.organization_code` -> `clarisa_center.institutionId` -> `code`.
 *
 * The inverse of what `BilateralProjectsService.getProjectsByCenter` does, including the same
 * fallback: CLARISA's own W3 institution-acronym matching leaves some rows with
 * `organization_code = NULL`, and those carry the acronym instead. See
 * `w3-center-alias.constants.ts` for why that only bites the Alliance-descended institutions.
 *
 * Pure — takes a preloaded {@link CenterIndex}, does no I/O. Order: `organizationCode` -> Center
 * by institutionId; if that misses (org code set but no Center matches, or org code absent),
 * fall through to the alias map by `sourceCenterAcronym` -> Center by code; else `null`.
 *
 * The alias map is trusted even when the index has no Center for that code (today's behaviour,
 * preserved): the code is still returned, with `institutionId: null`.
 */
export function resolveProjectOwnerCenter(
  project: ProjectOwnerCenterInput,
  index: CenterIndex,
): ProjectOwnerCenter | null {
  if (project.organizationCode != null) {
    const center = index.byInstitutionId.get(Number(project.organizationCode));
    if (center?.code) {
      return { code: center.code, institutionId: center.institutionId ?? null };
    }
  }

  const acronym = project.sourceCenterAcronym;
  if (acronym && W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE[acronym]) {
    const aliasCode = W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE[acronym];
    const center = index.byCode.get(aliasCode);
    return { code: aliasCode, institutionId: center?.institutionId ?? null };
  }

  return null;
}
