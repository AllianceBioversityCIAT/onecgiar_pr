import { Controller } from '@nestjs/common';
import { ResultsByProjectsService } from './results_by_projects.service';

@Controller('results-by-projects')
export class ResultsByProjectsController {
  constructor(private readonly resultsByProjectsService: ResultsByProjectsService) {}
}
