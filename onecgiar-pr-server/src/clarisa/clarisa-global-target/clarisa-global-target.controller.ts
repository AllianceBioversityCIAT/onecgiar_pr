import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaGlobalTargetService } from './clarisa-global-target.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaGlobalTargetController {
  constructor(
    private readonly clarisaGlobalTargetService: ClarisaGlobalTargetService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaGlobalTargetService.findAll();
  }
}
