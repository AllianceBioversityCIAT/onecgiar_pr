import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { GlobalNarrativesService } from './global-narratives.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class GlobalNarrativesController {
  constructor(
    private readonly globalNarrativesService: GlobalNarrativesService,
  ) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.globalNarrativesService.findOne(+id);
  }
}
