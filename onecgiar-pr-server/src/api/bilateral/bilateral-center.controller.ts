import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BilateralProjectsService } from './services/bilateral-projects.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller('center')
@ApiTags('Bilateral Center')
@UseInterceptors(ResponseInterceptor)
export class BilateralCenterController {
  constructor(
    private readonly bilateralProjectsService: BilateralProjectsService,
  ) {}

  @Get('projects')
  @ApiOperation({
    summary: 'Get bilateral projects for a center with SP mappings',
  })
  @ApiQuery({
    name: 'centerId',
    required: true,
    type: Number,
    description: 'Center organization code (institution ID)',
  })
  async getProjects(@Query('centerId') centerId: number) {
    const projects =
      await this.bilateralProjectsService.getProjectsByCenter(centerId);
    return { response: projects };
  }
}
