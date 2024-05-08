import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaPolicyStagesService } from './clarisa-policy-stages.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaPolicyStagesController {
  constructor(
    private readonly clarisaPolicyStagesService: ClarisaPolicyStagesService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaPolicyStagesService.findAll();
  }
}
