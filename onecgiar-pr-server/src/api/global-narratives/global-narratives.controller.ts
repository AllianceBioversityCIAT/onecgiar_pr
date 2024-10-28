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
  findOneById(@Param('id') id: string) {
    return this.globalNarrativesService.findOneById(+id);
  }
  @Get('/name/:name')
  findOneByName(@Param('name') name: string) {
    return this.globalNarrativesService.findOneByName(name);
  }
}
