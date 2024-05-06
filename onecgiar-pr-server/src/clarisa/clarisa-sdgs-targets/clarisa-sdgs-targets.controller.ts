import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaSdgsTargetsService } from './clarisa-sdgs-targets.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaSdgsTargetsController {
  constructor(
    private readonly clarisaSdgsTargetsService: ClarisaSdgsTargetsService,
  ) {}

  @Get('all')
  findAll() {
    return this.clarisaSdgsTargetsService.findAll();
  }
}
