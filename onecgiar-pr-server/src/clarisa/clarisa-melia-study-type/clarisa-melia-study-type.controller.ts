import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaMeliaStudyTypeService } from './clarisa-melia-study-type.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaMeliaStudyTypeController {
  constructor(
    private readonly clarisaMeliaStudyTypeService: ClarisaMeliaStudyTypeService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaMeliaStudyTypeService.findAll();
  }
}
