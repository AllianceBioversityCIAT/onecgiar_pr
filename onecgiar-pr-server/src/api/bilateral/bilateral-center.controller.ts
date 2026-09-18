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
import { ChangeCenterResultTypeDto } from './dto/change-center-result-type.dto';
import { UpdateBilateralPrimaryAssignmentDto } from './dto/update-bilateral-primary-assignment.dto';
import { SubmitForReviewDto } from './dto/submit-for-review.dto';

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
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description:
      'Optional reporting year to scope the catalog by (positive integer; omitted or invalid falls back to the active year)',
  })
  async getProjects(
    @Query('centerId') centerId: number,
    @Query('year') year?: number,
  ) {
    return this.bilateralCenterService.getProjects(centerId, year);
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

  @Patch('change-type/:resultId')
  @ApiOperation({
    summary: 'Change the type of a promoted bilateral AI draft',
    description:
      'Only an active bilateral result promoted from an AI draft and still in Editing can change type. Common W3 associations are preserved while type-specific data is reset.',
  })
  async changeResultType(
    @UserToken() user: TokenDto,
    @Param('resultId') resultId: number,
    @Body() dto: ChangeCenterResultTypeDto,
  ) {
    return this.bilateralCenterService.changeResultType(user, resultId, dto);
  }

  @Patch('primary-assignment/:resultId')
  @ApiOperation({
    summary:
      'Atomically update the lead project and primary Science Program of an editable bilateral result',
  })
  async updatePrimaryAssignment(
    @UserToken() user: TokenDto,
    @Param('resultId') resultId: number,
    @Body() dto: UpdateBilateralPrimaryAssignmentDto,
  ) {
    return this.bilateralCenterService.updatePrimaryAssignment(
      user,
      resultId,
      dto,
    );
  }

  @Patch('submit-for-review/:resultId')
  @ApiOperation({
    summary:
      'Submit a centre-authored bilateral result for Science Program review',
    description:
      'Moves a bilateral result from Editing or Draft to PENDING_REVIEW so the Science Program can approve or reject it. Requires a lead center the caller belongs to and an assigned Science Program.',
  })
  async submitForReview(
    @UserToken() user: TokenDto,
    @Param('resultId') resultId: number,
    @Body() dto: SubmitForReviewDto,
  ) {
    return this.bilateralCenterService.submitForReview(user, resultId, dto);
  }

  // @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-6)
  @Post('quality-assessment/:resultId')
  @ApiOperation({
    summary: 'Run (or reuse) the AI quality assessment ahead of Submit',
    description:
      'Runs the same pre-submit guards as submit-for-review, then builds a definitions-only ' +
      'payload from the saved result and either calls the AI quality-assessment service or ' +
      'applies the Knowledge Product rule in code. Never changes status_id, writes review ' +
      'history, or fires the submitted notification. Returns 202 with the existing id when a ' +
      'run is already in progress for this result.',
  })
  async assessQuality(
    @UserToken() user: TokenDto,
    @Param('resultId') resultId: number,
  ) {
    return this.bilateralCenterService.assess(user, resultId);
  }

  // @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-6)
  @Get('quality-assessment/:resultId/latest')
  @ApiOperation({
    summary: 'Get the latest stored AI quality assessment for a result',
    description:
      'Includes a running row, so the client can poll it after reopening a result while a ' +
      'check is still in progress. Returns { latest: null } when no assessment has ever run.',
  })
  async getLatestQualityAssessment(
    @UserToken() user: TokenDto,
    @Param('resultId') resultId: number,
  ) {
    return this.bilateralCenterService.getLatest(user, resultId);
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
