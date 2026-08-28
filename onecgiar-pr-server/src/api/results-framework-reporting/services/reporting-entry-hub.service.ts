// @akili-spec changes/reporting-entry-hub
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { YearRepository } from '../../results/years/year.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { BilateralProjectsService } from '../../bilateral/services/bilateral-projects.service';
import { throwServiceError } from '../../../shared/utils/service-error.util';
import {
  CenterProjectsDto,
  HubProjectDto,
  ReportingEntryHubProjectsDto,
} from '../dto/reporting-entry-hub-projects.dto';

// REH-R-9.1: the response is capped at 300 projects in total.
const PROJECTS_CAP = 300;
// REH-DD design §4.1: summary/description are trimmed to 200 chars.
const TEXT_TRIM_LENGTH = 200;
const CENTER_ROLE_LEVEL_NAME = 'Center';

interface RoleByUserCenterRow {
  role_level_name?: string;
  center_id?: string;
  center_name?: string;
  center_acronym?: string;
}

interface MinimalCenter {
  code: string;
  name: string;
  acronym: string;
}

@Injectable()
export class ReportingEntryHubService {
  private readonly _logger: Logger = new Logger(ReportingEntryHubService.name);

  constructor(
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _yearRepository: YearRepository,
    private readonly _bilateralProjectsService: BilateralProjectsService,
    private readonly _handlersError: HandlersError,
  ) {}

  async getMyCenterProjects(
    userId: number,
    programId?: string,
  ): Promise<{
    response: ReportingEntryHubProjectsDto;
    message: string;
    status: HttpStatus;
  }> {
    const startedAt = Date.now();
    let programCode: string | undefined;

    try {
      programCode = programId?.trim().toUpperCase();

      if (!programCode) {
        throwServiceError(
          'A valid programId query parameter is required.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const initiative = await this._clarisaInitiativesRepository.findOne({
        where: { official_code: programCode, active: true },
        select: ['id', 'official_code'],
      });

      if (!initiative) {
        throwServiceError(
          'No initiative was found with the provided program identifier.',
          HttpStatus.NOT_FOUND,
        );
      }

      const activeYearRow = await this._yearRepository.findOne({
        where: { active: true },
      });
      const activeYear = activeYearRow?.year ?? null;

      const roles: RoleByUserCenterRow[] =
        (await this._roleByUserRepository.getAllRolesByUser(userId)) ?? [];

      // RoleByUserRepository.getAllRolesByUser falls back to a legacy query
      // (no center_id/center_name/center_acronym columns) on any SQL error —
      // that shape MUST be treated as a lookup failure, never as "no centers".
      if (roles.length > 0 && !('center_id' in roles[0])) {
        throwServiceError(
          'Unable to resolve the caller center assignments.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const centers = this._resolveMyCenters(roles);

      if (centers.length === 0) {
        this._logSuccess({
          userId,
          programCode,
          centers: 0,
          projects: 0,
          truncated: false,
          failedCenters: 0,
          ms: Date.now() - startedAt,
        });

        return this._buildResponse({
          programCode,
          activeYear,
          truncated: false,
          centers: [],
        });
      }

      const settled = await Promise.allSettled(
        centers.map((center) =>
          this._bilateralProjectsService.getProjectsByCenter(center.code),
        ),
      );

      let failedCenters = 0;

      const centerResults: CenterProjectsDto[] = centers.map(
        (center, index) => {
          const outcome = settled[index];

          if (outcome.status === 'rejected') {
            failedCenters += 1;
            this._logger.warn(
              `Project lookup failed for center code=${center.code}: ${outcome.reason}`,
            );
            return {
              code: center.code,
              name: center.name,
              acronym: center.acronym,
              total: 0,
              matching: 0,
              error: true,
              projects: [],
            };
          }

          const projects = outcome.value?.projects ?? [];
          const matchingProjects = this._toMatchingProjects(
            projects,
            programCode,
          );

          return {
            code: center.code,
            name: center.name,
            acronym: center.acronym,
            total: projects.length,
            matching: matchingProjects.length,
            projects: matchingProjects,
          };
        },
      );

      // REH-R-3.6 / REH-DD-1: order centers by matching desc, then name asc.
      centerResults.sort((a, b) => {
        if (b.matching !== a.matching) return b.matching - a.matching;
        return a.name.localeCompare(b.name);
      });

      const { centers: cappedCenters, truncated } =
        this._applyCap(centerResults);

      this._logSuccess({
        userId,
        programCode,
        centers: cappedCenters.length,
        projects: cappedCenters.reduce((sum, c) => sum + c.projects.length, 0),
        truncated,
        failedCenters,
        ms: Date.now() - startedAt,
      });

      return this._buildResponse({
        programCode,
        activeYear,
        truncated,
        centers: cappedCenters,
      });
    } catch (error) {
      this._logger.error({
        event: 'reporting_entry_hub.projects.error',
        userId,
        programCode,
        code: error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      });
      return this._handlersError.returnErrorRes({
        error,
        debug: true,
      }) as unknown as {
        response: ReportingEntryHubProjectsDto;
        message: string;
        status: HttpStatus;
      };
    }
  }

  private _buildResponse(response: ReportingEntryHubProjectsDto) {
    return {
      response,
      message: 'Reporting entry hub projects retrieved successfully.',
      status: HttpStatus.OK,
    };
  }

  private _resolveMyCenters(roles: RoleByUserCenterRow[]): MinimalCenter[] {
    const centersById = new Map<string, MinimalCenter>();

    for (const row of roles) {
      if (row.role_level_name !== CENTER_ROLE_LEVEL_NAME || !row.center_id) {
        continue;
      }
      if (!centersById.has(row.center_id)) {
        centersById.set(row.center_id, {
          code: row.center_id,
          name: row.center_name,
          acronym: row.center_acronym,
        });
      }
    }

    return [...centersById.values()];
  }

  private _toMatchingProjects(
    projects: any[],
    programCode: string,
  ): HubProjectDto[] {
    return projects
      .map((project) => {
        const mapping = (project.sciencePrograms ?? []).find(
          (sp: { programCode?: string }) =>
            sp.programCode?.toUpperCase() === programCode,
        );
        if (!mapping) return null;

        return {
          id: project.id,
          shortName: project.shortName,
          fullName: project.fullName,
          summary: this._trim(project.summary),
          description: this._trim(project.description),
          leadCenter: project.leadCenter ?? null,
          sciencePrograms: project.sciencePrograms ?? [],
          allocation: Number(mapping.allocation),
        } as HubProjectDto;
      })
      .filter((project): project is HubProjectDto => project !== null)
      .sort((a, b) => {
        // REH-R-3.2: numeric allocation desc, then shortName asc. The mapping
        // column is a decimal STRING — a lexical sort would rank '9' above '100'.
        if (b.allocation !== a.allocation) return b.allocation - a.allocation;
        return a.shortName.localeCompare(b.shortName);
      });
  }

  private _trim(value?: string | null): string | undefined {
    if (typeof value !== 'string') return value ?? undefined;
    return value.length > TEXT_TRIM_LENGTH
      ? value.slice(0, TEXT_TRIM_LENGTH)
      : value;
  }

  private _applyCap(centers: CenterProjectsDto[]): {
    centers: CenterProjectsDto[];
    truncated: boolean;
  } {
    const totalMatching = centers.reduce(
      (sum, c) => sum + c.projects.length,
      0,
    );

    if (totalMatching <= PROJECTS_CAP) {
      return { centers, truncated: false };
    }

    let remaining = PROJECTS_CAP;
    const cappedCenters = centers.map((center) => {
      if (remaining <= 0) {
        return { ...center, projects: [] };
      }
      if (center.projects.length <= remaining) {
        remaining -= center.projects.length;
        return center;
      }
      const cappedProjects = center.projects.slice(0, remaining);
      remaining = 0;
      return { ...center, projects: cappedProjects };
    });

    return { centers: cappedCenters, truncated: true };
  }

  private _logSuccess(payload: Record<string, unknown>) {
    this._logger.log({ event: 'reporting_entry_hub.projects', ...payload });
  }
}
