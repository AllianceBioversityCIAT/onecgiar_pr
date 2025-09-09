import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaInitiativesController {
  constructor(
    private readonly clarisaInitiativesService: ClarisaInitiativesService,
  ) {}

  @Get('get/all/without/result/:resultId/:portfolio')
  getAllInitiativesWithoutCurrentInitiative(
    @Param('resultId') resultId: number,
    @Param('portfolio') portfolio?: string,
  ) {
    return this.clarisaInitiativesService.getAllInitiativesWithoutCurrentInitiative(
      resultId,
      portfolio,
    );
  }

  @Get()
  findAll() {
    return this.clarisaInitiativesService.findAll();
  }

  @Get('entities')
  getInitiativesEntities() {
    return this.clarisaInitiativesService.getInitiativesEntitiesGrouped();
  }

  @Get(':portfolio')
  getByPortfolio(@Param('portfolio') portfolio: string) {
    return this.clarisaInitiativesService.getByPortfolio(portfolio);
  }
}
