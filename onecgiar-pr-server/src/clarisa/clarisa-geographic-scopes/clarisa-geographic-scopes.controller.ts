import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaGeographicScopesService } from './clarisa-geographic-scopes.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaGeographicScopesController {
  constructor(
    private readonly clarisaGeographicScopesService: ClarisaGeographicScopesService,
  ) {}

  @Get('get/all/prms')
  findAll() {
    return this.clarisaGeographicScopesService.findAllPRMS();
  }
}
