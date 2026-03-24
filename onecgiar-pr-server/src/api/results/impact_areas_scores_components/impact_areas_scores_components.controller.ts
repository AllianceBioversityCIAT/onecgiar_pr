import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ImpactAreasScoresComponentsService } from './impact_areas_scores_components.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('/')
@UseInterceptors(ResponseInterceptor)
export class ImpactAreasScoresComponentsController {
  constructor(
    private readonly impactAreasScoresComponentsService: ImpactAreasScoresComponentsService,
  ) {}

  @Get('all')
  findAll() {
    return this.impactAreasScoresComponentsService.findAll();
  }
}
