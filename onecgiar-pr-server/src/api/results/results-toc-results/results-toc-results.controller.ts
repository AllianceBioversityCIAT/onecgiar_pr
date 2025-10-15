import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ResultsTocResultsService } from './results-toc-results.service';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Results Toc Results')
@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsTocResultsController {
  constructor(
    private readonly resultsTocResultsService: ResultsTocResultsService,
  ) {}

  @ApiOperation({ summary: 'Create a new result toc' })
  @Post('create/toc/result/:resultId')
  create(
    @Body() createResultsTocResultDto: CreateResultsTocResultDto,
    @UserToken() user: TokenDto,
    @Param('resultId') resultId: number,
  ) {
    createResultsTocResultDto.result_id = resultId;
    return this.resultsTocResultsService.create(
      createResultsTocResultDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Get all result toc' })
  @Get('get/result/:resultId')
  finTocByResult(@Param('resultId') resultId: number) {
    return this.resultsTocResultsService.getTocByResult(resultId);
  }

  @ApiOperation({
    summary: 'Get result ToC Indicators and Targets by Result and Initiative',
  })
  @Get('get/indicator/:id/result/:resultId/initiative/:initiativeId')
  findIndicatorByToc(
    @Param('id') id: number,
    @Param('resultId') resultId: number,
    @Param('initiativeId') initiativeId: number,
  ) {
    return this.resultsTocResultsService.getTocResultIndicatorByResultTocId(
      resultId,
      id,
      initiativeId,
    );
  }

  @ApiOperation({
    summary: 'Get Action Area Outcome By Result and Initiatives',
  })
  @Get('get/result/:resultId/initiative/:initiativeId')
  findActionResutl(
    @Param('resultId') resultId: number,
    @Param('initiativeId') initiativeId: number,
  ) {
    return this.resultsTocResultsService.getActionAreaOutcomeByResultTocId(
      resultId,
      initiativeId,
    );
  }

  @Get('get/version/:resultId/initiative/:initiativeId/resultToc')
  findVersionDashBoard(
    @Param('resultId') resultId: number,
    @Param('initiativeId') initiativeId: number,
  ) {
    return this.resultsTocResultsService.getVersionId(resultId, initiativeId);
  }

  @Version('2')
  @Get('get/version/:resultId/initiative/:initiativeId/resultToc')
  @ApiOperation({ summary: 'Get Version ToC by Result and Initiative V2' })
  findVersionDashBoardV2(
    @Param('resultId') resultId: number,
    @Param('initiativeId') initiativeId: number,
  ) {
    return this.resultsTocResultsService.getVersionIdV2(resultId, initiativeId);
  }
}
