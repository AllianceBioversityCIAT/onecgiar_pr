import { Controller, Get, UseInterceptors, Version } from '@nestjs/common';
import { ClarisaInnovationUseLevelsService } from './clarisa-innovation-use-levels.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaInnovationUseLevelsController {
  constructor(
    private readonly clarisaInnovationUseLevelsService: ClarisaInnovationUseLevelsService,
  ) {}

  @Get()
  findAll() {
    return this.clarisaInnovationUseLevelsService.findAll();
  }

  @Version('2')
  @Get()
  findAllV2() {
    return this.clarisaInnovationUseLevelsService.findAllV2();
  }
}
