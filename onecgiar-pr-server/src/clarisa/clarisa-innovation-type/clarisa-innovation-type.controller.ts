import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaInnovationTypeService } from './clarisa-innovation-type.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaInnovationTypeController {
  constructor(
    private readonly clarisaInnovationTypeService: ClarisaInnovationTypeService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaInnovationTypeService.findAll();
  }
}
