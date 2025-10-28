import { Controller } from '@nestjs/common';
import { ClarisaProjectsService } from './clarisa-projects.service';

@Controller('clarisa-projects')
export class ClarisaProjectsController {
  constructor(
    private readonly clarisaProjectsService: ClarisaProjectsService,
  ) {}
}
