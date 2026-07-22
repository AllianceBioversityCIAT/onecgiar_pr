import { BadRequestException, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { BilateralProjectsService } from './bilateral-projects.service';
import { BilateralService } from '../bilateral.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { CreateCenterResultDto } from '../dto/create-center-result.dto';
import { SaveBilateralTocMappingDto } from '../dto/save-bilateral-toc-mapping.dto';
import {
  BilateralProjectDto,
  InstitutionDto,
  SaveBilateralContributorsDto,
} from '../dto/save-bilateral-contributors.dto';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultsByProjectsService } from '../../results/results_by_projects/results_by_projects.service';
import { ResultStatusData } from '../../../shared/constants/result-status.enum';
import { Result, SourceEnum } from '../../results/entities/result.entity';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultRepository } from '../../results/result.repository';
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';
import { YearRepository } from '../../results/years/year.repository';
import { ResultByLevelRepository } from '../../results/result-by-level/result-by-level.repository';
import { ResultsTocResultsService } from '../../results/results-toc-results/results-toc-results.service';
import { ResultsTocResultRepository } from '../../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaCentersRepository } from '../../../clarisa/clarisa-centers/clarisa-centers.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';

@Injectable()
export class BilateralCenterService {
  constructor(
    private readonly bilateralProjectsService: BilateralProjectsService,
    private readonly bilateralService: BilateralService,
    private readonly versioningService: VersioningService,
    private readonly resultRepository: ResultRepository,
    private readonly resultByLevelRepository: ResultByLevelRepository,
    private readonly yearRepository: YearRepository,
    private readonly resultsTocResultsService: ResultsTocResultsService,
    private readonly resultsTocResultRepository: ResultsTocResultRepository,
    private readonly resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly clarisaCentersRepository: ClarisaCentersRepository,
    private readonly clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly resultsCenterRepository: ResultsCenterRepository,
    private readonly resultsByProjectsRepository: ResultsByProjectsRepository,
    private readonly resultsByProjectsService: ResultsByProjectsService,
  ) {}

  async getProjects(centerId: number) {
    const projects =
      await this.bilateralProjectsService.getProjectsByCenter(centerId);
    return { response: projects };
  }

  async createResultHeader(user: TokenDto, dto: CreateCenterResultDto) {
    if (dto.result_type_id === ResultTypeEnum.CAPACITY_CHANGE) {
      throw new BadRequestException('CAPACITY_CHANGE is no longer accepted.');
    }

    const resultByLevel = await this.resultByLevelRepository.getByTypeAndLevel(
      dto.result_level_id,
      dto.result_type_id,
    );
    if (!resultByLevel) {
      throw new BadRequestException(
        `Invalid combination of result_level_id (${dto.result_level_id}) and result_type_id (${dto.result_type_id}).`,
      );
    }

    const version = await this.versioningService.$_findActivePhase(
      AppModuleIdEnum.REPORTING,
    );
    if (!version) {
      throw new BadRequestException('No active reporting phase found.');
    }

    const year = await this.yearRepository.findOne({
      where: { active: true },
    });
    if (!year) {
      throw new BadRequestException('No active year found.');
    }

    const draftTitle = `Bilateral Draft ${Date.now()}`;

    const result = await this.resultRepository.save({
      created_by: user.id,
      version_id: version.id,
      title: draftTitle,
      description: '',
      reported_year_id: year.year,
      result_code: 0,
      result_type_id: dto.result_type_id,
      result_level_id: dto.result_level_id,
      source: SourceEnum.Bilateral,
      status_id: ResultStatusData.Editing.value,
    } as Result);

    await this.resultRepository.update(result.id, {
      title: `Bilateral Draft #${result.id}`,
    });

    if (dto.program_code) {
      const initiative = await this.clarisaInitiativesRepository.findOne({
        where: { official_code: dto.program_code, active: true },
      });
      if (initiative) {
        await this.resultByInitiativesRepository.save({
          result_id: result.id,
          initiative_id: initiative.id,
          initiative_role_id: 1,
          is_active: true,
          created_by: user.id,
        });
      }
    }

    if (dto.lead_center) {
      await this.bilateralService.handleLeadCenter(
        result.id,
        dto.lead_center,
        user.id,
      );
    }

    if (dto.project_id) {
      await this.resultsByProjectsRepository.save({
        result_id: result.id,
        project_id: dto.project_id,
        created_by: user.id,
        is_lead: true,
      });
    }

    return {
      response: {
        id: result.id,
        result_level_id: result.result_level_id,
        result_type_id: result.result_type_id,
        source: result.source,
        status_id: result.status_id,
      },
    };
  }

  async getResultInitiativeId(resultId: number) {
    const owner =
      await this.resultByInitiativesRepository.getOwnerInitiativeByResult(
        resultId,
      );
    return {
      response: {
        initiativeId: owner?.id ?? null,
        officialCode: owner?.official_code ?? null,
        initiativeName: owner?.initiative_name ?? null,
      },
    };
  }

  async getTocState(resultId: number) {
    try {
      const owner =
        await this.resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );

      if (!owner?.id) {
        return {
          response: {
            planned_result: null,
            toc_level_id: null,
            toc_result_id: null,
            indicator_id: null,
            toc_progressive_narrative: null,
          },
        };
      }

      const activeRecord = await this.resultsTocResultRepository.findOne({
        where: {
          result_id: resultId,
          initiative_ids: owner.id,
          is_active: true,
        },
      });

      if (!activeRecord) {
        return {
          response: {
            planned_result: null,
            toc_level_id: null,
            toc_result_id: null,
            indicator_id: null,
            toc_progressive_narrative: null,
          },
        };
      }

      let indicatorId: string | null = null;
      let contributingIndicator: number | null = null;
      if (activeRecord.result_toc_result_id) {
        const indicatorQuery = `
          SELECT 
            rtri.toc_results_indicator_id as id,
            rtri.result_toc_result_indicator_id as rtri_id
          FROM results_toc_result_indicators rtri
          WHERE rtri.results_toc_results_id = ?
            and rtri.is_active = 1
          LIMIT 1
        `;
        const indicatorResult: { id: string; rtri_id: number }[] =
          await this.resultsTocResultRepository.query(indicatorQuery, [
            activeRecord.result_toc_result_id,
          ]);
        if (indicatorResult?.length) {
          indicatorId = indicatorResult[0].id;
          const targetQuery = `
            SELECT rit.contributing_indicator
            FROM result_indicators_targets rit
            WHERE rit.result_toc_result_indicator_id = ?
              and rit.is_active = 1
            LIMIT 1
          `;
          const targetResult: { contributing_indicator: number }[] =
            await this.resultsTocResultRepository.query(targetQuery, [
              indicatorResult[0].rtri_id,
            ]);
          if (targetResult?.length) {
            contributingIndicator = targetResult[0].contributing_indicator;
          }
        }
      }

      return {
        response: {
          planned_result: activeRecord.planned_result,
          toc_level_id: activeRecord.toc_level_id ?? null,
          toc_result_id: activeRecord.toc_result_id ?? null,
          indicator_id: indicatorId,
          contributing_indicator: contributingIndicator,
          toc_progressive_narrative:
            activeRecord.toc_progressive_narrative ?? null,
        },
      };
    } catch (error) {
      return {
        response: {
          planned_result: null,
          toc_level_id: null,
          toc_result_id: null,
          indicator_id: null,
          toc_progressive_narrative: null,
        },
        message:
          error instanceof Error ? error.message : 'Failed to load TOC state',
      };
    }
  }

  async updatePlannedResult(
    resultId: number,
    body: { planned_result: boolean; programCode?: string },
    user: TokenDto,
  ) {
    try {
      let ownerInitiative =
        await this.resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );

      if (!ownerInitiative?.id && body.programCode) {
        const initiative = await this.clarisaInitiativesRepository.findOne({
          where: { official_code: body.programCode, active: true },
        });
        if (initiative) {
          ownerInitiative = {
            id: initiative.id,
            official_code: initiative.official_code,
            initiative_name: initiative.name,
            inititiative_id: initiative.id,
            is_active: initiative.active ? 1 : 0,
            short_name: initiative.short_name ?? '',
          };
        }
      }

      if (!ownerInitiative?.id) {
        return {
          response: { resultId },
          message: 'Owner initiative not found for this result',
          status: 404,
        };
      }

      return this.resultsTocResultsService.updatePlannedResult(
        resultId,
        body.planned_result,
        user.id,
      );
    } catch (error) {
      return {
        response: {},
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update planned result',
        status: 500,
      };
    }
  }

  async saveTocMapping(
    resultId: number,
    dto: SaveBilateralTocMappingDto,
    user: TokenDto,
  ) {
    try {
      const ownerInitiative =
        await this.resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );

      if (!ownerInitiative?.id) {
        return {
          response: { resultId },
          message: 'Owner initiative not found for this result',
          status: 404,
        };
      }

      const resultTocResult = {
        ...dto.result_toc_result,
        initiative_id: ownerInitiative.id,
      };

      return this.resultsTocResultsService.updateTocResultPartial(
        resultId,
        resultTocResult,
        user,
      );
    } catch (error) {
      return {
        response: {},
        message:
          error instanceof Error ? error.message : 'Failed to save ToC mapping',
        status: 500,
      };
    }
  }

  async saveContributors(
    resultId: number,
    dto: SaveBilateralContributorsDto,
    user: TokenDto,
  ) {
    const result: {
      savedCenters: Array<Record<string, unknown>>;
      failedCenters: Array<Record<string, unknown>>;
      savedProjects: Array<Record<string, unknown>>;
      failedProjects: Array<Record<string, unknown>>;
      deactivatedProjects: number[];
    } = {
      savedCenters: [],
      failedCenters: [],
      savedProjects: [],
      failedProjects: [],
      deactivatedProjects: [],
    };

    try {
      const bilResult = await this.resultRepository.findOne({
        where: { id: resultId, source: SourceEnum.Bilateral },
      });
      if (!bilResult) {
        return {
          response: { resultId },
          message: 'Bilateral result not found',
          status: 404,
        };
      }

      if (dto.contributing_center !== undefined) {
        await this.syncContributingCenters(
          resultId,
          dto.contributing_center,
          user,
          result,
        );
      }

      if (dto.contributing_bilateral_projects !== undefined) {
        await this.syncContributingProjects(
          resultId,
          dto.contributing_bilateral_projects,
          user,
          result,
        );
      }

      return {
        response: { resultId, ...result },
        message:
          result.failedCenters.length === 0 &&
          result.failedProjects.length === 0
            ? 'Contributors saved successfully'
            : `Contributors saved with ${result.failedCenters.length} failed centers and ${result.failedProjects.length} failed projects`,
      };
    } catch (error) {
      return {
        response: {},
        message:
          error instanceof Error
            ? error.message
            : 'Failed to save contributors',
        status: 500,
      };
    }
  }

  private async syncContributingCenters(
    resultId: number,
    centers: InstitutionDto[],
    user: TokenDto,
    result: {
      savedCenters: Array<Record<string, unknown>>;
      failedCenters: Array<Record<string, unknown>>;
    },
  ): Promise<void> {
    const institutionIds = centers
      .map((c) => c.institution_id)
      .filter((id): id is number => id !== undefined && id !== null);

    const clarisaCenters =
      institutionIds.length > 0
        ? await this.clarisaCentersRepository.find({
            where: { institutionId: In(institutionIds) },
          })
        : [];

    const codeByInstitution = new Map<number, string>();
    for (const center of clarisaCenters) {
      if (!codeByInstitution.has(center.institutionId)) {
        codeByInstitution.set(center.institutionId, center.code);
      }
    }

    const centerCodes: string[] = [];
    for (const center of centers) {
      if (
        center.institution_id === undefined ||
        center.institution_id === null
      ) {
        result.failedCenters.push({
          institution_id: center.institution_id,
          reason: 'No institution_id provided',
        });
        continue;
      }

      const centerCode = codeByInstitution.get(center.institution_id);
      if (!centerCode) {
        result.failedCenters.push({
          institution_id: center.institution_id,
          reason: 'Institution has no clarisa_center record',
        });
        continue;
      }

      if (!centerCodes.includes(centerCode)) {
        centerCodes.push(centerCode);
      }
      result.savedCenters.push({
        institution_id: center.institution_id,
        centerCode,
      });
    }

    const leadingRows = await this.resultsCenterRepository.find({
      where: { result_id: resultId, is_leading_result: true },
    });
    const leadingCodes = leadingRows.map((row) => row.center_id);

    await this.resultsCenterRepository.updateCenter(
      resultId,
      centerCodes,
      user.id,
    );

    for (const centerCode of centerCodes) {
      const existing =
        await this.resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(
          resultId,
          centerCode,
        );
      if (!existing) {
        await this.resultsCenterRepository.save({
          result_id: resultId,
          center_id: centerCode,
          is_primary: false,
          is_leading_result: leadingCodes.includes(centerCode),
          from_cgspace: false,
          is_active: true,
          created_by: user.id,
          last_updated_by: user.id,
        });
      } else if (leadingCodes.includes(centerCode)) {
        await this.resultsCenterRepository.update(
          { id: existing.id },
          {
            is_leading_result: true,
            is_active: true,
            last_updated_by: user.id,
          },
        );
      }
    }
  }

  private async syncContributingProjects(
    resultId: number,
    projects: BilateralProjectDto[],
    user: TokenDto,
    result: {
      savedProjects: Array<Record<string, unknown>>;
      failedProjects: Array<Record<string, unknown>>;
      deactivatedProjects: number[];
    },
  ): Promise<void> {
    const syncResult =
      await this.resultsByProjectsService.syncBilateralProjects(
        resultId,
        projects,
        user.id,
      );

    if (syncResult?.status >= 400) {
      result.failedProjects.push({
        reason: syncResult.message || 'Failed syncing bilateral projects',
      });
      return;
    }

    const syncResponse = syncResult?.response as
      | {
          set_active?: number[];
          deactivated?: number[];
        }
      | undefined;

    result.deactivatedProjects = syncResponse?.deactivated ?? [];
    result.savedProjects = (syncResponse?.set_active ?? []).map(
      (projectId: number) => ({ project_id: projectId }),
    );

    await this.resultsByProjectsRepository.update(
      { result_id: resultId, is_active: true },
      { is_lead: false, last_updated_by: user.id },
    );

    const leadIds = projects
      .filter((p) => p.is_lead === true || p.is_lead === 1)
      .map((p) => Number(p.project_id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (leadIds.length) {
      await this.resultsByProjectsRepository.update(
        {
          result_id: resultId,
          project_id: In(leadIds),
          is_active: true,
        },
        { is_lead: true, last_updated_by: user.id },
      );
    }
  }
}
