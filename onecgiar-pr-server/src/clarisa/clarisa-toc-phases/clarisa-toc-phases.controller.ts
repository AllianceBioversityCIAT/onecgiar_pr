import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaTocPhasesService } from './clarisa-toc-phases.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaTocPhasesController {
  constructor(
    private readonly clarisaTocPhasesService: ClarisaTocPhasesService,
  ) {}

  @Get()
  findAll() {
    return this.clarisaTocPhasesService.findAll();
  }
}
