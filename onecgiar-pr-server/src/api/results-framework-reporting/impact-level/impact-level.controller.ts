import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { SaveImpactLevelDto } from './dto/save-impact-level.dto';
import {
  ImpactCountsQueryDto,
  ImpactPreviousResultsSearchQueryDto,
} from './dto/impact-level-search-query.dto';
import { ImpactLevelSearchService } from './impact-level-search.service';
import { ImpactLevelService } from './impact-level.service';

/**
 * Mounted in `api/modules.routes.ts` at `results-framework-reporting/impact-level`
 * (design §4.1). JWT via the global middleware; no per-result check (IRS-R-12 / IRS-DD-8).
 */
@Controller()
@UseInterceptors(ResponseInterceptor)
@ApiTags('Results Framework and Reporting - Impact Level')
export class ImpactLevelController {
  constructor(
    private readonly impactLevelService: ImpactLevelService,
    private readonly impactLevelSearchService: ImpactLevelSearchService,
  ) {}

  @Get('study-types')
  @ApiOperation({ summary: 'List active impact study types (E2)' })
  getStudyTypes() {
    return this.impactLevelService.getStudyTypes();
  }

  @Get('get/result/:resultId')
  @ApiOperation({ summary: 'Read the Impact level info section (E3)' })
  getImpactLevelInfo(@Param('resultId') resultId: number) {
    return this.impactLevelService.getImpactLevelInfo(resultId);
  }

  @Patch('save/result/:resultId')
  @ApiOperation({ summary: 'Save the Impact level info section (E4)' })
  saveImpactLevelInfo(
    @Param('resultId') resultId: number,
    @Body() body: SaveImpactLevelDto,
    @UserToken() user: TokenDto,
  ) {
    return this.impactLevelService.saveImpactLevelInfo(resultId, body, user);
  }

  @Get('previous-results/search')
  @ApiOperation({
    summary:
      'Search active results across every phase and portfolio, current reporting phase first (E5)',
  })
  searchPreviousResults(@Query() query: ImpactPreviousResultsSearchQueryDto) {
    return this.impactLevelSearchService.searchPreviousResults(query);
  }

  @Get('counts')
  @ApiOperation({
    summary:
      'Count impact results scored Principal per Impact Area for an initiative and phase (E6)',
  })
  getCounts(@Query() query: ImpactCountsQueryDto) {
    return this.impactLevelSearchService.getCounts(query);
  }
}
