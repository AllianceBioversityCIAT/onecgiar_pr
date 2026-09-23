import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClarisaProjectsService } from './clarisa-projects.service';

@ApiTags('Clarisa Projects')
@Controller()
export class ClarisaProjectsController {
  constructor(
    private readonly clarisaProjectsService: ClarisaProjectsService,
  ) {}

  @Get('get/all')
  @ApiOperation({ summary: 'Get all Clarisa projects' })
  @ApiResponse({
    status: 200,
    description:
      'List of all active Clarisa projects. Each row additionally carries ' +
      '`owner_center_institution_id` (number | null): the CLARISA institution id of the ' +
      "project's owning Center, or null when it cannot be resolved.",
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll() {
    return this.clarisaProjectsService.findAll();
  }
}
