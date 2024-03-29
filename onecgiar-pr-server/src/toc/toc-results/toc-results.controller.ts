import {
  Controller,
  Get,
  Param,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
export class TocResultsController {
  constructor(private readonly tocResultsService: TocResultsService) {}

  @Get(':resultId/initiative/:initiativeId/level/:levelId')
  @UseInterceptors(ResponseInterceptor)
  async findAll(
    @Param('resultId') resultId: string,
    @Param('initiativeId') initiativeId: string,
    @Param('levelId') levelId: string,
  ) {
    return await this.tocResultsService.findTocResultByConfig(
      +resultId,
      +initiativeId,
      +levelId,
    );
  }

  @Get('get/all/initiative/:initiativeId/level/:levelId')
  async getTocResultByInitiativeAndLevels(
    @Param('initiativeId') initiativeId: number,
    @Param('levelId') levelId: number,
  ) {
    const { message, response, status } =
      await this.tocResultsService.findAllByinitiativeId(initiativeId, levelId);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/full-initiative-toc/result/:resultId')
  async getFullInitiativeTocByResult(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.tocResultsService.findFullInitiativeTocByResult(resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/full-initiative-toc/initiative/:initiativeId')
  async getFullInitiativeTocByInitiative(
    @Param('initiativeId') initiativeId: number,
  ) {
    const { message, response, status } =
      await this.tocResultsService.findFullInitiativeTocByInitiative(
        initiativeId,
      );
    throw new HttpException({ message, response }, status);
  }
}
