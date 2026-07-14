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
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { CreateCenterResultDto } from './dto/create-center-result.dto';
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

@Controller('center')
@ApiTags('Bilateral Center')
@UseInterceptors(ResponseInterceptor)
export class BilateralCenterController {
  constructor(
    private readonly bilateralProjectsService: BilateralProjectsService,
    private readonly versioningService: VersioningService,
    private readonly resultRepository: ResultRepository,
    private readonly resultByLevelRepository: ResultByLevelRepository,
    private readonly yearRepository: YearRepository,
    private readonly resultsTocResultsService: ResultsTocResultsService,
    private readonly resultsTocResultRepository: ResultsTocResultRepository,
    private readonly resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly clarisaInitiativesRepository: ClarisaInitiativesRepository,
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
      const initiative =
        await this.clarisaInitiativesRepository.findOne({
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
    const owner = await this.resultByInitiativesRepository.getOwnerInitiativeByResult(resultId);
    return {
      response: {
        initiativeId: owner?.id ?? null,
        officialCode: owner?.official_code ?? null,
        initiativeName: owner?.initiative_name ?? null,
      },
    };
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
        const initiative =
          await this.clarisaInitiativesRepository.findOne({
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
}
