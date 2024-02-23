import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaImpactAreaService } from './clarisa-impact-area.service';
import { HttpException } from '@nestjs/common';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaImpactAreaController {
  constructor(
    private readonly clarisaImpactAreaService: ClarisaImpactAreaService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaImpactAreaService.findAll();
  }
}
