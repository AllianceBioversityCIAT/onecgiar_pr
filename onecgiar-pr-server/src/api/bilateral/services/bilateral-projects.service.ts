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

    const programCodes = [
      ...new Set(
        currentPhaseProjects
          .flatMap((p) => p.obj_project_mappings ?? [])
          .map((m) => m.programCode)
          .filter((code): code is string => !!code),
      ),
    ];
    const spByCode = await this.resolveScienceProgramNames(programCodes);

    const mapped = currentPhaseProjects.map((project) => ({
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
      sciencePrograms: (project.obj_project_mappings ?? []).map((mapping) => {
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
}
