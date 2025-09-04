import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaInitiativesController {
  constructor(
    private readonly clarisaInitiativesService: ClarisaInitiativesService,
  ) {}

  @Get('get/all/without/result/:resultId')
  getAllInitiativesWithoutCurrentInitiative(
    @Param('resultId') resultId: number,
  ) {
    return this.clarisaInitiativesService.getAllInitiativesWithoutCurrentInitiative(
      resultId,
    );
  }

  @Get()
  findAll() {
    return this.clarisaInitiativesService.findAll();
  }

  @Get(':portfolio')
  getByPortfolio(@Param('portfolio') portfolio: string) {
    return this.clarisaInitiativesService.getByPortfolio(portfolio);
  }

  @Get('entities')
  getInitiativesEntities() {
    return this.clarisaInitiativesService.getInitiativesEntitiesGrouped();
  }
}
