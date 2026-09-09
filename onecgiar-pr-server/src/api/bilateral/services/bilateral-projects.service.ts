import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ClarisaCenter } from '../../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ClarisaProject } from '../../../clarisa/clarisa-projects/entity/clarisa-projects.entity';
import { W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE } from '../constants/w3-center-alias.constants';
import { YearRepository } from '../../results/years/year.repository';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

@Injectable()
export class BilateralProjectsService {
  private readonly logger = new Logger(BilateralProjectsService.name);

  constructor(
    @InjectRepository(ClarisaProject)
    private readonly projectRepo: Repository<ClarisaProject>,
    @InjectRepository(ClarisaCenter)
    private readonly centerRepo: Repository<ClarisaCenter>,
    @InjectRepository(ClarisaInitiative)
    private readonly initiativeRepo: Repository<ClarisaInitiative>,
    private readonly yearRepository: YearRepository,
  ) {}

  /**
   * Science Program display names, keyed by SMO code.
   *
   * CLARISA's `projects` payload nests a `global_unit_object` per mapping, but only
   * fills its `smo_code` — `name` and `short_name` arrive null, so
   * `clarisa_project_mappings.program_name` / `program_short_name` are null for
   * every row and the selector rendered "SP06 — SP06".
   *
   * The name is resolved from `clarisa_initiatives` instead, matching
   * `official_code` against that same SMO code. That is the join the rest of the
   * platform already relies on for these codes (see
   * `ContributionToIndicatorsRepository.findAllOutcomesByInitiativeCode`, and the
   * `SPs-Icons/{code}.png` assets). Reading it at request time rather than copying
   * it into the mappings table keeps `clarisa_initiatives` the single source of
   * truth — snapshotting a field CLARISA does not fill is what produced the nulls
   * in the first place.
   */
  private async resolveScienceProgramNames(
    programCodes: string[],
  ): Promise<Map<string, ClarisaInitiative>> {
    if (!programCodes.length) return new Map();

    const initiatives = await this.initiativeRepo.find({
      where: { official_code: In(programCodes) },
    });

    const byCode = new Map<string, ClarisaInitiative>();
    for (const initiative of initiatives) {
      const existing = byCode.get(initiative.official_code);
      // `official_code` carries no uniqueness guarantee. Prefer an active row, and
      // break any remaining tie on the lowest id, so the label is deterministic
      // instead of depending on row order.
      if (
        !existing ||
        (initiative.active && !existing.active) ||
        (initiative.active === existing.active && initiative.id < existing.id)
      ) {
        byCode.set(initiative.official_code, initiative);
      }
    }

    if (byCode.size < programCodes.length) {
      const missing = programCodes.filter((code) => !byCode.has(code));
      this.logger.warn(
        `No clarisa_initiatives row for science program code(s): ${missing.join(', ')} — ` +
          `those will fall back to showing the code as their name`,
      );
    }

    return byCode;
  }

  /**
   * Resolves the lead-centre descriptor for a project, in the shape
   * `BilateralService.handleLeadCenter` expects.
   *
   * A project's lead centre normally lives in `organization_code`. CLARISA's W3 sync
   * leaves that NULL for the Alliance-descended centres — its `findInstitution()` does an
   * exact-string match against `clarisa_institutions.acronym`, and W3 publishes the plain
   * pre-merger acronyms ("CIAT" / "BIOVERSITY") while CLARISA stores the disambiguated
   * "CIAT (Alliance)" / "Bioversity (Alliance)". Measured on the 2026 phase: 146 of 1211
   * projects have `organization_code = NULL`, and 145 of those carry
   * `source_center_acronym = 'CIAT'`.
   *
   * `getProjectsByCenter` below already falls back to that acronym so those projects still
   * appear under the right centre, and `ResultTaggedNotificationService.resolveProjectCenterCode`
   * does the same for notifications. Result creation was the only caller that did not, so a
   * result reported against one of those projects was saved with no lead centre at all — and
   * silently, since `handleLeadCenter` only logs at debug level when it has nothing to store.
   * That leaves the Contributors & Partners green check permanently red, because
   * `validation_contributor_partner_P25` counts `is_leading_result = 1` rows.
   *
   * Returns null when neither route resolves; the caller decides what to do about it.
   */
  async resolveProjectLeadCenter(
    projectId: number,
  ): Promise<{ name?: string; acronym?: string } | null> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: { obj_organization: true },
    });
    if (!project) {
      this.logger.warn(
        `Project ${projectId} not found; no lead centre resolved`,
      );
      return null;
    }

    if (project.obj_organization) {
      return {
        name: project.obj_organization.name,
        acronym: project.obj_organization.acronym,
      };
    }

    // organization_code is NULL: fall back to the values the sync preserved for audit.
    // Only acronyms present in the alias map are usable — a centre whose acronym is not
    // listed must keep going through the normal institution path, where guessing a code
    // would silently misattribute the result (see w3-center-alias.constants.ts).
    const acronym = project.sourceCenterAcronym;
    if (acronym && W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE[acronym]) {
      this.logger.log(
        `Project ${projectId} has no organization_code; resolved lead centre from source_center_acronym="${acronym}"`,
      );
      return { name: project.sourceCenterName, acronym };
    }

    this.logger.warn(
      `Project ${projectId} has no organization_code and no mappable source_center_acronym` +
        ` (got "${acronym ?? 'null'}") — the result will be created without a lead centre`,
    );
    return null;
  }

  async getProjectsByCenter(centerId: number | string) {
    let center = null;
    const centerIdNum = Number(centerId);
    if (!isNaN(centerIdNum)) {
      center = await this.centerRepo.findOne({
        where: { institutionId: centerIdNum },
        relations: { clarisa_institution: true },
      });
    }
    if (!center) {
      center = await this.centerRepo.findOne({
        where: { code: String(centerId) },
        relations: { clarisa_institution: true },
      });
    }

    if (!center) {
      this.logger.warn(`Center not found for code: ${centerId}`);
      return { projects: [] };
    }

    const activeYear = await this.yearRepository.findOne({
      where: { active: true },
    });
    if (!activeYear) {
      this.logger.warn(
        'No active year configured (year.active) — cannot scope bilateral projects by phase',
      );
      return { projects: [] };
    }

    this.logger.log(
      `Center found: code=${center.code}, institutionId=${center.institutionId}`,
    );

    const organizationCode = center.institutionId;
    this.logger.log(
      `Querying projects with organization_code=${organizationCode}`,
    );

    const relations = {
      obj_organization: true,
      obj_project_mappings: true,
    };

    const primaryProjects = await this.projectRepo.find({
      where: { organizationCode },
      relations,
    });

    // Defensive fallback for CLARISA's own W3 institution-acronym-matching bug
    // (see constants/w3-center-alias.constants.ts). Only look up acronyms mapped
    // to *this* center's code, and only among projects the primary match missed.
    const aliasAcronymsForThisCenter = Object.entries(
      W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE,
    )
      .filter(([, code]) => code === center.code)
      .map(([acronym]) => acronym);

    const fallbackProjects = aliasAcronymsForThisCenter.length
      ? await this.projectRepo.find({
          where: {
            organizationCode: IsNull(),
            sourceCenterAcronym: In(aliasAcronymsForThisCenter),
          },
          relations,
        })
      : [];

    if (fallbackProjects.length) {
      this.logger.log(
        `Found ${fallbackProjects.length} additional project(s) via source_center_acronym fallback for center code=${center.code}`,
      );
    }

    const projectsById = new Map<number, ClarisaProject>();
    for (const project of [...primaryProjects, ...fallbackProjects]) {
      projectsById.set(project.id, project);
    }
    const projects = [...projectsById.values()];

    this.logger.log(`Found ${projects.length} projects`);

    const activeProjects = projects.filter((p) => p.isActive !== false);
    this.logger.log(`${activeProjects.length} active projects`);

    if (activeProjects.length === 0 && projects.length > 0) {
      this.logger.warn(
        `All ${projects.length} projects have isActive=false — check DB`,
      );
    }

    const currentPhaseProjects = activeProjects.filter(
      (p) => p.phase === activeYear.year,
    );
    this.logger.log(
      `${currentPhaseProjects.length} projects match current phase=${activeYear.year}`,
    );

    if (currentPhaseProjects.length === 0 && activeProjects.length > 0) {
      const foundPhases = [...new Set(activeProjects.map((p) => p.phase))].join(
        ', ',
      );
      this.logger.warn(
        `All ${activeProjects.length} active project(s) have a phase different from ` +
          `the current active year (${activeYear.year}) — found phase(s): ${foundPhases}. ` +
          `Check whether the CLARISA project sync is up to date for this phase.`,
      );
    }

    // P2-3313 (Nicoleta, 2026-09-08): a centre may only report against projects mapped to a
    // Program/Accelerator in the W3 Registry. A project with no mapping is not reportable — the
    // wizard's step 2 has no Science Program to offer and dead-ends — so it is not listed at all.
    const reportableProjects = currentPhaseProjects.filter((p) =>
      this.hasProgramMapping(p),
    );
    const unmappedCount =
      currentPhaseProjects.length - reportableProjects.length;
    if (unmappedCount > 0) {
      this.logger.debug(
        `${unmappedCount} project(s) of center code=${center.code} hidden: no mapping to a Program/Accelerator (P2-3313)`,
      );
    }

    const programCodes = [
      ...new Set(
        reportableProjects
          .flatMap((p) => this.reportableMappings(p))
          .map((m) => m.programCode)
          .filter((code): code is string => !!code),
      ),
    ];
    const spByCode = await this.resolveScienceProgramNames(programCodes);

    const mapped = reportableProjects.map((project) => ({
      id: project.id,
      shortName: project.shortName,
      fullName: project.fullName,
      summary: project.summary,
      description: project.description,
      leadCenter: project.obj_organization
        ? {
            id: project.obj_organization.id,
            name: project.obj_organization.name,
            acronym: project.obj_organization.acronym,
          }
        : null,
      // Only approved, addressable mappings are offered as Science Programs: the wizard's step 2
      // picks the primary SP from this list, so an unapproved mapping must not be selectable.
      sciencePrograms: this.reportableMappings(project).map((mapping) => {
        const initiative = mapping.programCode
          ? spByCode.get(mapping.programCode)
          : undefined;
        return {
          programId: mapping.programId,
          programCode: mapping.programCode,
          allocation: mapping.allocation,
          // Catalogue first, then whatever the sync stored, then the code itself —
          // so a code with no catalogue row renders exactly as it does today.
          spName:
            initiative?.name ??
            mapping.programName ??
            mapping.programCode ??
            '',
          spShortName:
            initiative?.short_name ??
            mapping.programShortName ??
            mapping.programCode ??
            '',
        };
      }),
    }));

    return { projects: mapped };
  }

  /**
   * P2-3313 — a project is reportable when at least one of its W3 Registry mappings is both
   * addressable and approved:
   *
   * - AC1: the mapping carries a `programCode` — that code is what the wizard's Science Program
   *   step selects from, so a mapping without one is not reportable either.
   * - AC2: the mapping is approved. The registry publishes only committee-agreed mappings and
   *   marks them `agreed`; CLARISA translates that to its own enum as `Confirmed`
   *   (`toMappingStatus`, clarisa-back `integration/w3`, 2026-09-08) and PRMS copies the value
   *   verbatim into `clarisa_project_mappings.status`. `Confirmed` is also what CLARISA's
   *   pre-registry mappings carry. Anything else — `Pending`, `Proposed`, `Rejected`, NULL — is
   *   not approved and hides the project.
   *
   * ⚠️ Deploy order: this guard must reach an environment only AFTER CLARISA's fix is deployed
   * there and both syncs (registry → CLARISA, CLARISA → PRMS) have re-run; otherwise every
   * registry-fed project still sits at `Pending` and the picker empties.
   */
  private hasProgramMapping(project: ClarisaProject): boolean {
    return this.reportableMappings(project).length > 0;
  }

  /** The project's mappings that carry a programCode AND an approved status. */
  private reportableMappings(project: ClarisaProject) {
    return (project.obj_project_mappings ?? []).filter(
      (mapping) =>
        !!mapping.programCode?.trim() &&
        BilateralProjectsService.APPROVED_MAPPING_STATUSES.has(
          mapping.status?.trim() ?? '',
        ),
    );
  }

  /** `clarisa_project_mappings.status` values that mean "approved" (see `hasProgramMapping`). */
  private static readonly APPROVED_MAPPING_STATUSES: ReadonlySet<string> =
    new Set(['Confirmed']);
}
