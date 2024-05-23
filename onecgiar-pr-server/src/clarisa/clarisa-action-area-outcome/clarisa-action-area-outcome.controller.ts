import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaActionAreaOutcomeService } from './clarisa-action-area-outcome.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaActionAreaOutcomeController {
  constructor(
    private readonly clarisaActionAreaOutcomeService: ClarisaActionAreaOutcomeService,
  ) {}

  @Get('all')
  findAll() {
    return this.clarisaActionAreaOutcomeService.findAll();
  }
}
