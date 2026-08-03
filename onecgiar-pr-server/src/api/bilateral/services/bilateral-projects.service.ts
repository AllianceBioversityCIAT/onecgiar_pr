import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClarisaCenter } from '../../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { ClarisaProject } from '../../../clarisa/clarisa-projects/entity/clarisa-projects.entity';

@Injectable()
export class BilateralProjectsService {
  private readonly logger = new Logger(BilateralProjectsService.name);

  constructor(
    @InjectRepository(ClarisaProject)
    private readonly projectRepo: Repository<ClarisaProject>,
    @InjectRepository(ClarisaInitiative)
    private readonly initiativeRepo: Repository<ClarisaInitiative>,
    @InjectRepository(ClarisaCenter)
    private readonly centerRepo: Repository<ClarisaCenter>,
  ) {}

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

    this.logger.log(
      `Center found: code=${center.code}, institutionId=${center.institutionId}`,
    );

    const organizationCode = center.institutionId;
    this.logger.log(
      `Querying projects with organization_code=${organizationCode}`,
    );

    const projects = await this.projectRepo.find({
      where: { organizationCode },
      relations: {
        obj_organization: true,
        obj_project_mappings: true,
      },
    });

    this.logger.log(`Found ${projects.length} projects`);

    const activeProjects = projects.filter((p) => p.isActive !== false);
    this.logger.log(`${activeProjects.length} active projects`);

    if (activeProjects.length === 0 && projects.length > 0) {
      this.logger.warn(
        `All ${projects.length} projects have isActive=false — check DB`,
      );
    }

    const allProgramCodes = activeProjects.flatMap((p) =>
      (p.obj_project_mappings ?? []).map((m) => m.programCode).filter(Boolean),
    );

    const uniqueCodes = [...new Set(allProgramCodes)];
    const initiatives = uniqueCodes.length
      ? await this.initiativeRepo.find({
          where: { official_code: In(uniqueCodes) },
        })
      : [];

    const initiativeMap = new Map(
      initiatives.map((init) => [init.official_code, init]),
    );

    const mapped = activeProjects.map((project) => ({
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
          ? initiativeMap.get(mapping.programCode)
          : null;
        return {
          programId: mapping.programId,
          programCode: mapping.programCode,
          allocation: mapping.allocation,
          spName: initiative?.name ?? mapping.programCode ?? '',
          spShortName: initiative?.short_name ?? mapping.programCode ?? '',
        };
      }),
    }));

    return { projects: mapped };
  }
}
