import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaCgiarEntityTypesService } from './clarisa-cgiar-entity-types.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaCgiarEntityTypesController {
  constructor(
    private readonly clarisaCgiarEntityTypesService: ClarisaCgiarEntityTypesService,
  ) {}

  @Get()
  findAll() {
    return this.clarisaCgiarEntityTypesService.findAll();
  }
}
