import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('ToC Results')
@UseInterceptors(ResponseInterceptor)
export class TocResultsController {
  constructor(private readonly tocResultsService: TocResultsService) {}

  @Get(':resultId/initiative/:initiativeId/level/:levelId')
  findAll(
    @Param('resultId') resultId: string,
    @Param('initiativeId') initiativeId: string,
    @Param('levelId') levelId: string,
  ) {
    return this.tocResultsService.findTocResultByConfig(
      +resultId,
      +initiativeId,
      +levelId,
    );
  }

  @Get('get/all/initiative/:initiativeId/level/:levelId')
  getTocResultByInitiativeAndLevels(
    @Param('initiativeId') initiativeId: number,
    @Param('levelId') levelId: number,
  ) {
    return this.tocResultsService.findAllByinitiativeId(initiativeId, levelId);
  }

  @Get('get/full-initiative-toc/result/:resultId')
  getFullInitiativeTocByResult(@Param('resultId') resultId: number) {
    return this.tocResultsService.findFullInitiativeTocByResult(resultId);
  }

  @Get('get/full-initiative-toc/initiative/:initiativeId')
  getFullInitiativeTocByInitiative(
    @Param('initiativeId') initiativeId: number,
  ) {
    return this.tocResultsService.findFullInitiativeTocByInitiative(
      initiativeId,
    );
  }

  @Version('2')
  @Get(':resultId/initiative/:initiativeId/level/:levelId')
  findAllV2(
    @Param('resultId') resultId: string,
    @Param('initiativeId') initiativeId: string,
    @Param('levelId') levelId: string,
  ) {
    return this.tocResultsService.findTocResultByConfigV2(
      +resultId,
      +initiativeId,
      +levelId,
    );
  }

  @Version('2')
  @Get('get/all/initiative/:initiativeId/level/:levelId')
  getTocResultByInitiativeAndLevelsV2(
    @Param('initiativeId') initiativeId: number,
    @Param('levelId') levelId: number,
  ) {
    return this.tocResultsService.findAllByinitiativeId(initiativeId, levelId);
  }
}
