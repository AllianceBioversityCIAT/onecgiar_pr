import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BilateralProjectsService } from './services/bilateral-projects.service';
import { BilateralService } from './bilateral.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { CreateCenterResultDto } from './dto/create-center-result.dto';
import { SaveBilateralTocMappingDto } from './dto/save-bilateral-toc-mapping.dto';
import { SaveBilateralContributorsDto } from './dto/save-bilateral-contributors.dto';
import { ResultsCenterRepository } from '../results/results-centers/results-centers.repository';
import { ResultsByProjectsRepository } from '../results/results_by_projects/results_by_projects.repository';
import { ResultStatusData } from '../../shared/constants/result-status.enum';
import { Result, SourceEnum } from '../results/entities/result.entity';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { VersioningService } from '../versioning/versioning.service';
import { ResultRepository } from '../results/result.repository';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { YearRepository } from '../results/years/year.repository';
import { ResultByLevelRepository } from '../results/result-by-level/result-by-level.repository';
import { ResultsTocResultsService } from '../results/results-toc-results/results-toc-results.service';
import { ResultsTocResultRepository } from '../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaCentersRepository } from '../../clarisa/clarisa-centers/clarisa-centers.repository';
import { ClarisaInstitutionsRepository } from '../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';

@Controller('center')
@ApiTags('Bilateral Center')
@UseInterceptors(ResponseInterceptor)
export class BilateralCenterController {
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
  ) {}

  @Get('projects')
  @ApiOperation({
    summary: 'Get bilateral projects for a center with SP mappings',
  })
  @ApiQuery({
    name: 'centerId',
    required: true,
    type: Number,
    description: 'Center organization code (institution ID)',
  })
  async getProjects(@Query('centerId') centerId: number) {
    const projects =
      await this.bilateralProjectsService.getProjectsByCenter(centerId);
    return { response: projects };
  }

  @Post('create-header')
  @ApiOperation({
    summary: 'Create a bilateral result header with minimal metadata',
  })
  async createResultHeader(
    @UserToken() user: TokenDto,
    @Body() dto: CreateCenterResultDto,
  ) {
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

  @Get('initiative/:resultId')
  @ApiOperation({
    summary: 'Get owner initiative ID for a bilateral result',
  })
  async getResultInitiativeId(@Param('resultId') resultId: number) {
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

  @Get('toc-state/:resultId')
  @ApiOperation({
    summary:
      'Get TOC state (planned_result, level, result, indicator) for a bilateral result',
  })
  async getTocState(@Param('resultId') resultId: number) {
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

      let indicatorId: number | null = null;
      if (activeRecord.result_toc_result_id) {
        const indicatorQuery = `
          SELECT rtri.result_toc_result_indicator_id as id
          FROM results_toc_result_indicators rtri
          WHERE rtri.results_toc_results_id = ?
          LIMIT 1
        `;
        const indicatorResult: { id: number }[] =
          await this.resultsTocResultRepository.query(indicatorQuery, [
            activeRecord.result_toc_result_id,
          ]);
        if (indicatorResult?.length) {
          indicatorId = indicatorResult[0].id;
        }
      }

      return {
        response: {
          planned_result: activeRecord.planned_result,
          toc_level_id: activeRecord.toc_level_id ?? null,
          toc_result_id: activeRecord.toc_result_id ?? null,
          indicator_id: indicatorId,
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

  @Patch('planned-result/:resultId')
  @ApiOperation({
    summary: 'Update planned_result flag for a bilateral result',
  })
  async updatePlannedResult(
    @Param('resultId') resultId: number,
    @Body() body: { planned_result: boolean; programCode?: string },
    @UserToken() user: TokenDto,
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

  @Patch('toc-mapping/:resultId')
  @ApiOperation({
    summary:
      'Save ToC mapping for a bilateral result (level, result, indicator, contribution, narrative)',
  })
  async saveTocMapping(
    @Param('resultId') resultId: number,
    @Body() dto: SaveBilateralTocMappingDto,
    @UserToken() user: TokenDto,
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

  @Patch('contributors/:resultId')
  @ApiOperation({
    summary: 'Save contributing centers and projects for a bilateral result',
  })
  async saveContributors(
    @Param('resultId') resultId: number,
    @Body() dto: SaveBilateralContributorsDto,
    @UserToken() user: TokenDto,
  ) {
    const result: any = { savedCenters: [], failedCenters: [], savedProjects: [], failedProjects: [] };

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

      if (dto.contributing_center?.length) {
        for (const center of dto.contributing_center) {
          if (center.institution_id === undefined) {
            result.failedCenters.push({ institution_id: center.institution_id, reason: 'No institution_id provided' });
            continue;
          }

          const inst = await this.clarisaInstitutionsRepository.findOne({
            where: { id: center.institution_id },
          });
          if (!inst) {
            result.failedCenters.push({ institution_id: center.institution_id, reason: 'Institution not found in clarisa_institutions' });
            continue;
          }

          const clarisaCenters = await this.clarisaCentersRepository.find({
            where: { institutionId: inst.id },
          });
          if (!clarisaCenters || clarisaCenters.length === 0) {
            result.failedCenters.push({ institution_id: center.institution_id, reason: 'Institution has no clarisa_center record' });
            continue;
          }

          const centerCode = clarisaCenters[0].code;
          const existing = await this.resultsCenterRepository.findOne({
            where: {
              result_id: resultId,
              center_id: centerCode,
            },
          });
          if (!existing) {
            await this.resultsCenterRepository.save({
              result_id: resultId,
              center_id: centerCode,
              is_primary: false,
              is_leading_result: false,
              from_cgspace: false,
              is_active: true,
              created_by: user.id,
            });
            result.savedCenters.push({ institution_id: center.institution_id, centerCode });
          } else {
            result.savedCenters.push({ institution_id: center.institution_id, centerCode, alreadyExists: true });
          }
        }
      }

      if (dto.contributing_bilateral_projects?.length) {
        for (const project of dto.contributing_bilateral_projects) {
          try {
            const existing = await this.resultsByProjectsRepository.findOne({
              where: { result_id: resultId, project_id: project.project_id },
            });
            if (!existing) {
              await this.resultsByProjectsRepository.save({
                result_id: resultId,
                project_id: project.project_id,
                is_lead:
                  project.is_lead === true || project.is_lead === 1
                    ? true
                    : false,
                created_by: user.id,
              });
              result.savedProjects.push({ project_id: project.project_id });
            } else {
              result.savedProjects.push({ project_id: project.project_id, alreadyExists: true });
            }
          } catch {
            result.failedProjects.push({ project_id: project.project_id, reason: 'Save failed' });
          }
        }
      }

      return {
        response: { resultId, ...result },
        message: result.failedCenters.length === 0 && result.failedProjects.length === 0
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
}
