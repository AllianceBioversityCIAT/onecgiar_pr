import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BilateralCenterService } from './services/bilateral-center.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { CreateCenterResultDto } from './dto/create-center-result.dto';
import { SaveBilateralTocMappingDto } from './dto/save-bilateral-toc-mapping.dto';
import { SaveBilateralContributorsDto } from './dto/save-bilateral-contributors.dto';

@Controller('center')
@ApiTags('Bilateral Center')
@UseInterceptors(ResponseInterceptor)
export class BilateralCenterController {
  constructor(
    private readonly bilateralCenterService: BilateralCenterService,
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
    return this.bilateralCenterService.getProjects(centerId);
  }

  @Post('create-header')
  @ApiOperation({
    summary: 'Create a bilateral result header with minimal metadata',
  })
  async createResultHeader(
    @UserToken() user: TokenDto,
    @Body() dto: CreateCenterResultDto,
  ) {
    return this.bilateralCenterService.createResultHeader(user, dto);
  }

  @Get('initiative/:resultId')
  @ApiOperation({
    summary: 'Get owner initiative ID for a bilateral result',
  })
  async getResultInitiativeId(@Param('resultId') resultId: number) {
    return this.bilateralCenterService.getResultInitiativeId(resultId);
  }

  @Get('toc-state/:resultId')
  @ApiOperation({
    summary:
      'Get TOC state (planned_result, level, result, indicator) for a bilateral result',
  })
  async getTocState(@Param('resultId') resultId: number) {
    return this.bilateralCenterService.getTocState(resultId);
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
    return this.bilateralCenterService.updatePlannedResult(
      resultId,
      body,
      user,
    );
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
    return this.bilateralCenterService.saveTocMapping(resultId, dto, user);
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
    return this.bilateralCenterService.saveContributors(resultId, dto, user);
  }
}
