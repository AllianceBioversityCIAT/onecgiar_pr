import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaRegionsService } from './clarisa-regions.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaRegionsController {
  constructor(private readonly clarisaRegionsService: ClarisaRegionsService) {}

  @Get('get/all')
  findAll() {
    return this.clarisaRegionsService.findAllNoParent();
  }
}
