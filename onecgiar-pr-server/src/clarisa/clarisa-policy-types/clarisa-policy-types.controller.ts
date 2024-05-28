import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaPolicyTypesService } from './clarisa-policy-types.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaPolicyTypesController {
  constructor(
    private readonly clarisaPolicyTypesService: ClarisaPolicyTypesService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaPolicyTypesService.findAll();
  }
}
