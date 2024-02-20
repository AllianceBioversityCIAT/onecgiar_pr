import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ResultsTocResultsService } from './results-toc-results.service';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsTocResultsController {
  constructor(
    private readonly resultsTocResultsService: ResultsTocResultsService,
  ) {}

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

  @Get()
  findAll() {
    return this.resultsTocResultsService.findAll();
  }

  @Get('get/result/:resultId')
  finTocByResult(@Param('resultId') resultId: number) {
    return this.resultsTocResultsService.getTocByResult(resultId);
  }

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

  @Get('get/version/:resultId/initiative/:initiativeId/resultToc/:resultTocId')
  findVersionDashBoard(
    @Param('resultId') resultId: number,
    @Param('initiativeId') initiativeId: number,
    @Param('resultTocId') _resultTocId: number,
  ) {
    //TODO: I cannot delete that value but I can accommodate it as an internal value,
    //since the url would have to be modified and that would have to be modified from the front as well
    return this.resultsTocResultsService.getVersionId(resultId, initiativeId);
  }
}
