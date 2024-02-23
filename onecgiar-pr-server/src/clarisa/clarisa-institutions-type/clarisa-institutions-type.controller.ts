import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaInstitutionsTypeService } from './clarisa-institutions-type.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaInstitutionsTypeController {
  constructor(
    private readonly clarisaInstitutionsTypeService: ClarisaInstitutionsTypeService,
  ) {}

  @Get('tree')
  findAll() {
    return this.clarisaInstitutionsTypeService.findAllNotLegacy();
  }
}
