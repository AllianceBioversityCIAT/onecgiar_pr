import { Controller, Get, UseInterceptors } from '@nestjs/common';
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
}
