import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { HttpException } from '@nestjs/common';
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
}
